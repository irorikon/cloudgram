import { queryAll, queryOne, transaction } from './database';
import type { FileRecord } from '../types/file';

// ================== 文件操作 ==================

// 公共 SELECT 字段列表，统一维护避免各函数重复拼写
const FILE_BASE_SELECT =
    'SELECT id, name, parent_id, is_dir, size, created_at, updated_at, mime_type FROM files';
const FILE_SELECT_SQL = `${FILE_BASE_SELECT} WHERE id = ?`;

// FileRecord 类型已在 '../types/database' 中定义，无需重复声明

/**
 * 将数据库记录转换为标准FileRecord格式
 * 确保is_dir字段为布尔类型（数据库可能返回1/0）
 */
function normalizeFileRecord(record: FileRecord): FileRecord {
    if (!record) return null as any;

    return {
        id: record.id,
        name: record.name,
        parent_id: record.parent_id,
        is_dir: Boolean(record.is_dir), // 确保转换为布尔值
        size: record.size ?? null,
        mime_type: record.mime_type ?? null,
        created_at: record.created_at,
        updated_at: record.updated_at
    };
}

/**
 * 获取文件信息
 * @param {string} id - 文件ID
 * @returns {Object|null} 文件信息，未找到时返回 null
 */
export async function getFileById(db: D1Database, id: string): Promise<FileRecord | null> {
    // 参数校验：id 不合法时提前返回
    if (!id || typeof id !== 'string') return null;

    const record = await queryOne<FileRecord>(db, FILE_SELECT_SQL, [id]);
    return record ? normalizeFileRecord(record) : null;
}

/**
 * 根据父目录ID获取文件列表
 * @param {string|null} parentId - 父目录ID，null 或空字符串表示根目录
 * @returns {Array} 文件列表
 */
export async function getFilesByParentId(db: D1Database, parentId: string | null): Promise<FileRecord[]> {
    // 将空字符串转换为 null，以正确查询根目录
    const normalizedParentId = parentId === "" ? null : parentId;
    const where = normalizedParentId === null ? 'WHERE parent_id IS NULL' : 'WHERE parent_id = ?';
    const orderBy = 'ORDER BY is_dir DESC, name ASC';
    const sql = `${FILE_BASE_SELECT} ${where} ${orderBy}`;
    const params = normalizedParentId === null ? undefined : [normalizedParentId];

    const records = await queryAll<FileRecord>(db, sql, params);
    return records.map(record => normalizeFileRecord(record));
}

/**
 * 根据父目录ID获取文件夹列表
 * @param {string|null} parentId - 父目录ID，null 或空字符串表示根目录
 * @returns {Array} 文件夹列表
 */
export async function getFoldersByParentId(db: D1Database, parentId: string | null = null): Promise<FileRecord[]> {
    // 将空字符串转换为 null，以正确查询根目录
    const normalizedParentId = parentId === "" ? null : parentId;
    const where = normalizedParentId === null ? 'WHERE is_dir = 1 AND parent_id IS NULL' : 'WHERE is_dir = 1 AND parent_id = ?';
    const orderBy = 'ORDER BY name ASC';
    const sql = `${FILE_BASE_SELECT} ${where} ${orderBy}`;
    const params = normalizedParentId === null ? undefined : [normalizedParentId];
    const records = await queryAll<FileRecord>(db, sql, params);
    return records.map(record => normalizeFileRecord(record));
}

/**
 * 查询文件是否存在
 */
export async function fileExists(db: D1Database, fileName: string, parentId: string | null = null): Promise<FileRecord | null> {
    const normalizedParentId = parentId === "" ? null : parentId;
    const where = normalizedParentId === null ? 'WHERE name=? AND parent_id IS NULL' : 'WHERE name=? AND parent_id = ?';
    const params = normalizedParentId === null ? [fileName] : [fileName, normalizedParentId];
    return await queryOne<FileRecord>(db, `${FILE_BASE_SELECT} ${where}`, params);
}

/**
 * 创建文件
 * @param {string} name - 文件名称（不可为空）
 * @param {boolean|number} is_dir - 是否为目录（true/1 表示目录，false/0 表示文件）
 * @param {string|null} parentId - 父目录ID，null 或空字符串表示根目录
 * @returns {Object} 创建的文件信息
 */
export async function createFile(
    db: D1Database,
    name: string,
    parentId: string | null,
    is_dir: number | boolean,
    size: number | null = null,
    mime_type: string | null = null): Promise<FileRecord> {
    // 参数校验
    if (!name || typeof name !== 'string' || name.trim() === '') {
        throw new Error('Invalid file name');
    }

    // 将空字符串转换为 null，以正确处理根目录创建
    const normalizedParentId = parentId === "" ? null : parentId;

    // 判断文件名在当前 parentId 下是否已存在，避免重复文件名（可选，根据实际需求决定是否允许同名）
    const existing = await queryOne<FileRecord>(db, 'SELECT id FROM files WHERE name = ? AND parent_id IS ?', [name.trim(), normalizedParentId]);
    if (existing) {
        throw new Error('File name already exists in the target directory');
    }
    await transaction(db, async (tx) => {
        const id = crypto.randomUUID(); // Workers 原生支持，零依赖
        const insertSql =
            'INSERT INTO files (id, name, parent_id, is_dir, size, mime_type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)';
        await tx.exec(insertSql, [id, name.trim(), normalizedParentId, is_dir, size || 0, mime_type]);
    });

    const created = await queryOne<FileRecord>(db, `${FILE_BASE_SELECT} WHERE name = ? AND parent_id IS ?`, [name.trim(), normalizedParentId]);
    if (!created) {
        throw new Error('Created file not found');
    }

    return normalizeFileRecord(created);

}

/**
 * 更新文件名
 * @param {string} id - 文件ID
 * @param {string} newName - 新文件名称
 * @returns {Object} 更新后的文件信息
 */
export async function updateFile(
    db: D1Database,
    id: string,
    active: string,
    newName?: string,
    newParentId?: string | null,
): Promise<FileRecord> {
    // 参数校验：active 不可为空
    if (!active || typeof active !== 'string') throw new Error('Invalid active');
    switch (active) {
        case 'rename':
            // 重命名时，id 和 name 为必填字段
            if (!id || typeof id !== 'string') throw new Error('Invalid file id');
            if (!newName || typeof newName !== 'string' || newName.trim() === '') {
                throw new Error('Invalid file name');
            }
            return renameFile(db, id, newName);
        case 'move':
            // 移动时，id 为必填字段 parentId 为选填字段
            if (!id || typeof id !== 'string') throw new Error('Invalid file id');
            if (!newParentId || typeof newParentId !== 'string') newParentId = null;
            return moveFile(db, id, newParentId);
        default:
            throw new Error('Invalid active type');
    }
}

async function renameFile(db: D1Database, id: string, newName: string) {
    // 判断新文件名在当前 parentId 下是否已存在，避免重复文件名（可选，根据实际需求决定是否允许同名）
    // 先获取当前文件的 parent_id，确保查询条件准确
    const current = await queryOne<FileRecord>(db, FILE_SELECT_SQL, [id]);
    if (!current) {
        throw new Error(`File not found: ${id}`);
    }

    const existing = await queryOne<FileRecord>(db, 'SELECT id FROM files WHERE name = ? AND parent_id IS ? AND id != ?', [newName.trim(), current.parent_id, id]);
    if (existing) {
        throw new Error('File name already exists in the target directory');
    }

    // 在事务中只执行更新操作
    await transaction(db, async (tx) => {
        const updateSql = 'UPDATE files SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
        await tx.exec(updateSql, [newName.trim(), id]);
    });

    // 在事务外部查询更新后的数据，确保获取到最新的值
    const updated = await queryOne<FileRecord>(db, `${FILE_SELECT_SQL} AND name = ?`, [id, newName.trim()]);
    if (!updated) {
        throw new Error(`File not found after update: ${id}`);
    }

    return normalizeFileRecord(updated);
}

async function moveFile(db: D1Database, id: string, newParentId: string | null): Promise<FileRecord> {
    // 将空字符串转换为 null，以正确处理移动到根目录的情况
    const normalizedNewParentId = newParentId === "" ? null : newParentId;

    // 确定目标目录不存在同名文件
    // 先获取当前文件的name，确保查询条件准确
    const current = await queryOne<FileRecord>(db, FILE_SELECT_SQL, [id]);
    if (!current) {
        throw new Error(`File not found: ${id}`);
    }

    // 根据 normalizedNewParentId 是否为 null 构建不同的查询语句
    let existing: FileRecord | null;
    if (normalizedNewParentId === null) {
        existing = await queryOne<FileRecord>(db, 'SELECT id FROM files WHERE name = ? AND parent_id IS NULL', [current.name]);
    } else {
        existing = await queryOne<FileRecord>(db, 'SELECT id FROM files WHERE name = ? AND parent_id = ?', [current.name, normalizedNewParentId]);
    }

    if (existing) {
        throw new Error('File name already exists in the target directory');
    }

    // 在事务中只执行更新操作
    await transaction(db, async (tx) => {
        const updateSql = 'UPDATE files SET parent_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
        await tx.exec(updateSql, [normalizedNewParentId, id]);
    });

    // 在事务外部查询更新后的数据，确保获取到最新的值
    let updated: FileRecord | null = null;
    if (normalizedNewParentId === null) {
        updated = await queryOne<FileRecord>(db, `${FILE_SELECT_SQL} AND parent_id IS NULL`, [id]);
    } else {
        updated = await queryOne<FileRecord>(db, `${FILE_SELECT_SQL} AND parent_id = ?`, [id, normalizedNewParentId]);
    }
    if (!updated) {
        throw new Error(`File not found after update: ${id}`);
    }

    return normalizeFileRecord(updated);
}

/**
 * 删除单个文件（非目录）
 */
async function deleteSingleFile(db: D1Database, id: string): Promise<void> {
    await transaction(db, async (tx) => {
        await tx.exec('DELETE FROM file_chunks WHERE file_id = ?', [id]);
        await tx.exec('DELETE FROM files WHERE id = ?', [id]);
    });
}

/**
 * 递归删除目录及其所有子文件
 */
async function deleteDirectoryRecursively(db: D1Database, id: string): Promise<void> {
    // 使用递归 CTE 一次性查询当前节点及所有后代的 id，
    // 避免逐层递归查询导致的 N+1 问题和栈溢出风险
    const allIdsSql = `
        WITH RECURSIVE descendants(id) AS (
            SELECT id FROM files WHERE id = ?
            UNION ALL
            SELECT f.id FROM files f
            INNER JOIN descendants d ON f.parent_id = d.id
        )
        SELECT id FROM descendants
    `;
    const rows = await queryAll<{ id: string }>(db, allIdsSql, [id]);
    if (rows.length === 0) {
        throw new Error('File not found');
    }

    // 收集所有待删除 id
    const ids = rows.map((r: { id: string }) => r.id);

    // D1 对 IN 列表长度限制为 100，需要分批处理
    const BATCH_SIZE = 100;

    await transaction(db, async (tx) => {
        // 分批删除 file_chunks
        for (let i = 0; i < ids.length; i += BATCH_SIZE) {
            const batchIds = ids.slice(i, i + BATCH_SIZE);
            const placeholders = batchIds.map(() => '?').join(', ');
            await tx.exec(`DELETE FROM file_chunks WHERE file_id IN (${placeholders})`, batchIds);
        }

        // 分批删除 files
        for (let i = 0; i < ids.length; i += BATCH_SIZE) {
            const batchIds = ids.slice(i, i + BATCH_SIZE);
            const placeholders = batchIds.map(() => '?').join(', ');
            await tx.exec(`DELETE FROM files WHERE id IN (${placeholders})`, batchIds);
        }
    });
}

/**
 * 删除文件 (支持目录及其子文件递归删除，并且删除对应分片记录)
 * @param {string} id - 文件ID
 * @param {boolean} [recursive=false] - 是否递归删除子文件
 * @returns {void}
 */
export async function deleteFile(
    db: D1Database,
    id: string,
    recursive: boolean = false
): Promise<void> {
    // 参数校验：id 为空、非字符串或纯空白时提前返回
    if (!id || typeof id !== 'string' || !id.trim()) {
        throw new Error('Invalid file id');
    }

    // 判断该文件是否存在，不存在则直接返回 false
    const fileRecord = await queryOne<FileRecord>(db, FILE_SELECT_SQL, [id]);
    const file = fileRecord ? normalizeFileRecord(fileRecord) : null;
    if (!file) {
        throw new Error('File not found');
    }

    // 判断 recursive 标志，决定删除策略
    if (!recursive) {
        // 非递归删除，仅删除当前文件
        // 判断该文件是否为目录，如果是目录且非递归删除则拒绝操作
        if (file.is_dir) {
            throw new Error('Cannot delete a directory without recursive flag');
        }

        // 删除单个文件
        await deleteSingleFile(db, id);
    } else {
        // 递归删除（适用于文件和目录）
        await deleteDirectoryRecursively(db, id);
    }

    // 验证删除结果
    const verify = await queryOne<FileRecord>(db, FILE_SELECT_SQL, [id]);
    if (verify) {
        throw new Error('Delete operation failed');
    }
}