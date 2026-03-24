import { request } from '@/utils/request'
import { RequestError } from '@/types/request'

/**
 * 上传文件分片 - 带重试机制
 */
export async function uploadChunk(uploadId: string, totalChunks: number, chunkIndex: number, chunkSize: number, file: File) {
  const formData = new FormData()
  formData.append('uploadId', uploadId)
  formData.append('totalChunks', totalChunks.toString())
  formData.append('chunkIndex', chunkIndex.toString())
  formData.append('chunkSize', chunkSize.toString())
  formData.append('file', file, file.name)

  // 增加超时时间到 120 秒，适应大文件上传和网络不稳定情况
  // 添加重试机制，最多重试3次
  let lastError: any = null;
  
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await request.upload('/api/upload/chunk', formData, { timeout: 120000 })
    } catch (error) {
      lastError = error;
      console.warn(`Upload chunk attempt ${attempt} failed:`, error);
      
      // 如果不是最后一次尝试，检查是否是可重试的错误
      if (attempt < 3) {
        let errorMessage = '';
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (error instanceof RequestError) {
          errorMessage = error.message;
        } else if (typeof error === 'object' && error !== null) {
          errorMessage = JSON.stringify(error);
        } else {
          errorMessage = String(error);
        }
        
        // 检查是否是网络连接相关错误
        if (errorMessage.includes('Network connection lost') || 
            errorMessage.includes('请求超时') || 
            errorMessage.includes('network error') ||
            errorMessage.includes('timeout') ||
            errorMessage.includes('Timeout') ||
            errorMessage.includes('503') ||
            errorMessage.includes('504')) {
          // 指数退避：1秒、2秒、4秒
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
          continue;
        }
      }
      
      // 其他错误或最后一次尝试失败，直接抛出
      throw error;
    }
  }
  
  // 如果所有重试都失败了，抛出最后一次的错误
  throw lastError;
}

/**
 * 合并文件
 */
export function mergeFile(uploadId: string, filename: string, parentId: string | null, size: number, mimeType: string, uploadedChunks: number) {
  return request.post('/api/upload/merge', {
    uploadId,
    filename,
    parentId,
    size,
    mimeType,
    uploadedChunks
  })
}

/**
 * 清理上传会话
 */
export function cleanupUploadSession(uploadId: string) {
  return request.post('/api/upload/cleanup', { uploadId })
}