import { Hono } from "hono";
import type { Env } from "../types/env";
import { success, error } from "../types/response";
import { createTempChunkRecord, transferTempChunksToFile, getTotalChunksByUploadId, cleanTempChunkRecordsByUploadId } from "../services/chunk";
import { uploadFileToTelegram } from "../services/telegram";
import { createFile } from "../services/file";
import { updateTGChannelMessageId } from "../services/channel";

const upload = new Hono<{ Bindings: Env }>();

/**
 * 上传文件分片
 */
upload.post("/chunk", async (c) => {

    // 解析 multipart/form-data 请求 - 使用 parseBody 替代 formData
    const formData = await c.req.parseBody({ all: true });

    // 调试：输出所有 FormData 键值对

    // 获取必要的参数
    const channelId = typeof formData.channelId === "string" ? formData.channelId.trim() : null;
    const uploadId = typeof formData.uploadId === "string" ? formData.uploadId.trim() : null;
    const chunkIndexStr = typeof formData.chunkIndex === "string" ? formData.chunkIndex : null;
    const chunkSizeStr = typeof formData.chunkSize === "string" ? formData.chunkSize : null;

    // 转换数值参数
    const chunkIndex = chunkIndexStr ? parseInt(chunkIndexStr) : null;
    const chunkSize = chunkSizeStr ? parseInt(chunkSizeStr) : null;

    // 验证必要参数
    if (channelId === null || uploadId === null || chunkIndex === null || chunkSize === null) {
        return c.json(error("Missing required parameters: uploadId, chunkIndex, chunkSize"), 400);
    }

    // 验证数值参数
    if (isNaN(chunkIndex) || isNaN(chunkSize) || chunkIndex < 0 || chunkSize <= 0) {
        return c.json(error("Invalid numeric parameters"), 400);
    }

    // 获取文件分片 - 在 Cloudflare Workers 中，formData.file 可能是 string | File | (string | File)[]
    const file = formData.file;

    // 类型守卫：检查是否为有效的文件对象
    const isValidFile = (obj: any): obj is { name: string; stream: () => ReadableStream } => {
        return obj && typeof obj === 'object' &&
            typeof obj.name === 'string' &&
            typeof obj.stream === 'function';
    };

    if (!file || !isValidFile(file)) {
        return c.json(error("File chunk is required"), 400);
    }

    try {
        // 直接使用前端传入的文件名
        const telegramFileName = file.name;

        // 上传文件到 Telegram - 现在内部已有重试机制
        const telegramResponse = await uploadFileToTelegram(
            c.env.TELEGRAM_BOT_TOKEN,
            channelId,
            file.stream(),
            telegramFileName,
            true
        );
        // 检查 Telegram 响应是否成功
        if (!telegramResponse.ok || !telegramResponse.result) {
            throw new Error(`Telegram upload failed: ${telegramResponse.description || 'Unknown error'}`);
        }

        const telegramFileId = telegramResponse.result.document?.file_id;
        const telegramMessageId = telegramResponse.result.message_id;

        if (!telegramFileId) {
            throw new Error('Telegram response missing file_id');
        }

        // 创建临时分片记录
        const tempChunk = await createTempChunkRecord(
            c.env.CloudGramDB,
            uploadId,
            chunkIndex,
            chunkSize,
            telegramFileId,
            telegramMessageId
        );

        // 更新 Channel 记录
        await updateTGChannelMessageId(c.env.CloudGramDB, channelId, telegramMessageId);

        return c.json(success({
            chunkId: tempChunk.id,
            uploadId: tempChunk.upload_id,
            chunkIndex: tempChunk.chunk_index,
            telegramFileId: tempChunk.telegram_file_id,
            telegramMessageId: tempChunk.telegram_msg_id
        }));
    } catch (err) {
        console.error("Failed to upload chunk:", err);
        // 检查是否是网络连接错误，如果是，返回特定的错误信息以便前端重试
        const errorMessage = err instanceof Error ? err.message : String(err);
        if (errorMessage.includes('Network connection lost') ||
            errorMessage.includes('network error') ||
            errorMessage.includes('timeout')) {
            return c.json(error("Network connection lost. Please retry the upload."), 503);
        }
        return c.json(error("Failed to upload chunk"), 500);
    }
});

/**
 * 合并分片并创建文件
 * @param {string} uploadId - 上传会话 ID
 * @param {string} name - 文件名
 * @param {string} parentId - 父级目录 ID
 * @param {number} size - 文件大小
 * @param {string} mimeType - 文件 MIME 类型
 * @param {string} channelId - 频道 ID
 * @param {number} totalChunks - 分片总数
 */
upload.post("/merge", async (c) => {
    // 解析 JSON body
    const body = await c.req.json().catch(() => null);
    if (!body || typeof body !== "object") {
        return c.json(error("Request body must be valid JSON"), 400);
    }

    // 获取必要参数
    const uploadId = typeof body.uploadId === "string" ? body.uploadId : null;
    if (!uploadId) {
        return c.json(error("Invalid uploadId"), 400);
    }
    const channelId = typeof body.channelId === "string" ? body.channelId : null;
    if (!channelId) {
        return c.json(error("Invalid channelId"), 400);
    }
    const filename = typeof body.filename === "string" ? body.filename : null;
    if (!filename) {
        return c.json(error("Invalid filename"), 400);
    }
    const parentId = typeof body.parentId === "string" ? body.parentId : null;
    const size = typeof body.size === "number" ? body.size : null;
    if (!size) {
        return c.json(error("Invalid size"), 400);
    }
    const mimeType = typeof body.mimeType === "string" ? body.mimeType : null;
    const uploadedChunks = typeof body.uploadedChunks === "number" ? body.uploadedChunks : null;
    try {
        // 获取已上传的分片总数
        const totalChunks = await getTotalChunksByUploadId(c.env.CloudGramDB, uploadId);
        // 验证所有分片是否已上传
        if (uploadedChunks !== totalChunks) {
            return c.json(error(`Incomplete upload: expected ${totalChunks} chunks, got ${uploadedChunks}`), 400);
        }

        // 创建文件记录
        const file = await createFile(
            c.env.CloudGramDB,
            filename,
            parentId,
            false, // is_dir = false (file)
            size,
            channelId,
            mimeType || "application/octet-stream"
        );

        // 转移临时分片到正式文件分片表
        await transferTempChunksToFile(c.env.CloudGramDB, uploadId, file.id);

        return c.json(success({
            fileId: file.id,
            fileName: file.name,
            fileSize: file.size,
            parentId: file.parent_id,
            message: "File created successfully"
        }));
    } catch (err) {
        console.error("Failed to merge chunks and create file:", err);
        return c.json(error("Failed to merge chunks and create file"), 500);
    }
});

/**
 * 上传失败后清理上传失败处理程序
 * @param {string} uploadId - 上传 ID
 * @param {string} channelId - 频道 ID
 */
upload.post('/cleanup', async (c) => {
    // 解析 JSON body
    const body = await c.req.json().catch(() => null);
    if (!body || typeof body !== "object") {
        return c.json(error("Request body must be valid JSON"), 400);
    }
    // 验证参数
    const uploadId = typeof body.uploadId === "string" ? body.uploadId.trim() : "";
    if (!uploadId) {
        return c.json(error("Invalid request body"), 400);
    }
    const channelId = typeof body.channelId === "string" ? body.channelId.trim() : "";
    if (!channelId) {
        return c.json(error("Invalid request body"), 400);
    }
    const deletedCount = await cleanTempChunkRecordsByUploadId(c.env.CloudGramDB, uploadId, c.env.TELEGRAM_BOT_TOKEN, channelId);
    return c.json(success({ deletedCount }, "Upload session cleaned up successfully"), 200);
})

// 导出 upload 路由
export default upload;