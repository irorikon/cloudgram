-- CloudGram 数据库结构
-- 用于 Cloudflare D1 数据库

-- 文件表
CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    parent_id TEXT,
    is_dir BOOLEAN NOT NULL,
    size INTEGER NOT NULL DEFAULT 0,
    mime_type TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(parent_id) REFERENCES files(id) ON DELETE CASCADE
);

-- 自动更新 updated_at 字段的触发器
CREATE TRIGGER IF NOT EXISTS update_files_updated_at
    AFTER UPDATE ON files
BEGIN
    UPDATE files SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- 频道表
CREATE TABLE IF NOT EXISTS channels (
    channel_id TEXT NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    limited BOOLEAN NOT NULL,
    message_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 自动更新 channels 表 updated_at 字段的触发器
CREATE TRIGGER IF NOT EXISTS update_channels_updated_at
    AFTER UPDATE ON channels
BEGIN
    UPDATE channels SET updated_at = CURRENT_TIMESTAMP WHERE channel_id = NEW.channel_id;
END;

-- 文件分片表
CREATE TABLE IF NOT EXISTS file_chunks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    chunk_size INTEGER NOT NULL,
    telegram_file_id TEXT NOT NULL,
    telegram_msg_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE,
    UNIQUE(file_id, chunk_index)
);

-- 临时分片表（用于分片上传过程中暂存分片信息）
CREATE TABLE IF NOT EXISTS temp_chunks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    upload_id TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    chunk_size INTEGER NOT NULL,
    telegram_file_id TEXT NOT NULL,
    telegram_msg_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 索引优化
-- files 表索引
CREATE INDEX IF NOT EXISTS idx_files_parent_id ON files(parent_id);
-- 复合索引：按父目录和类型查询（常用场景：列出某个目录下的所有文件/目录）
CREATE INDEX IF NOT EXISTS idx_files_parent_is_dir ON files(parent_id, is_dir);
-- 复合索引：按创建时间降序排列（常用场景：最新文件列表）
CREATE INDEX IF NOT EXISTS idx_files_created_at_desc ON files(created_at DESC);
-- 按名称搜索索引（如果需要支持文件名搜索）
CREATE INDEX IF NOT EXISTS idx_files_name ON files(name);

-- file_chunks 表索引
CREATE INDEX IF NOT EXISTS idx_file_chunks_file_id ON file_chunks(file_id);
-- 复合索引：按文件ID和分片索引排序（确保分片按正确顺序获取）
CREATE INDEX IF NOT EXISTS idx_file_chunks_file_index ON file_chunks(file_id, chunk_index);
CREATE INDEX IF NOT EXISTS idx_file_chunks_telegram_file_id ON file_chunks(telegram_file_id);

-- temp_chunks 表索引
CREATE INDEX IF NOT EXISTS idx_temp_chunks_upload_id ON temp_chunks(upload_id);
-- 复合索引：用于高效清理过期的临时分片（按upload_id分组，按创建时间排序）
CREATE INDEX IF NOT EXISTS idx_temp_chunks_upload_created ON temp_chunks(upload_id, created_at);
-- 用于全局清理过期数据的索引（按创建时间升序，便于找到最老的记录）
CREATE INDEX IF NOT EXISTS idx_temp_chunks_created_at_asc ON temp_chunks(created_at ASC);