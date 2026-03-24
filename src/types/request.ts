// src/types/request.ts

/** 请求配置接口 */
export interface RequestConfig {
  url: string
  params?: Record<string, any>
  data?: any
  headers?: Record<string, string>
  isFormData?: boolean
  timeout?: number
  skipAuth?: boolean
  method?: string
}

/** 后端响应结构 */
export interface ApiResponse<T = any> {
  code?: number
  message?: string
  data?: T
}

/** Token 获取器类型 */
export type TokenGetter = () => string | undefined

/** 请求错误类 */
export class RequestError extends Error {
  code: number
  constructor(code: number, message: string) {
    super(message)
    this.name = 'RequestError'
    this.code = code
  }
}