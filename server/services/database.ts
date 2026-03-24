// cloudflare D1 数据库操作函数集
// 适用于 Cloudflare Workers 环境（Hono/Wrangler），对 D1Database 提供便捷封装

import type {
    Params,
    ExecResult,
    DBClient
} from '../types/database';

import type { FileChunkRecord, TempChunkRecord } from '../types/file';


function sanitizeParams(params?: Params): Params | undefined {
    if (!params) return undefined;
    // 将 undefined 及不支持的类型统一转为 null，防止 D1 binding 报错
    return params.map((p) =>
        p === undefined || (typeof p !== 'string' && typeof p !== 'number' && typeof p !== 'boolean' && p !== null && !(p instanceof Uint8Array) && !(p instanceof Date))
            ? null
            : p
    );
}

type D1RunResult = {
    meta?: { changes?: number; last_row_id?: number; lastRowId?: number };
    changes?: number;
    lastRowId?: number;
};

function getExecResult(res: D1RunResult): ExecResult {
    // 兼容不同 D1 版本的返回格式
    const meta = res?.meta ?? {};
    const changes: number =
        typeof meta.changes === 'number'
            ? meta.changes
            : typeof res?.changes === 'number'
                ? res.changes
                : 0;
    const lastRowIdRaw =
        meta.last_row_id ?? meta.lastRowId ?? (typeof res?.lastRowId === 'number' ? res.lastRowId : null);
    const lastRowId = typeof lastRowIdRaw === 'number' ? lastRowIdRaw : null;
    return { changes, lastRowId };
}

function extractRows<T>(res: D1Result<T>): T[] {
    return (res && (res.results ?? (res as unknown as { rows?: T[] }).rows)) || [];
}

function prepare(db: D1Database, sql: string, params?: Params) {
    const stmt = db.prepare(sql);
    const binds = sanitizeParams(params);
    return binds && binds.length ? stmt.bind(...binds) : stmt;
}

export function createD1Client(db: D1Database): DBClient {
    return {
        async all<T = unknown>(sql: string, params?: Params): Promise<T[]> {
            const stmt = prepare(db, sql, params);
            // D1 .all<T>() -> { results: T[] }
            const res = await stmt.all<T>();
            return extractRows(res);
        },

        async one<T = unknown>(sql: string, params?: Params): Promise<T | null> {
            const stmt = prepare(db, sql, params);
            // 直接使用 .first()，如不可用则回退到 .all()[0]
            if (typeof stmt.first === 'function') {
                const row = await stmt.first<T>();
                return (row as T) ?? null;
            }
            const res = await stmt.all<T>();
            const rows = extractRows(res);
            return rows.length ? rows[0] : null;
        },

        async exec(sql: string, params?: Params): Promise<ExecResult> {
            const stmt = prepare(db, sql, params);
            const res = await stmt.run();
            return getExecResult(res);
        },

        async withTransaction<T>(fn: (tx: DBClient) => Promise<T>): Promise<T> {
            // D1 不支持显式事务对象（无 .transaction()/.commit()/.rollback()）
            // 正确方式：收集所有 prepared statements，通过 db.batch() 原子提交
            // 此处提供一个"收集模式"的代理 client，批量执行写操作
            const stmts: D1PreparedStatement[] = [];

            const batchClient: DBClient = {
                async all<T = unknown>(sql: string, params?: Params): Promise<T[]> {
                    // 注意：事务内读操作直接执行，无法读取同一事务内暂存但未提交的写操作结果
                    const stmt = prepare(db, sql, params);
                    const res = await stmt.all<T>();
                    return extractRows(res);
                },
                async one<T = unknown>(sql: string, params?: Params): Promise<T | null> {
                    // 注意：同上，读操作不可见同事务内的未提交写入
                    const stmt = prepare(db, sql, params);
                    if (typeof stmt.first === 'function') {
                        return ((await stmt.first<T>()) as T) ?? null;
                    }
                    const res = await stmt.all<T>();
                    const rows = extractRows(res);
                    return rows.length ? rows[0] : null;
                },
                async exec(sql: string, params?: Params): Promise<ExecResult> {
                    // 写操作暂存，将在 fn 执行完毕后通过 db.batch() 原子提交
                    // 注意：exec 的返回值 changes/lastRowId 在提交前均为占位值
                    stmts.push(prepare(db, sql, params));
                    return { changes: 0, lastRowId: null };
                },
                withTransaction<U>(fn: (tx: DBClient) => Promise<U>): Promise<U> {
                    // 嵌套事务复用同一 batchClient
                    return fn(batchClient);
                },
            };

            // 执行业务逻辑（写操作被暂存到 stmts）
            const result = await fn(batchClient);

            // 原子批量提交所有写操作
            if (stmts.length > 0) {
                await db.batch(stmts);
            }

            return result;
        },
    };
}

// 常用便捷函数（基于全局 Env），如使用 Hono，可从 c.env.DB 传入
export async function queryAll<T = unknown>(db: D1Database, sql: string, params?: Params): Promise<T[]> {
    return createD1Client(db).all<T>(sql, params);
}

export async function queryOne<T = unknown>(db: D1Database, sql: string, params?: Params): Promise<T | null> {
    return createD1Client(db).one<T>(sql, params);
}

export async function execute(db: D1Database, sql: string, params?: Params): Promise<ExecResult> {
    return createD1Client(db).exec(sql, params);
}

export async function transaction<T>(db: D1Database, fn: (tx: DBClient) => Promise<T>): Promise<T> {
    return createD1Client(db).withTransaction(fn);
}