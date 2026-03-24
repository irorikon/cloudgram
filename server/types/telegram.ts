// Telegram Bot API sendDocument 接口返回的响应结构
export type TelegramResponse = {
    ok: boolean;
    result?: {
        message_id: number;
        document?: {
            file_name: string;
            mime_type: string;
            file_id: string;
            file_size: number;
        } | null;
    } | null;
    // ok=false 时 Telegram 会返回 description 字段
    description?: string;
}