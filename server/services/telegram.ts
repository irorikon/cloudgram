// Telegram 服务模块
// 提供 Telegram Bot API 文件存储功能
import { stream } from 'hono/streaming';
import { TelegramResponse } from '../types/telegram';

/**
 * 带重试机制的 fetch 请求
 */
async function fetchWithRetry(url: string, options: RequestInit, maxRetries: number = 3): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(url, options);
            return response;
        } catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
            console.warn(`Fetch attempt ${attempt} failed:`, lastError.message);

            // 如果不是最后一次尝试，等待后重试（指数退避）
            if (attempt < maxRetries) {
                // 检查是否是网络连接相关错误
                const isNetworkError = lastError.message.includes('Network connection lost') ||
                    lastError.message.includes('network error') ||
                    lastError.message.includes('timeout') ||
                    lastError.message.includes('Timeout');

                if (isNetworkError) {
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
                    continue;
                }
            }

            // 非网络错误或最后一次尝试失败，直接抛出
            throw lastError;
        }
    }

    throw lastError!;
}

/**
 * 将文件流上传到 Telegram Bot API
 * @param botToken - Telegram Bot API 令牌
 * @param chatId - 目标聊天 ID
 * @param fileStream - 文件的可读流
 * @param fileName - 上传的文件名
 * @param isChunked - 是否为分片上传模式，分片模式下会禁用内容类型检测
 * @returns Telegram API 响应对象
 * @throws 当 botToken、chatId 或 fileName 为空或纯空白字符串时抛出错误
 * @throws 当文件大小超过 20MB 限制时抛出错误
 * @throws 当 Telegram API 网络请求失败时抛出错误
 * @throws 当 Telegram API 返回非成功状态码时抛出错误
 */
export async function uploadFileToTelegram(
    botToken: string,
    chatId: string,
    fileStream: ReadableStream<Uint8Array>,
    fileName: string,
    isChunked: boolean
): Promise<TelegramResponse> {
    // 参数校验：trim() 过滤纯空白字符串
    if (!botToken?.trim() || !chatId?.trim()) throw new Error('botToken and chatId are required');
    if (!fileName?.trim()) throw new Error('fileName is required');

    // Telegram Bot API 单文件上传上限为 50MB, 下载上限为 20MB，分片上传时需遵守下载上限
    const MAX_SIZE = 20 * 1024 * 1024;

    // 使用 TransformStream 实现流式大小检查
    let totalSize = 0;
    const sizeCheckTransform = new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
            totalSize += chunk.byteLength;
            if (totalSize > MAX_SIZE) {
                controller.error(new Error(`File size exceeds the 20MB limit imposed by Telegram Bot API`));
                return;
            }
            controller.enqueue(chunk);
        }
    });

    // 将原始流通过大小检查 TransformStream
    const checkedStream = fileStream.pipeThrough(sizeCheckTransform);

    // 构造 FormData 以符合 Telegram Bot API 的文件上传要求
    // 在 Cloudflare Workers 环境中，FormData 原生支持 ReadableStream
    const formData = new FormData();
    formData.append('chat_id', chatId);
    
    // 直接将流附加到 FormData - Cloudflare Workers 支持此操作
    // 使用类型断言来绕过 TypeScript 的类型检查限制
    const blob = await new Response(checkedStream).blob();
    formData.append('document', blob, fileName);

    // isChunked 场景下禁用内容类型检测，防止 Telegram 拒绝非标准分片文件名
    if (isChunked) {
        formData.append('disable_content_type_detection', 'true');
    }

    const url = `https://api.telegram.org/bot${botToken}/sendDocument`;
    let response: Response;
    try {
        // 使用带重试机制的 fetch
        response = await fetchWithRetry(url, { method: 'POST', body: formData }, 3);
    } catch (err) {
        throw new Error(`Telegram API network error: ${err instanceof Error ? err.message : String(err)}`);
    }

    if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Telegram API error ${response.status}: ${text}`);
    }

    // 先 await 解析 JSON，再做类型断言，避免 Promise<unknown> 直接强转
    return (await response.json()) as TelegramResponse;
}

/**
 * 通过 Telegram Bot API 获取文件的路径
 * @param botToken - Telegram Bot 的访问令牌
 * @param fileId - Telegram 文件的唯一标识符
 * @returns 返回文件在 Telegram 服务器上的路径
 * @throws 当 botToken 或 fileId 为空时抛出错误
 * @throws 当网络请求失败时抛出错误
 * @throws 当 API 返回非成功状态码时抛出错误
 * @throws 当 API 未返回有效的文件路径时抛出错误
 */
export async function getTelegramFilePath(botToken: string, fileId: string): Promise<string> {
    if (!botToken?.trim() || !fileId?.trim()) throw new Error('botToken and fileId are required');

    const url = `https://api.telegram.org/bot${botToken}/getFile`;
    let response: Response;
    try {
        // 使用带重试机制的 fetch
        response = await fetchWithRetry(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file_id: fileId }),
        }, 3);
    } catch (err) {
        throw new Error(`Telegram getFile network error: ${err instanceof Error ? err.message : String(err)}`);
    }

    if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Telegram getFile error ${response.status}: ${text}`);
    }

    const data = (await response.json()) as { ok: boolean; result?: { file_path?: string }; description?: string };
    if (!data.ok || !data.result?.file_path) {
        throw new Error(`Telegram getFile failed: ${data.description ?? 'no file_path returned'}`);
    }

    return data.result.file_path;
}

/**
 * 获取 Telegram 文件的完整下载 URL
 * @param {string} botToken - Telegram 机器人的访问令牌
 * @param {string} fileId - Telegram 文件的唯一标识符
 * @returns {Promise<string>} 完整的文件下载 URL
 * @throws {Error} 当 botToken 或 fileId 为空或仅包含空白字符时抛出错误
 */
export async function getTelegramFileUrl(botToken: string, fileId: string): Promise<string> {
    if (!botToken?.trim() || !fileId?.trim()) throw new Error('botToken and fileId are required');
    // 获取 file_path
    const filePath = await getTelegramFilePath(botToken, fileId);
    // 拼接完整的文件下载URL
    return `https://api.telegram.org/file/bot${botToken}/${filePath}`;
}

/**
 * 删除 Telegram 消息
 * @param botToken - Telegram bot 的访问令牌
 * @param chatId - 聊天 ID
 * @param messageId - 要删除的消息 ID，必须是正整数
 * @throws {Error} 当 botToken 或 chatId 为空时抛出异常
 * @throws {Error} 当 messageId 不是有效正整数时抛出异常
 * @throws {Error} 当网络请求失败时抛出异常
 * @throws {Error} 当 Telegram API 返回错误响应时抛出异常
 */
export async function deleteTelegramFile(botToken: string, chatId: string, messageId: number): Promise<void> {
    if (!botToken?.trim() || !chatId?.trim()) throw new Error('botToken and chatId are required');
    // 使用 Number.isInteger 拦截 NaN、浮点数等非法值，与项目其他校验风格保持一致
    if (!Number.isInteger(messageId) || messageId <= 0) throw new Error('Valid messageId is required');

    const url = `https://api.telegram.org/bot${botToken}/deleteMessage`;
    let response: Response;
    try {
        // 使用带重试机制的 fetch
        response = await fetchWithRetry(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, message_id: messageId }),
        }, 3);
    } catch (err) {
        throw new Error(`Telegram deleteMessage network error: ${err instanceof Error ? err.message : String(err)}`);
    }

    if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Telegram deleteMessage error ${response.status}: ${text}`);
    }

    const data = (await response.json()) as { ok: boolean; description?: string };
    if (!data.ok) {
        throw new Error(`Telegram deleteMessage failed: ${data.description ?? 'unknown error'}`);
    }
}

/**
 * 检测 Telegram Bot API 是否可用
 * @param botToken - Telegram Bot API 令牌
 * @returns 如果 API 可用则返回 true，否则返回 false
 * @throws 当 botToken 为空或纯空白字符串时抛出错误
 */
export async function isTelegramApiAvailable(botToken: string): Promise<boolean> {
    if (!botToken?.trim()) throw new Error('botToken is required');

    const url = `https://api.telegram.org/bot${botToken}/getMe`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时

    try {
        const response = await fetch(url, {
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response.ok;
    } catch (err) {
        clearTimeout(timeoutId);
        // 网络错误或超时时返回 false，表示 API 不可用
        return false;
    }
}

/**
 * 检测 Channel 是否可用
 */
export async function checkTelegramChannel(botToken: string, channelId: string): Promise<boolean> {
    if (!botToken?.trim()) throw new Error('botToken is required');
    if (!channelId?.trim()) throw new Error('channelId is required');

    const url = `https://api.telegram.org/bot${botToken}/getChat?chat_id=${channelId}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时

    try {
        const response = await fetch(url, {
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response.ok;
    } catch (err) {
        clearTimeout(timeoutId);
        // 网络错误或超时时返回 false，表示 API 不可用
        return false;
    }
}