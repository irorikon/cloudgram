import { queryAll, queryOne, transaction, execute } from './database';
import { deleteTelegramFile as deleteTelegramMessage } from './telegram';
import type { FileChunkRecord, TempChunkRecord } from '../types/file';

// ================== 文件分片操作 ==================

// FileChunkRecord 类型已在 '../types/database' 中定义，无需重复声明

// 公共分片查询字段，统一维护
const FILE_CHUNK_SELECT_FIELDS =
    'id, file_id, chunk_index, chunk_size, telegram_file_id, telegram_msg_id, created_at';

/**
 * 创建文件分片记录
 * @param {string} fileId - 关联的文件ID
 * @param {number} chunkIndex - 分片索引（从0开始）
 * @param {number} chunkSize - 分片大小（字节）
 * @param {string} telegramFileId - 分片对应的 Telegram file id
 * @param {string} telegramMsgId - 分片对应的 Telegram message id
 * @returns {Object} 创建的分片信息
 */
export async function createFileChunk(
    db: D1Database,
    fileId: string,
    chunkIndex: number,
    chunkSize: number,
    telegramFileId: string,
    telegramMsgId: number
): Promise<FileChunkRecord> {
    // 参数校验
    if (!fileId || typeof fileId !== 'string') throw new Error('Invalid file id');
    if (!Number.isInteger(chunkIndex) || chunkIndex < 0) throw new Error('Invalid chunk index');
    if (!Number.isInteger(chunkSize) || chunkSize <= 0) throw new Error('Invalid chunk size');
    if (!telegramFileId || typeof telegramFileId !== 'string') throw new Error('Invalid telegram file id');
    if (!Number.isInteger(telegramMsgId) || telegramMsgId <= 0) throw new Error('Invalid telegram message id');

    // 直接执行插入操作（单个 INSERT 本身就是原子的，不需要事务）
    const insertSql = `
        INSERT INTO file_chunks (file_id, chunk_index, chunk_size, telegram_file_id, telegram_msg_id, created_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;
    const insertRes = await execute(db, insertSql, [fileId, chunkIndex, chunkSize, telegramFileId, telegramMsgId]);

    if (insertRes.lastRowId === null) {
        throw new Error('Failed to create file chunk: no lastRowId returned');
    }

    const lastRowId = insertRes.lastRowId;

    // 查询刚插入的记录
    const selectSql = `SELECT ${FILE_CHUNK_SELECT_FIELDS} FROM file_chunks WHERE id = ?`;
    const created = await queryOne<FileChunkRecord>(db, selectSql, [lastRowId]);

    if (!created) {
        throw new Error('Created file chunk not found');
    }

    return created;
}

/**
 * 根据分片ID获取分片信息
 * @param {string} id - 分片ID
 * @returns {Object|null} 分片信息，未找到时返回 null
 */
export async function getFileChunkById(db: D1Database, id: string): Promise<FileChunkRecord | null> {
    // 参数校验：id 不合法时提前返回
    if (!id || typeof id !== 'string') return null;

    const sql = `SELECT ${FILE_CHUNK_SELECT_FIELDS} FROM file_chunks WHERE id = ?`;
    const record = await queryOne<FileChunkRecord>(db, sql, [id]);
    return record || null;
}

/**
 * 获取文件分片列表（支持递归获取文件夹下所有文件的分片）
 * @param {string} id - 文件ID或文件夹ID
 * @returns {Array} 分片列表
 */
export async function getFileChunksByFileId(db: D1Database, id: string): Promise<FileChunkRecord[]> {
    // 参数校验：id 不合法时提前返回空数组
    if (!id || typeof id !== 'string') return [];

    // 检查传入的ID是否存在
    const exists = await queryOne<{ id: string }>(db, 'SELECT id FROM files WHERE id = ?', [id]);
    if (!exists) return [];

    // 统一使用递归查询获取所有相关文件的分片
    // 使用递归CTE查询指定ID及其所有后代文件（非目录）的ID
    const allFileIdsSql = `
        WITH RECURSIVE descendants(id, is_dir) AS (
            SELECT id, is_dir FROM files WHERE id = ?
            UNION ALL
            SELECT f.id, f.is_dir FROM files f
            INNER JOIN descendants d ON f.parent_id = d.id
        )
        SELECT id FROM descendants WHERE is_dir = 0
    `;

    const fileRows = await queryAll<{ id: string }>(db, allFileIdsSql, [id]);

    // 如果没有找到任何文件，返回空数组
    if (fileRows.length === 0) return [];

    // 获取所有文件ID
    const fileIds = fileRows.map(row => row.id);

    // 构建IN查询语句来获取所有文件的分片
    const placeholders = fileIds.map(() => '?').join(', ');
    const sql = `SELECT ${FILE_CHUNK_SELECT_FIELDS} FROM file_chunks WHERE file_id IN (${placeholders}) ORDER BY file_id, chunk_index ASC`;

    return queryAll<FileChunkRecord>(db, sql, fileIds);
}

/**
 * 删除分片对应的 telegram 文件
 * @param {FileChunkRecord[] | TempChunkRecord[]} chunks - 临时分片记录数组
 * @param {string} botToken - Telegram Bot 令牌
 * @param {string} chatId - Telegram 聊天 ID
 * @returns {Promise<number[]>} 成功删除的分片ID数组
 */
export async function deleteChunksWithTelegramFile(chunks: FileChunkRecord[] | TempChunkRecord[], botToken: string, chatId: string): Promise<number[]> {
    // 删除每个分片对应的 Telegram 消息（这会同时删除文件）
    const successfullyDeletedChunkIds: number[] = [];

    // 直接并发删除所有分片，不再进行批次处理
    const deletePromises = chunks.map(async (chunk) => {
        try {
            await deleteTelegramMessage(botToken, chatId, chunk.telegram_msg_id);
            return chunk.id;
        } catch (error) {
            // 记录错误但继续处理其他分片，避免一个分片删除失败影响整体操作
            console.error(`Failed to delete Telegram message ${chunk.telegram_msg_id} for chunk ${chunk.id}:`, error);
            return null;
        }
    });

    // 并发执行所有删除操作
    const results = await Promise.all(deletePromises);
    const successfulIds = results.filter((id): id is number => id !== null);
    successfullyDeletedChunkIds.push(...successfulIds);

    return successfullyDeletedChunkIds;
}

// ================== 临时分片记录 ==================

// TempChunkRecord 类型已在 '../types/database' 中定义，无需重复声明

/**
 * 创建临时分片记录（用于分片上传过程中，关联分片上传会话）
 * @param {D1Database} db - 数据库实例
 * @param {string} uploadId - 分片上传会话 ID（前端生成并传入）
 * @param {number} chunkIndex - 分片索引
 * @param {number} chunkSize - 分片大小（字节）
 * @param {string} telegramFileId - 分片对应的 Telegram file id
 * @param {number} telegramMsgId - 分片对应的 Telegram message id
 * @returns {Object} 创建的临时分片信息
 */
export async function createTempChunkRecord(db: D1Database, uploadId: string, chunkIndex: number, chunkSize: number, telegramFileId: string, telegramMsgId: number): Promise<TempChunkRecord> {
    // 参数校验
    if (!uploadId || typeof uploadId !== 'string') throw new Error('Invalid upload id');
    if (!Number.isInteger(chunkIndex) || chunkIndex < 0) throw new Error('Invalid chunk index');
    if (!Number.isInteger(chunkSize) || chunkSize <= 0) throw new Error('Invalid chunk size');
    if (!telegramFileId || typeof telegramFileId !== 'string') throw new Error('Invalid telegram file id');
    if (!Number.isInteger(telegramMsgId) || telegramMsgId <= 0) throw new Error('Invalid telegram message id');

    // 直接执行插入操作（单个 INSERT 本身就是原子的，不需要事务）
    const insertSql = `
        INSERT INTO temp_chunks (upload_id, chunk_index, chunk_size, telegram_file_id, telegram_msg_id, created_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;
    const insertRes = await execute(db, insertSql, [uploadId, chunkIndex, chunkSize, telegramFileId, telegramMsgId]);

    // 验证 lastRowId 是否有效
    if (insertRes.lastRowId === null || insertRes.lastRowId === undefined || !Number.isInteger(insertRes.lastRowId)) {
        throw new Error('Failed to create temp chunk record: invalid lastRowId returned');
    }

    const lastRowId = insertRes.lastRowId;

    // 查询刚插入的记录
    const selectSql = `SELECT id, upload_id, chunk_index, chunk_size, telegram_file_id, telegram_msg_id, created_at FROM temp_chunks WHERE id = ?`;
    const created = await queryOne<TempChunkRecord>(db, selectSql, [lastRowId]);

    if (!created) {
        throw new Error('Created temp chunk record not found');
    }

    return created;
}

/**
 * 清理临时分片记录 (上传成功后)
 * @param {D1Database} db - 数据库实例
 * @param {string} uploadId - 分片上传会话 ID
 * @returns {number} 删除的记录数量
 */
export async function deleteTempChunkRecordsByUploadId(db: D1Database, uploadId: string): Promise<number> {
    // 参数校验：uploadId 为空或非字符串时提前返回 0（无记录可删为正常情况，非异常）
    if (!uploadId || typeof uploadId !== 'string' || !uploadId.trim()) return 0;

    return transaction(db, async (tx) => {
        const res = await tx.exec('DELETE FROM temp_chunks WHERE upload_id = ?', [uploadId]);
        // changes 为 0 表示该会话无关联临时分片，属正常情况，直接返回
        return res.changes;
    });
}

/**
 * 将临时分片转移到正式文件分片表
 * @param {D1Database} db - 数据库实例
 * @param {string} uploadId - 上传会话ID
 * @param {string} fileId - 目标文件ID
 * @returns {Promise<number>} 转移的分片数量
 */
export async function transferTempChunksToFile(db: D1Database, uploadId: string, fileId: string): Promise<number> {
    // 参数校验
    if (!uploadId || typeof uploadId !== 'string') {
        throw new Error('Invalid upload ID');
    }
    if (!fileId || typeof fileId !== 'string') {
        throw new Error('Invalid file ID');
    }

    return transaction(db, async (tx) => {
        // 将临时分片转移到正式分片表
        const transferSql = `
            INSERT INTO file_chunks (file_id, chunk_index, chunk_size, telegram_file_id, telegram_msg_id, created_at)
            SELECT ?, chunk_index, chunk_size, telegram_file_id, telegram_msg_id, created_at
            FROM temp_chunks
            WHERE upload_id = ?
            ORDER BY chunk_index ASC
        `;
        const transferResult = await tx.exec(transferSql, [fileId, uploadId]);

        // 删除临时分片记录
        const deleteResult = await tx.exec('DELETE FROM temp_chunks WHERE upload_id = ?', [uploadId]);

        return transferResult.changes;
    });
}

/**
 * 通过 upload_id 计算分片总数
 * @param {D1Database} db - 数据库实例
 * @param {string} uploadId - 分片上传会话 ID
 * @returns {Promise<number>} 分片总数
 */
export async function getTotalChunksByUploadId(db: D1Database, uploadId: string): Promise<number> {
    // 参数校验：uploadId 为空或非字符串时返回 0
    if (!uploadId || typeof uploadId !== 'string' || !uploadId.trim()) {
        return 0;
    }

    const sql = 'SELECT COUNT(*) as count FROM temp_chunks WHERE upload_id = ?';
    const result = await queryOne<{ count: number }>(db, sql, [uploadId]);
    
    return result?.count || 0;
}

/**
 * 清理临时分片记录和 Telegram 消息 (上传失败后)
 * @param {D1Database} db - 数据库实例
 * @param {string} uploadId - 分片上传会话 ID
 * @param {string} botToken - Telegram Bot 令牌
 * @param {string} chatId - Telegram 聊天 ID
 * @returns {number} 删除的记录数量
 */
export async function cleanTempChunkRecordsByUploadId(db: D1Database, uploadId: string, botToken: string, chatId: string): Promise<number> {
    // 参数校验：uploadId 为空或非字符串时提前返回 0（无记录可删为正常情况，非异常）
    if (!uploadId || typeof uploadId !== 'string' || !uploadId.trim()) return 0;
    if (!botToken || typeof botToken !== 'string' || !botToken.trim()) throw new Error('Invalid bot token');
    if (!chatId || typeof chatId !== 'string' || !chatId.trim()) throw new Error('Invalid chat id');

    const selectSql = `SELECT id, upload_id, chunk_index, chunk_size, telegram_file_id, telegram_msg_id, created_at FROM temp_chunks WHERE upload_id = ?`;
    const tempChunks = await queryAll<TempChunkRecord>(db, selectSql, [uploadId])
    if (tempChunks.length === 0) {
        return tempChunks.length
    }
    
    // 通过 Telegram 删除分片信息
    await deleteChunksWithTelegramFile(tempChunks, botToken, chatId);
    
    return transaction(db, async (tx) => {
        const res = await tx.exec('DELETE FROM temp_chunks WHERE upload_id = ?', [uploadId]);
        // changes 为 0 表示该会话无关联临时分片，属正常情况，直接返回
        return res.changes;
    });
}
