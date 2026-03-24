import { request } from '@/utils/request'

/**
 * 获取指定父目录下的文件列表
 * @param parentId 父目录ID，null表示根目录
 * @returns 文件列表
 */
export function getFilesByParentId(parentId: string | null = null) {
  return request.post('/api/file/list', { parentId })
}

/**
 * 获取指定父目录下的文件夹列表
 * @param parentId 父目录ID，null表示根目录
 * @returns 文件列表
 */
export function getFoldersByParentId(parentId: string | null = null) {
  return request.post('/api/file/dir', { parentId })
}

/**
 * 根据文件ID获取文件详情
 * @param fileId 文件ID
 * @returns 文件详情
 */
export function getFileById(fileId: string) {
  return request.get(`/api/file/detail/${fileId}`)
}

/**
 * 重命名文件
 * @param fileId 文件ID
 * @param newName 新文件名
 * @returns 更新后的文件信息
 */
export function renameFile(fileId: string, newName: string) {
  return request.post('/api/file/update', {
    active: 'rename',
    id: fileId,
    newName: newName
  })
}

/**
 * 移动文件
 * @param fileId 文件ID
 * @param newParentId 新的父目录ID
 * @returns 移动后的文件信息
 */
export function moveFile(fileId: string, newParentId: string) {
  return request.post('/api/file/update', {
    active: 'move',
    id: fileId,
    parentId: newParentId
  })
}

/**
 * 创建文件夹
 * @param name 文件夹名称
 * @param parentId 父目录ID，null表示根目录
 * @returns 创建的文件夹信息
 */
export function createFile(name: string, parentId: string | null = null) {
  return request.post('/api/file/create', {
    name,
    parentId,
    isDir: true
  })
}

/**
 * 删除文件
 * @param fileId 文件ID
 * @param recursive 是否递归删除（对于文件夹）
 * @returns 删除结果
 */
export function deleteFile(fileId: string, recursive: boolean = false) {
  return request.post('/api/file/delete', {
    id: fileId,
    recursive
  })
}

/**
 * 删除 Telegram 文件分片
 * @param fileChunks 文件分片数据数组
 * @returns 成功删除的分片ID数组
 */
export function deleteFileChunks(channelId: string, fileChunks: any[]) {
  return request.post('/api/chunk/delete', {
    channelId,
    fileChunks
  })
}

/**
 * 检查文件或目录是否已存在
 * @param name 文件或目录名称
 * @param parentId 父目录ID，null表示根目录
 * @returns 是否存在
 */
export function exists(name: string, parentId: string | null = null) {
  return request.post('/api/file/exists', { fileName: name, parentId })
}

/**
 * 获取文件分片列表
 * @param fileId 文件ID
 * @returns 文件分片列表
 */
export function getFileChunks(fileId: string) {
  return request.post('/api/chunk/list', { id: fileId })
}

/**
 * 获取分片下载URL
 * @param telegramFileID 分片telegramFileID
 * @returns 下载URL
 */
export function getChunkDownloadUrl(telegramFileID: string) {
  return request.get(`/api/chunk/query/${telegramFileID}`)
}

/**
 * 代理下载分片（解决CORS问题）
 * @param telegramFileID 分片telegramFileID
 * @returns Blob 数据
 */
export function getChunkProxyDownload(telegramFileID: string, token: string) {
  return fetch(`/api/chunk/proxy/${telegramFileID}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token || ''}`
    }
  }).then(response => {
    if (!response.ok) {
      throw new Error(`代理下载失败: ${response.status} ${response.statusText}`)
    }
    return response.blob()
  })
}