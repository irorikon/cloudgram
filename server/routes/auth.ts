import { Hono } from "hono";
import { sign } from "hono/jwt";
import type { Env } from "../types/env";
import { success, error } from "../types/response";

const auth = new Hono<{ Bindings: Env }>();


// 登录响应数据类型
interface LoginResponse {
  token: string;
  tokenType: string;
  expiresIn: number;
  expiresAt: string;
  user: { username: string };
}

/**
 * 处理用户登录认证请求
 * @param {HonoContext} c - Hono 上下文对象，包含请求和环境变量
 * @returns {Promise<Response>} 返回 JSON 响应，包含 JWT token 或错误信息
 * @throws {400} 当请求体不是有效的 JSON、缺少用户名或密码、或密码不是有效的 Base64 编码时
 * @throws {401} 当用户名或密码不匹配时
 *
 * 该路由处理 POST /login 请求，验证用户凭据并签发 JWT token。
 * 请求体应包含 username 和 base64 编码的 password 字段。
 * 成功认证后返回包含 token、token 类型、过期时间和用户信息的响应。
 */
auth.post("/login", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json(error("invalid JSON request body"), 400);
  }

  const username = (body as Record<string, unknown>)?.username;
  const base64Password = (body as Record<string, unknown>)?.password;

  if (typeof username !== "string" || typeof base64Password !== "string" || !username || !base64Password) {
    return c.json(error("username and password are required"), 400);
  }

  let decodedPassword: string;
  try {
    decodedPassword = atob(base64Password);
  } catch {
    return c.json(error("invalid base64 password"), 400);
  }

  // Compare credentials (rate limiting should be implemented for production use)
  const usernameMatch = username === c.env.AUTH_USERNAME;
  const passwordMatch = decodedPassword === c.env.AUTH_PASSWORD;

  if (!usernameMatch || !passwordMatch) {
    return c.json(error("invalid credentials"), 401);
  }

  const iat = Math.floor(Date.now() / 1000);
  const expiresIn = 24 * 60 * 60; // 24 hours
  const exp = iat + expiresIn;

  const token = await sign(
    { sub: username, iat, exp },
    c.env.JWT_SECRET
  );

  const responseData: LoginResponse = {
    token,
    tokenType: "Bearer",
    expiresIn,
    expiresAt: new Date(exp * 1000).toISOString(),
    user: { username },
  };

  return c.json(success(responseData), 200);
});

/**
 * 刷新 Token 接口
 */
auth.get('/refresh-token', async (c) => {
  // 由于 JWT 中间件已经在路由前验证了 token，
  // 我们可以直接从 context 中获取已验证的用户信息
  const payload = c.get('jwtPayload') as { sub: string; exp: number; iat: number } | undefined;

  if (!payload || typeof payload.sub !== 'string') {
    return c.json(error('Invalid user information'), 401);
  }

  // 生成新的 token
  const iat = Math.floor(Date.now() / 1000);
  const expiresIn = 24 * 60 * 60; // 24 hours
  const exp = iat + expiresIn;

  const newToken = await sign(
    { sub: payload.sub, iat, exp },
    c.env.JWT_SECRET
  );

  const responseData: LoginResponse = {
    token: newToken,
    tokenType: "Bearer",
    expiresIn,
    expiresAt: new Date(exp * 1000).toISOString(),
    user: { username: payload.sub },
  };

  return c.json(success(responseData), 200);
});

export default auth;