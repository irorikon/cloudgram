// 数据库操作相关的类型定义

export type Params = Array<string | number | boolean | null | Uint8Array | Date>;

export type ExecResult = {
    changes: number;
    lastRowId: number | null;
};

export type DBClient = {
    all<T = unknown>(sql: string, params?: Params): Promise<T[]>;
    one<T = unknown>(sql: string, params?: Params): Promise<T | null>;
    exec(sql: string, params?: Params): Promise<ExecResult>;
    withTransaction<T>(fn: (tx: DBClient) => Promise<T>): Promise<T>;
};