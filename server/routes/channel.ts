import { Hono } from "hono";
import type { Env } from "../types/env";
import { success, error } from "../types/response";
import {
    createTGChannel,
    deleteTGChannel,
    findTGChannels,
    updateTGChannelName,
} from "../services/channel";

const channel = new Hono<{ Bindings: Env }>();

/**
 * 获取所有可用的 Telegram Channel 列表
 */
channel.get('/list', async (c) => {
    return c.json(success(await findTGChannels(c.env.CloudGramDB, false, false)), 200);
})

/**
 * 获取一个可用的 Telegram Channel
 */
channel.get('/get', async (c) => {
    return c.json(success(await findTGChannels(c.env.CloudGramDB, true, false)), 200);
})

/**
 * 创建一个 Telegram Channel
 * @param {string} channelId
 * @param {string} channelName
 */
channel.post('/create', async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
        return c.json(error('Request body must be valid JSON'), 400);
    }
    const channelId = typeof body.channelId === 'string' && body.channelId.trim() ? body.channelId.trim() : null;
    if (!channelId) {
        return c.json(error('Invalid channel_id'), 400);
    }
    const channelName = typeof body.channelName === 'string' && body.channelName.trim() ? body.channelName.trim() : null;
    if (!channelName) {
        return c.json(error('Invalid channel_name'), 400);
    }
    const channel = await createTGChannel(c.env.CloudGramDB, channelId, channelName);
    return c.json(success(channel), 200);
})

/**
 * 修改频道名称
 */
channel.post("/update", async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
        return c.json(error('Invalid request body'), 400);
    }
    const channelId = typeof body.channelId === 'string' ? body.channelId.trim() : null;
    if (!channelId) {
        return c.json(error('Invalid channel_id'), 400);
    }
    const channelName = typeof body.channelName === 'string' ? body.channelName.trim() : null;
    if (!channelName) {
        return c.json(error('Invalid channel_name'), 400);
    }
    const updatedChannel = await updateTGChannelName(c.env.CloudGramDB, channelId, channelName);
    return c.json(success(updatedChannel), 200);
})

/**
 * 删除一个 TG 频道
 * @param {string} channelId - 频道的 ID
 */
channel.post('/delete', async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
        return c.json(error('Request body must be valid JSON'), 400);
    }
    const channelId = typeof body.channelId === 'string' && body.channelId.trim() ? body.channelId.trim() : null;
    if (!channelId) {
        return c.json(error('Invalid channel_id'), 400);
    }
    return c.json(success(await deleteTGChannel(c.env.CloudGramDB, channelId)), 200);
})

export default channel;