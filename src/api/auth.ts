// src/api/auth.ts
import { request } from '@/utils/request'
import { useUserStore } from '@/store/user'
import type { LoginParams, LoginResponse } from '@/types/login'

/**
 * 用户登录
 * @param params 登录参数
 * @returns Promise<LoginResponse>
 */
export const login = async (params: LoginParams): Promise<LoginResponse> => {
  try {
    // 对密码进行 base64 编码
    const base64Password = btoa(params.password)

    console.debug('登录请求参数:', {
      username: params.username,
      password: '***' // 不打印真实密码
    })

    // 构建请求体
    const requestBody = {
      username: params.username,
      password: base64Password
    }

    // 调用登录接口
    const response = await request.post<LoginResponse>('/api/auth/login', requestBody, {
      skipAuth: true
    })

    console.debug('登录成功，响应数据:', {
      hasToken: !!response.token,
      tokenLength: response.token?.length,
      username: response.user?.username,
      expiresAt: response.expiresAt
    })

    // 登录成功后自动存储用户信息
    if (response.token && response.user?.username) {
      const userStore = useUserStore()
      userStore.setUsername(response.user.username)
      userStore.setToken(response.token)

      console.debug('用户信息已存储到 store')
    } else {
      console.warn('响应中缺少必要字段:', response)
    }

    return response
  } catch (error: any) {
    console.error('登录失败:', error)

    // 登录失败时清除可能的用户信息
    const userStore = useUserStore()
    userStore.clearUser()

    // 重新抛出错误
    throw error
  }
}

/**
 * 刷新 token
 */
export const refreshToken = async () => {
  const response = await request.get('/api/auth/refresh-token')
  if (response.token && response.user?.username) {
    const userStore = useUserStore()
    userStore.setUsername(response.user.username)
    userStore.setToken(response.token)

    console.debug('用户信息已存储到 store')
  } else {
    console.warn('响应中缺少必要字段:', response)
  }
}