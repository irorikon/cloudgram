import { Hono } from "hono";
import { getFileChunksByFileId, deleteChunksWithTelegramFile } from "../services/chunk";
import { getTelegramFileUrl } from "../services/telegram";
import type { Env } from "../types/env";
import { success, error } from "../types/response";

const chunk = new Hono<{ Bindings: Env }>();

/**
 * 查询文件分片下载地址
 * @param {string} telegramFileId - 文件ID
 */
chunk.get('/query/:telegramFileId', async (c) => {
    const telegramFileId = c.req.param('telegramFileId');
    if (!telegramFileId || typeof telegramFileId !== 'string' || null) {
        return c.json(error('fileId is required'), 400);
    }
    const telegramFileUrl = await getTelegramFileUrl(c.env.TELEGRAM_BOT_TOKEN, telegramFileId);
    return c.json(success({ url: telegramFileUrl }), 200);
})

/**
 * 代理下载文件分片（解决CORS问题）
 * @param {string} telegramFileId - 文件ID
 */
chunk.get('/proxy/:telegramFileId', async (c) => {
    const telegramFileId = c.req.param('telegramFileId');
    if (!telegramFileId || typeof telegramFileId !== 'string') {
        return c.json(error('telegramFileId is required'), 400 as any);
    }

    try {
        // 获取 Telegram 文件的完整下载 URL
        const telegramFileUrl = await getTelegramFileUrl(c.env.TELEGRAM_BOT_TOKEN, telegramFileId);

        // 从 Telegram 服务器下载文件
        const response = await fetch(telegramFileUrl);

        if (!response.ok) {
            return c.json(error(`Failed to download from Telegram: ${response.status}`), response.status as any);
        }

        // 获取内容类型和内容长度
        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        const contentLength = response.headers.get('content-length');

        // 设置响应头
        c.header('Content-Type', contentType);
        if (contentLength) {
            c.header('Content-Length', contentLength);
        }
        c.header('Cache-Control', 'no-cache');

        // 返回文件流
        if (response.body) {
            return c.body(response.body);
        } else {
            return c.json(error('No response body from Telegram'), 500 as any);
        }
    } catch (err) {
        console.error('Error downloading chunk:', err);
        return c.json(error(`Download failed: ${(err as Error).message}`), 500 as any);
    }
});

/**
 * 查询所有文件分片
 * @param {string[]} ids - 文件的 IDs
 */
chunk.post('/list', async (c) => {
    // 解析 JSON body，解析失败时返回 400
    const body = await c.req.json().catch(() => null);
    if (!body || typeof body !== "object") {
        return c.json(error("Request body must be valid JSON"), 400);
    }
    const id = typeof body.id === "string" ? body.id : null;
    if (!id) {
        return c.json(error("Invalid request body"), 400);
    }
    return c.json(success(await getFileChunksByFileId(c.env.CloudGramDB, id)), 200);
});

/**
 * 从 Telegram 删除文件分片数据
 * @param {FileChunkRecord[]} fileChunks - 文件分片数据
 */
chunk.post('/delete', async (c) => {
    // 解析 JSON body，解析失败时返回 400
    const body = await c.req.json().catch(() => null);
    if (!body || typeof body !== "object") {
        return c.json(error("Request body must be valid JSON"), 400);
    }
    const fileChunks = Array.isArray(body.fileChunks) ? body.fileChunks : null;
    if (!fileChunks) {
        return c.json(error("Invalid request body"), 400);
    }
    // 校验分片数据的长度
    if (fileChunks.length > 20 || fileChunks.length < 1) {
        return c.json(error("Invalid request body"), 400);
    }
    return c.json(success(await deleteChunksWithTelegramFile(fileChunks, c.env.TELEGRAM_BOT_TOKEN, c.env.TELEGRAM_CHAT_ID)), 200);
});

export default chunk;