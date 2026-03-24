// 定义文件数据库相关类型
// 数据库中的文件记录类型
export type FileRecord = {
    id: string;
    name: string;
    parent_id: string | null;
    is_dir: number | boolean;
    size: number | null;
    mime_type?: string | null;
    created_at: string;
    updated_at: string;
};

// 数据库中的文件分片记录类型
export type FileChunkRecord = {
    id: number;
    file_id: string;
    chunk_index: number;
    chunk_size: number;
    telegram_file_id: string;
    telegram_msg_id: number;
    created_at: string;
};

// 数据库中的临时分片记录类型
export type TempChunkRecord = {
    id: number;
    upload_id: string;
    chunk_index: number;
    chunk_size: number;
    telegram_file_id: string;
    telegram_msg_id: number;
    created_at: string;
};

// 应用层使用的文件项类型（转换后的格式）
export type FileItem = {
    id: string;
    name: string;
    parentId?: string | null;
    isDir: boolean;
    size: number;
    mimeType?: string;
};

export type FileChunkItem = {
    id: number;
    fileId: string;
    chunkIndex: number;
    chunkSize: number;
    telegramFileId: string;
    telegramMessageId: number;
};

export type TempChunkItem = {
    id: number;
    uploadId: string;
    chunkIndex: number;
    chunkSize: number;
    telegramFileId: string;
    telegramMessageId: number;
};