import { Hono } from "hono";
import { getFilesByParentId, getFileById, createFile, updateFile, deleteFile, getFoldersByParentId, fileExists } from "../services/file";
import type { Env } from "../types/env";
import { success, error } from "../types/response";

const file = new Hono<{ Bindings: Env }>();

/**
 * 文件管理接口列表
 * @function Get /detail/:fileId - 获取文件详情
 * @function Post /list - 获取文件列表
 * @function Post /create - 创建文件
 * @function Post /update - 更新文件
 * @function Post /delete - 删除文件
 */

/**
 * 获取文件详情
 * @param {string} fileId - 文件ID
 */
file.get('/detail/:fileId', async (c) => {
    const fileId = c.req.param('fileId');
    // 参数校验
    if (!fileId || typeof fileId !== 'string' || !fileId.trim()) {
        return c.json(error('参数错误'), 400);
    }
    const fileRecord = await getFileById(c.env.CloudGramDB, fileId);
    if (!fileRecord) return c.json(error('File not found'), 404);
    return c.json(success(fileRecord));
});

/**
 * 获取指定父目录下的文件列表
 * @param {HonoContext} c - Hono 上下文对象，包含请求和环境变量
 * @param {string} parentId - 父目录 ID
 */
file.post('/list', async (c) => {
    // 解析 JSON body，解析失败时返回 400
    const body = await c.req.json().catch(() => null);
    if (!body || typeof body !== "object") {
        return c.json(error("Request body must be valid JSON"), 400);
    }
    // 父目录 ID 必填
    const parentId = typeof body.parentId === "string" ? body.parentId.trim() : "";
    // 获取文件列表（数据库查询已包含排序：ORDER BY is_dir DESC, name ASC）
    return c.json(success(await getFilesByParentId(c.env.CloudGramDB, parentId)), 200);
});

/**
 * 获取指定父目录下的文件夹列表
 * @param {string} parentId - 父级文件ID
 * @returns {Array} 文件列表
 */
file.post('/dir', async (c) => {
    // 解析 JSON body，解析失败时返回 400
    const body = await c.req.json().catch(() => null);
    if (!body || typeof body !== "object") {
        return c.json(error("Request body must be valid JSON"), 400);
    }
    // 父目录 ID 必填
    const parentId = typeof body.parentId === "string" ? body.parentId.trim() : "";
    return c.json(success(await getFoldersByParentId(c.env.CloudGramDB, parentId)), 200);
})

/**
 * 通过名称查询目录是否存在
 * @param {string} fileName - 文件名
 * @param {string} parentId - 父目录ID
 */
file.post("/exists", async (c) => {
    // 解析 JSON body，解析失败时返回 400
    const body = await c.req.json().catch(() => null);
    if (!body || typeof body !== "object") {
        return c.json(error("Request body must be valid JSON"), 400);
    }
    // 名称必填
    const fileName = typeof body.fileName === "string" ? body.fileName.trim() : null;
    if (!fileName) {
        return c.json(error("Invalid request body"), 400);
    }
    // 可选：parentId
    const parentId = typeof body.parentId === "string" && body.parentId.trim()
        ? body.parentId.trim()
        : null;
    return c.json(success(await fileExists(c.env.CloudGramDB, fileName, parentId)), 200);
})

/**
 * 创建目录（仅允许创建目录，不允许直接创建文件）
 * @param {string} name - 目录名
 * @param {string} parentId - 父级目录ID
 */
file.post('/create', async (c) => {
    // 解析 JSON body，解析失败时返回 400
    const body = await c.req.json().catch(() => null);
    if (!body || typeof body !== "object") {
        return c.json(error("Request body must be valid JSON"), 400);
    }
    // 验证 isDir 参数：只允许创建目录，因此 isDir 必须为 true
    if (typeof body.isDir !== "boolean" || body.isDir !== true) {
        return c.json(error("Only directory creation is allowed, isDir must be true"), 400);
    }
    // 必填：name
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
        return c.json(error("name is required and must be a non-empty string"), 400);
    }
    // 可选：parentId
    const parentId = typeof body.parentId === "string" && body.parentId.trim()
        ? body.parentId.trim()
        : null;
    // 创建目录（固定传入 true 表示创建目录）
    return c.json(success(await createFile(c.env.CloudGramDB, name, parentId, true)), 201);
});

/**
 * 修改文件(移动，重命名)
 * @param {string} active -  操作类型
 * @param {string} id - 文件ID
 * @param {string} newName - 新的文件名
 * @param {string} parentId - 新的父目录ID
 * @returns {FileRecord} 修改后的文件信息
 */
file.post('/update', async (c) => {
    // 解析 JSON body，解析失败时返回 400
    const body = await c.req.json().catch(() => null);
    if (!body || typeof body !== "object") {
        return c.json(error("Request body must be valid JSON"), 400);
    }

    // 新的父级目录 ID,（在移动文件时需要）string | null
    const parentId = typeof body.parentId === "string" ? body.parentId.trim() : "";
    // 操作类型必填
    const active = typeof body.active === "string" ? body.active.trim() : "";
    if (!active) {
        return c.json(error("active is required"), 400);
    } else if (!["move", "rename"].includes(active)) {
        return c.json(error("active must be one of 'rename' or 'move'"), 400);
    }

    // 文件 ID（在移动和重命名时必填）
    const id = typeof body.id === "string" ? body.id.trim() : "";
    if (active === "move" || active === "rename") {
        if (!id) {
            return c.json(error("id is required"), 400);
        }
        if (id === parentId) {
            return c.json(error("Cannot move a directory to the same directory"), 400);
        }
    }

    // 新文件名（在重命名时必填）
    const newName = typeof body.newName === "string" ? body.newName.trim() : "";
    if (active === "rename") {
        if (!newName) {
            return c.json(error("newName is required"), 400);
        }
    }

    const file = await updateFile(c.env.CloudGramDB, id, active, newName, parentId);
    if (!file) {
        return c.json(error("File not found"), 404);
    }
    return c.json(success(file));
});

/**
 * 删除文件
 * @param {HonoContext} c - Hono 上下文对象，包含请求和环境变量
 * @param {string} id - 文件 ID
 * @param {boolean} [recursive=false] - 是否递归删除子文件
 * @returns {Promise<boolean>} - 删除结果
 */
file.post('/delete', async (c) => {
    // 解析 JSON body，解析失败时返回 400
    const body = await c.req.json().catch(() => null);
    if (!body || typeof body !== "object") {
        return c.json(error("Request body must be valid JSON"), 400);
    }
    // 校验参数
    const id = typeof body.id === "string" && body.id.trim() ? body.id.trim() : null;
    if (!id) {
        return c.json(error("Invalid request body"), 400);
    }
    const recursive = typeof body.recursive === "boolean" ? body.recursive : false;

    return c.json(success(await deleteFile(c.env.CloudGramDB, id, recursive)), 200);
});


export default file;