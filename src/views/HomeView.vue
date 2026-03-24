<template>
  <div class="layout">
    <div class="content-container">
      <Header />
      <!-- 后续组件将在这里添加 -->
      <Breadcrumb class="component-gap" @item-click="handleListFileItemClick" />
      <FileList :files="fileList" :loading="loading" class="component-gap" @folder-click="handleListFileItemClick"
        @file-operation="handleFileOperation" @file-click="handleFileClick" />
      <n-back-top :right="100" />
    </div>
    <Footer />

    <!-- 统一的操作对话框 -->
    <n-modal v-model:show="showOperationModal" preset="card" :mask-closable="false" :closable="false"
      :close-on-esc="false" @close="handleOperationCancel" :style="operationModalStyle">
      <template v-if="currentOperation === 'rename'">
        <Rename :model-value="currentOperationFile?.name || ''" @confirm="handleRenameConfirm"
          @cancel="handleOperationCancel" />
      </template>
      <template v-else-if="currentOperation === 'move'">
        <MoveFile :visible="showOperationModal" @confirm="handleMoveConfirm" @cancel="handleOperationCancel" />
      </template>
      <template v-else-if="currentOperation === 'new-folder'">
        <NewFolder :existing-files="fileList" @confirm="handleNewFolderConfirm" @cancel="handleOperationCancel" />
      </template>
      <template v-else-if="currentOperation === 'delete'">
        <DeleteFile :file="currentOperationFile!" @confirm="handleDeleteConfirm" @cancel="handleOperationCancel" />
      </template>
      <template v-else-if="currentOperation === 'download'">
        <Download :file="currentOperationFile!" @cancel="handleOperationCancel" />
      </template>
      <template v-else-if="currentOperation === 'upload'">
        <Upload @refresh-filelist="handleUploadRefreshFilelist" @cancel="handleOperationCancel" />
      </template>
    </n-modal>

    <!-- 独立的预览组件 -->
    <Preview ref="previewRef" :file-id="previewFileId" @close="handlePreviewClose" />
  </div>
</template>
<script setup lang="ts">
import Header from '../components/Header.vue'
import Breadcrumb from '../components/Breadcrumb.vue'
import Footer from '../components/Footer.vue'
import FileList from '../components/FileList.vue'
import Rename from '../components/Rename.vue'
import MoveFile from '../components/MoveFile.vue'
import NewFolder from '../components/NewFolder.vue'
import DeleteFile from '../components/DeleteFile.vue'
import Download from '../components/Download.vue'
import Upload from '../components/Upload.vue'
import Preview from '../components/Preview.vue'

import type { FileItem, FileChunk } from '@/types/file'
import { useUserStore } from '@/store/user'
import { getFilesByParentId, renameFile, moveFile, createFile, deleteFile, deleteFileChunks, getFileChunks } from '@/api/file'
import { refreshToken } from '@/api/auth'
import { getOneChannel } from '@/api/channel'
import { useBreadcrumbStore } from '@/store/breadcrumb'
import { useChannelStore } from '@/store/channel'
import { onMounted, ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useMessage, useLoadingBar, NModal } from 'naive-ui'

// 操作类型枚举
type OperationType = 'rename' | 'move' | 'download' | 'delete' | 'new-folder' | 'refresh' | 'upload' | null

// 获取用户 store 和路由
const userStore = useUserStore()
const router = useRouter()
const route = useRoute()  // 添加 route 引用
const breadcrumbStore = useBreadcrumbStore()
const message = useMessage()
const loadingBar = useLoadingBar();
const channelStore = useChannelStore()

// 判断是否来自登录页面
const isFromLogin = computed(() => {
  return route.query.from === 'login'
})

// 文件列表和加载状态
const fileList = ref<FileItem[]>([])
const loading = ref(false)

// 统一的操作状态
const showOperationModal = ref(false)
const currentOperation = ref<OperationType>(null)
const currentOperationFile = ref<FileItem | null>(null)
// 删除 Telegram 进度相关
const deleteProgress = ref(0)
const totalChunks = ref(0)
const processedChunks = ref(0)

// 预览相关状态
const previewRef = ref<InstanceType<typeof Preview> | null>(null)
const previewFileId = ref('')

// 模态框样式
const operationModalStyle = {
  top: '-20vh',
  transform: 'translateY(0)',
  width: '480px',
  minWidth: '300px',
  maxWidth: '75vw'
}

// 组件挂载时检查 token
onMounted(() => {
  // 如果来自登录页面，可以在这里执行特定的逻辑
  if (!isFromLogin.value) {
    // 检查用户 token 是否存在
    if (!userStore.getToken) {
      // 如果 token 不存在，重定向到登录页面
      router.replace('/login')
    } else if (userStore.getKeepAlive) {
      // 刷新 Token
      refreshToken()
      loadFiles(null)
    }
  } else {
    loadFiles(null)
  }
})

const loadingStatus = (status: boolean) => {
  if (status) {
    loading.value = true
    loadingBar.start();
  } else {
    loading.value = false
    loadingBar.finish();
  }
}

// 处理获取文件列表事件
const handleListFileItemClick = async (item: any) => {
  try {
    loadingStatus(true)
    // 根据面包屑项的ID获取对应的文件列表
    // 如果是根目录（id为空字符串），传入null
    const parentId = item.id === '' ? null : item.id
    await loadFiles(parentId)
  } catch (error) {
    console.error('Failed to load files:', error)
  } finally {
    loadingStatus(false)
  }
}

const refreshFileList = async () => {
  const refreshTarget = breadcrumbStore.lastCrumbTypeDir()
  try {
    loadingStatus(true)
    await loadFilesWithoutChannel(refreshTarget?.id)
  } catch (error) {
    console.error('Failed to load files:', error)
  } finally {
    loadingStatus(false)
  }
}

const loadFiles = async (parentId: string | null = null) => {
  loadFilesWithoutChannel(parentId)
  loadChannels()
}

// 加载文件列表的通用方法
const loadFilesWithoutChannel = async (parentId: string | null = null) => {
  try {
    // request.ts 在成功时直接返回 data 字段的数据（即 FileItem[]）
    const files = await getFilesByParentId(parentId)
    fileList.value = files || []
  } catch (error) {
    console.error('API request failed:', error)
    fileList.value = []
  }
}

// 加载可用的 Channel
const loadChannels = async () => {
  const channel = await getOneChannel()
  channelStore.setChannel(channel.channel_id, channel.name, channel.message_id, channel.limited)
}

// 处理上传完成事件
const handleUploadRefreshFilelist = () => {
  // 上传完成后刷新当前文件列表
  refreshFileList()
}

// 处理文件点击（用于预览）
const handleFileClick = (file: FileItem) => {
  if (!file.is_dir) {
    // 检查是否为图片文件
    const mimeType = file.mime_type?.toLowerCase() || ''
    if (mimeType.startsWith('image/')) {
      previewFileId.value = file.id
      previewRef.value?.show()
    } else {
      // 对于非图片文件，可以触发下载或其他操作
      message.info('当前仅支持图片文件预览')
    }
  }
}

// 处理预览关闭
const handlePreviewClose = () => {
  previewFileId.value = ''
}

// 统一的文件操作处理函数
const handleFileOperation = (operation: string, file: FileItem | null) => {
  // 验证操作类型
  const validOperations: OperationType[] = ['rename', 'move', 'download', 'delete', 'new-folder', 'refresh', 'upload'];
  if (!validOperations.includes(operation as OperationType)) {
    console.warn('Unknown operation:', operation);
    return;
  }
  if (operation === 'refresh') {
    refreshFileList();
    return;
  }

  // 处理删除操作 - 现在只接受单个文件
  if (operation === 'delete') {
    if (!file) {
      console.warn('Delete operation called without valid file');
      return;
    }
    currentOperationFile.value = file;
  } else {
    currentOperationFile.value = file;
  }

  currentOperation.value = operation as OperationType;
  showOperationModal.value = true;
}

// 处理重命名确认
const handleRenameConfirm = async (newName: string) => {
  if (!currentOperationFile.value) {
    handleOperationCancel()
    return
  }

  try {
    loadingStatus(true)
    showOperationModal.value = false

    // 调用重命名API
    const updatedFile = await renameFile(currentOperationFile.value.id, newName)

    // 更新文件列表
    const index = fileList.value.findIndex(f => f.id === currentOperationFile.value?.id)
    if (index !== -1) {
      fileList.value[index] = updatedFile
    }

    message.success('重命名成功')
  } catch (error) {
    console.error('重命名失败:', error)
    message.error('重命名失败，请稍后重试')
  } finally {
    loadingStatus(false)
    currentOperationFile.value = null
    currentOperation.value = null
  }
}

// 处理移动文件确认
const handleMoveConfirm = async (newParentId: string) => {
  if (!currentOperationFile.value) {
    handleOperationCancel()
    return
  }

  try {
    loadingStatus(true)
    showOperationModal.value = false

    // 调用移动文件API
    const updatedFile = await moveFile(currentOperationFile.value.id, newParentId)

    // 重新加载当前目录的文件列表
    const lastCrumb = breadcrumbStore.lastCrumb()
    const currentParentId = lastCrumb?.id || null
    await loadFilesWithoutChannel(currentParentId)

    message.success('移动文件成功')
  } catch (error) {
    console.error('移动文件失败:', error)
    message.error('移动文件失败，请稍后重试')
  } finally {
    loadingStatus(false)
    currentOperationFile.value = null
    currentOperation.value = null
  }
}

// 处理新建文件夹确认
const handleNewFolderConfirm = async (folderName: string) => {
  try {
    loadingStatus(true)
    showOperationModal.value = false

    // 获取当前父目录ID
    const lastCrumb = breadcrumbStore.lastCrumbTypeDir()
    const parentId = lastCrumb?.id || null

    // 调用创建文件夹API
    const newFolder = await createFile(folderName, parentId)

    // 将新文件夹添加到文件列表，按目录在前、文件在后的顺序，且按名称排序
    fileList.value.push(newFolder)

    // 重新排序文件列表：目录在前，文件在后，各自按名称排序（与数据库 ORDER BY is_dir DESC, name ASC 保持一致）
    fileList.value.sort((a, b) => {
      // 如果一个是目录一个是文件，目录排在前面
      if (a.is_dir && !b.is_dir) {
        return -1
      }
      if (!a.is_dir && b.is_dir) {
        return 1
      }
      // 如果都是目录或都是文件，按名称排序（使用en locale匹配数据库行为）
      return a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });
    })

    message.success('新建文件夹成功')
  } catch (error) {
    console.error('新建文件夹失败:', error)
    message.error('新建文件夹失败，请稍后重试')
  } finally {
    loadingStatus(false)
    currentOperationFile.value = null
    currentOperation.value = null
  }
}

// 处理删除确认
const handleDeleteConfirm = async (deleteFromTelegram: boolean) => {
  if (!currentOperationFile.value) {
    handleOperationCancel()
    return
  }

  try {
    loadingStatus(true)
    showOperationModal.value = false

    const fileToDelete = currentOperationFile.value

    // 如果需要删除 Telegram 信息，先获取分片并删除
    if (deleteFromTelegram) {
      // 获取文件分片
      const chunks = await getFileChunks(fileToDelete.id)
      if (chunks.length > 0) {
        // 初始化进度
        totalChunks.value = chunks.length
        processedChunks.value = 0
        deleteProgress.value = 0

        // 分批删除分片（避免一次性请求过多）
        const batchSize = 20
        const batches = []
        for (let i = 0; i < chunks.length; i += batchSize) {
          batches.push(chunks.slice(i, i + batchSize))
        }

        // 逐批删除
        for (const batch of batches) {
          try {
            // 如果分片创建时间超过 48 小时，直接跳过
            const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
            const validChunks = batch.filter((chunk: FileChunk) => {
              const chunkCreatedAt = new Date(chunk.created_at);
              return chunkCreatedAt >= fortyEightHoursAgo;
            });

            // 如果没有有效的分片需要删除，直接跳过
            if (validChunks.length === 0) {
              processedChunks.value += batch.length;
              deleteProgress.value = Math.round((processedChunks.value / totalChunks.value) * 100);
              continue;
            }

            // 从 channel store 获取 channelId
            const channel = channelStore.getChannel;
            if (!channelStore.hasChannel || typeof channel !== 'object' || !('channelId' in channel)) {
              throw new Error('Channel not available');
            }
            const channelId = channel.channelId;
            await deleteFileChunks(channelId, validChunks)
            processedChunks.value += batch.length
            deleteProgress.value = Math.round((processedChunks.value / totalChunks.value) * 100)

            // 显示进度消息
            message.info(`正在删除 Telegram 文件... ${deleteProgress.value}%`)
          } catch (error) {
            console.error('Failed to delete chunk batch:', error)
            // 继续处理下一批，不中断整个删除过程
          }
        }
      }
    }

    // 删除文件或文件夹
    const recursive = fileToDelete.is_dir
    await deleteFile(fileToDelete.id, recursive)

    message.success('删除文件成功')

    // 重新加载当前目录的文件列表
    const lastCrumb = breadcrumbStore.lastCrumbTypeDir()
    const currentParentId = lastCrumb?.id || null
    await loadFilesWithoutChannel(currentParentId)

  } catch (error) {
    console.error('删除文件失败:', error)
    message.error('删除文件失败，请稍后重试')
  } finally {
    loadingStatus(false)
    currentOperationFile.value = null
    currentOperation.value = null
    // 重置进度
    deleteProgress.value = 0
    totalChunks.value = 0
    processedChunks.value = 0
  }
}

// 处理操作取消
const handleOperationCancel = () => {
  showOperationModal.value = false
  currentOperationFile.value = null
  currentOperation.value = null
  // 重置进度
  deleteProgress.value = 0
  totalChunks.value = 0
  processedChunks.value = 0
}
</script>

<style scoped>
.layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.content-container {
  flex: 1;
  width: 100%;
  min-width: 800px;
  max-width: 50%;
  margin: 0 auto;
  padding: 0 16px;
}

.component-gap {
  margin-bottom: 1rem;
}

/* 平板设备优化 */
@media (max-width: 768px) {
  .content-container {
    min-width: auto;
    max-width: 80%;
    padding: 0 12px;
  }

  .component-gap {
    margin-bottom: 0.875rem;
  }
}

/* 手机设备优化 */
@media (max-width: 480px) {
  .content-container {
    min-width: auto;
    max-width: 100%;
    padding: 0;
  }

  .component-gap {
    margin-bottom: 0.75rem;
  }
}

/* 超小屏幕优化 */
@media (max-width: 375px) {
  .content-container {
    padding: 0;
  }

  .component-gap {
    margin-bottom: 0.625rem;
  }
}
</style>