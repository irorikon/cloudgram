// src/types/login.ts
// 定义登录参数接口
export interface LoginParams {
  username: string
  password: string
}

// 定义 Hono 登录响应接口
export interface LoginResponse {
  token: string
  tokenType: string
  expiresIn: number
  expiresAt: string
  user: {
    username: string
  }
}

// 定义用户信息接口
export interface UserInfo {
  username: string
}
