import { Hono } from 'hono'
import { jwt } from 'hono/jwt'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import auth from './routes/auth'
import file from './routes/file'
import chunk from './routes/chunk'
import system from './routes/system'
import upload from './routes/upload'
import { error as errorResp } from './types/response'
import type { Env } from './types/env'

const app = new Hono<{ Bindings: Env }>().basePath('/api')

// Global error handler — returns consistent JSON error responses
app.onError((err, c) => {
  const errorMessage = err instanceof Error ? err.message : String(err)
  const stack = err instanceof Error ? err.stack : undefined

  // 获取状态码
  let status = 500
  if (err instanceof HTTPException) {
    status = err.status
  }

  if (status >= 500) {
    // 服务器错误，记录详细日志
    console.error(`[Server Error ${status}] ${c.req.method} ${c.req.path}`, errorMessage, stack)
  } else {
    // 客户端错误，记录警告日志
    console.warn(`[Client Error ${status}] ${c.req.method} ${c.req.path}`, errorMessage)
  }

  return c.json(errorResp(errorMessage), { status: status as any })
})

// 404 fallback — catches undefined routes
app.notFound((c) => {
  return c.json({ error: 'Resource not found' }, 404)
})

// 设置全局 CORS 头
// app.use('/api/*', cors({
//   origin: '*', // 允许所有来源
//   allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // 允许的 HTTP 方法
//   allowHeaders: ['Content-Type', 'Authorization'], // 允许的请求头
// }))
app.use('/api/*', cors())

// 挂载受保护路由 - 直接使用JWT中间件，让其自行处理401响应
app.use('/auth/refresh-token', (c, next) => {
  const jwtMiddleware = jwt({
    secret: c.env.JWT_SECRET,
    alg: 'HS256',
  })
  return jwtMiddleware(c, next)
})
app.use('/file/*', (c, next) => {
  const jwtMiddleware = jwt({
    secret: c.env.JWT_SECRET,
    alg: 'HS256',
  })
  return jwtMiddleware(c, next)
})
app.use('/chunk/*', (c, next) => {
  const jwtMiddleware = jwt({
    secret: c.env.JWT_SECRET,
    alg: 'HS256',
  })
  return jwtMiddleware(c, next)
})
app.use('/upload/*', (c, next) => {
  const jwtMiddleware = jwt({
    secret: c.env.JWT_SECRET,
    alg: 'HS256',
  })
  return jwtMiddleware(c, next)
})
app.use('/system/status', (c, next) => {
  const jwtMiddleware = jwt({
    secret: c.env.JWT_SECRET,
    alg: 'HS256',
  })
  return jwtMiddleware(c, next)
})
app.route('/file', file)
app.route('/chunk', chunk)
app.route('/upload', upload)

// 挂载公开路由（登录接口）
app.route('/auth', auth)
app.route('/system', system)


export default app