// src/utils/request.ts
import { useUserStoreWithOut } from '@/store/user'
import router from '@/router'
import type { RequestConfig, ApiResponse, TokenGetter } from '@/types/request'
import { RequestError } from '@/types/request'
import { createDiscreteApi } from 'naive-ui'
const createRequest = async <T = any>(
  config: RequestConfig,
  getToken?: TokenGetter
): Promise<T> => {
  const defaultTokenGetter = () => {
    try {
      const userStore = useUserStoreWithOut()
      return userStore.token
    } catch {
      return undefined
    }
  }
  const tokenGetter = getToken || defaultTokenGetter

  const url = new URL(config.url, window.location.origin)
  if (config.params) {
    Object.keys(config.params).forEach(key => {
      const val = config.params![key]
      if (val !== undefined && val !== null) {
        url.searchParams.append(key, String(val))
      }
    })
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...config.headers
  }

  if (!config.skipAuth) {
    const token = tokenGetter()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
  }

  let body: BodyInit | null = null
  if (config.data) {
    if (config.isFormData) {
      body = config.data instanceof FormData ? config.data : (() => {
        const fd = new FormData()
        Object.keys(config.data).forEach(key => fd.append(key, config.data[key]))
        return fd
      })()
      delete headers['Content-Type']
    } else {
      body = JSON.stringify(config.data)
    }
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), config.timeout || 10000)

  try {
    const response = await fetch(url.toString(), {
      method: (config.method || 'GET').toUpperCase(),
      headers,
      body,
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    // HTTP 状态码错误
    if (!response.ok) {
      if (response.status === 401) {
        handleAuthError()
        throw new RequestError(401, '登录已过期，请重新登录')
      }
      throw new RequestError(response.status, `HTTP Error: ${response.status}`)
    }

    const contentType = response.headers.get('content-type')
    if (response.status === 204 || !contentType?.includes('application/json')) {
      return {} as T
    }

    const result: ApiResponse<T> = await response.json()

    // 仅当存在 code 字段时才进行业务码检查（code: 0 表示成功）
    if (result.code !== undefined) {
      if (result.code !== 0) {
        if (result.code === 401) {
          handleAuthError()
          throw new RequestError(401, result.message || '登录已过期')
        }
        throw new RequestError(result.code, result.message || '请求失败')
      }
    }

    // 智能返回：有 Data 字段返回 Data，否则返回整个响应
    return (result.data !== undefined ? result.data : result) as T
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof RequestError) throw error
    if (error instanceof Error && error.name === 'AbortError') {
      throw new RequestError(504, '请求超时')
    }
    throw new RequestError(500, error instanceof Error ? error.message : '网络错误')
  }
}

const handleAuthError = () => {
  try {
    const userStore = useUserStoreWithOut()
    userStore.clearUser()
    router.replace('/login')
  } catch {
    console.warn('Failed to clear user store')
  }
}

export const request = {
  get<T = any>(url: string, params?: Record<string, any>, options?: Partial<RequestConfig>) {
    return createRequest<T>({ url, params, method: 'GET', ...options })
  },
  post<T = any>(url: string, data?: any, options?: Partial<RequestConfig>) {
    return createRequest<T>({ url, data, method: 'POST', ...options })
  },
  put<T = any>(url: string, data?: any, options?: Partial<RequestConfig>) {
    return createRequest<T>({ url, data, method: 'PUT', ...options })
  },
  delete<T = any>(url: string, params?: Record<string, any>, options?: Partial<RequestConfig>) {
    return createRequest<T>({ url, params, method: 'DELETE', ...options })
  },
  patch<T = any>(url: string, data?: any, options?: Partial<RequestConfig>) {
    return createRequest<T>({ url, data, method: 'PATCH', ...options })
  },
  upload<T = any>(url: string, formData: FormData, options?: Partial<RequestConfig>) {
    return createRequest<T>({ url, data: formData, method: 'POST', isFormData: true, ...options })
  }
}