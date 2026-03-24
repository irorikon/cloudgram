import type { ChannelRecord } from "../types/channel";
import { queryAll, queryOne, transaction } from './database';

// 公共 SELECT 字段列表，统一维护避免各函数重复拼写
const CHANNEL_BASE_SELECT =
    'SELECT channel_id, name, limited, message_id, created_at, updated_at FROM channels';
const CHANNEL_SELECT_SQL = `${CHANNEL_BASE_SELECT} WHERE channel_id = ?`;

/**
 * 将数据库记录转换为标准ChannelRecord格式
 * 确保is_dir字段为布尔类型（数据库可能返回1/0）
 */
function normalizeChannelRecord(record: ChannelRecord): ChannelRecord {
    if (!record) return null as any;

    return {
        channel_id: record.channel_id,
        name: record.name,
        message_id: record.message_id,
        limited: Boolean(record.limited), // 确保转换为布尔值
        created_at: record.created_at,
        updated_at: record.updated_at
    };
}

/**
 * 增加 Telegram Channel
 */
export async function createTGChannel(db: D1Database, channelId: string, channelName: string): Promise<ChannelRecord> {
    // 参数校验
    if (!channelId || typeof channelId !== 'string' || channelId.trim() === '') {
        throw new Error('Invalid channel id');
    }
    if (!channelName || typeof channelName !== 'string' || channelName.trim() === '') {
        throw new Error('Invalid channel name');
    }
    // 先检查 channel 是否已存在
    const existing = await queryOne<ChannelRecord>(db, CHANNEL_SELECT_SQL, [channelId.trim()]);
    if (existing) {
        throw new Error('Channel already exists');
    }
    await transaction(db, async (tx) => {
        const insertSql =
            'INSERT INTO channels (channel_id, name, limited, message_id, created_at, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)';
        await tx.exec(insertSql, [channelId, channelName, false, 0]);
    });
    const created = await queryOne<ChannelRecord>(db, CHANNEL_SELECT_SQL, [channelId]);
    if (!created) {
        throw new Error('Channel not found');
    }
    return normalizeChannelRecord(created);
}

/**
 * 删除 Telegram Channel
 */
export async function deleteTGChannel(db: D1Database, channelId: string): Promise<void> {
    // 参数校验
    if (!channelId || typeof channelId !== 'string' || channelId.trim() === '') {
        throw new Error('Invalid channel id');
    }

    // 校验该 channel 下是否存在文件/文件夹
    const fileExists = await queryOne<ChannelRecord>(db, "SELECT id FROM files WHERE channel_id = ? LIMIT 1", [channelId.trim()]);

    if (fileExists) {
        return;
    }

    await transaction(db, async (tx) => {
        await tx.exec('DELETE FROM channels WHERE channel_id = ?', [channelId]);
    });
}

/**
 * 修改 Telegram Channel 信息
 */
export async function updateTGChannelMessageId(db: D1Database, channelId: string, messageId: number, updateLimit: boolean = false): Promise<ChannelRecord> {
    // 参数校验
    if (!channelId || typeof channelId !== 'string' || channelId.trim() === '') {
        throw new Error('Invalid channel id');
    }
    if (typeof messageId !== 'number') {
        throw new Error('Invalid message id');
    }
    let limited: boolean
    if (messageId > 980000 && updateLimit) {
        limited = true
    } else {
        limited = false
    }

    // 在事务中只执行更新操作
    await transaction(db, async (tx) => {
        const updateSql = 'UPDATE channels SET message_id = ?, limited = ? WHERE channel_id = ?';
        await tx.exec(updateSql, [messageId, limited, channelId]);
    });

    // 在事务外部查询更新后的数据，确保获取到最新的值
    const updated = await queryOne<ChannelRecord>(db, `${CHANNEL_SELECT_SQL} AND message_id = ?`, [channelId, messageId]);
    if (!updated) {
        throw new Error(`Channel not found after update: ${channelId}`);
    }

    return normalizeChannelRecord(updated);
}

/**
 * 修改频道名称
 */
export async function updateTGChannelName(db: D1Database, channelId: string, channelName: string): Promise<ChannelRecord> {
    // 参数校验
    if (!channelId || typeof channelId !== 'string' || channelId.trim() === '') {
        throw new Error('Invalid channel id');
    }
    // 参数校验
    if (!channelName || typeof channelName !== 'string' || channelName.trim() === '') {
        throw new Error('Invalid channel name');
    }
    // 在事务中只执行更新操作
    await transaction(db, async (tx) => {
        const updateSql = 'UPDATE channels SET name = ? WHERE channel_id = ?';
        await tx.exec(updateSql, [channelName, channelId]);
    });
    // 在事务外部查询更新后的数据，确保获取到最新的值
    const updated = await queryOne<ChannelRecord>(db, `${CHANNEL_SELECT_SQL} AND name = ?`, [channelId, channelName]);
    if (!updated) {
        throw new Error(`Channel not found after update: ${channelId}`);
    }

    return normalizeChannelRecord(updated);
}

/**
 * 查询 Telegram Channels 信息
 */
export async function findTGChannels(db: D1Database, one: boolean = false, limited: boolean = false): Promise<ChannelRecord | ChannelRecord[]> {
    if (one) {
        const result = await queryOne<ChannelRecord>(db, `${CHANNEL_BASE_SELECT} WHERE limited = ? LIMIT 1`, [limited])
        if (result) {
            return normalizeChannelRecord(result)
        }
    } else {
        const results = await queryAll<ChannelRecord>(db, `${CHANNEL_BASE_SELECT} WHERE limited = ?`, [limited])
        return results.map(result => normalizeChannelRecord(result))
    }
    return []
}