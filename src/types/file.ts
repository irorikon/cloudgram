export interface FileItem {
    id: string;
    name: string;
    parent_id?: string | null;
    is_dir: boolean;
    size: number; // 现在是必填字段，默认值为0
    mime_type?: string;
    icon?: string;
    created_at: string;
    updated_at: string;
}

export interface FileChunk {
    id: number;
    file_id: string;
    chunk_index: number;
    chunk_size: number;
    chunk_hash: string | null;
    telegram_file_id: string;
    telegram_msg_id: number;
    created_at: string;
}