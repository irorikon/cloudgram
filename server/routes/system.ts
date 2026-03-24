import { Hono } from "hono";
import type { Env } from "../types/env";
import { error, success } from "../types/response";
import { isTelegramApiAvailable, checkTelegramChannel } from "../services/telegram";


const system = new Hono<{ Bindings: Env }>();

system.get('/health', async (c) => {
  const now = new Date();
  return c.json(success({
    status: 'ok',
    timestamp: now.toISOString(),
    version: c.env.APP_VERSION || '0.0.0'
  }), 200);
});

/**
 * Telegram Bot 检查接口
 */
system.get('/status', async (c) => {
  return c.json(success({ tg_bot_status: await isTelegramApiAvailable(c.env.TELEGRAM_BOT_TOKEN) }), 200);
})

/**
 * Telegram Channel 检查接口
 * @param {string} channelId - 频道 ID
 */
system.post('/channel', async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return c.json(error('Request body must be valid JSON'), 400);
  }
  const channelId = typeof body.channelId === 'string' && body.channelId.trim() ? body.channelId.trim() : null;
  if (!channelId) {
    return c.json(error('Invalid channel_id'), 400);
  }
  return c.json(success({ tg_channel_status: await checkTelegramChannel(c.env.TELEGRAM_BOT_TOKEN, channelId) }), 200);
})

export default system;