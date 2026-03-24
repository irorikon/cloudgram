export type UploadSessionRecord = {
    upload_id: string;
    file_name: string;
    file_size: number;
    parent_id: string | null;
    mime_type: string;
    total_chunks: number;
    status: string;
};