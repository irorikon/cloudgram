import { Hono } from "hono";
import type { Env } from "../types/env";
import { success } from "../types/response";
import { isTelegramApiAvailable } from "../services/telegram";


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
  return c.json(success({tg_bot_status: await isTelegramApiAvailable(c.env.TELEGRAM_BOT_TOKEN)}), 200);
})

export default system;