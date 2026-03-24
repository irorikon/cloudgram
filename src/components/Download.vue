<template>
    <div class="download-dialog">
        <h3 class="download-dialog__title">下载文件</h3>
        <div class="download-dialog__file-info">
            当前下载：{{ currentFileName }}
        </div>
        <!-- 仅使用代理下载（解决CORS问题） -->
        <n-progress 
            :percentage="progress" 
            :show-indicator="true" 
            :indicator-placement="'inside'" 
            :status="progressStatus"
            class="download-dialog__progress" />
        <div v-if="!showSaveButton" class="download-dialog__actions">
            <n-button size="medium" @click="handleCancel" class="download-dialog__btn">
                取消
            </n-button>
            <n-button type="primary" size="medium" :disabled="isDownloading" :loading="isDownloading"
                @click="startDownload" class="download-dialog__btn download-dialog__btn--confirm">
                下载
            </n-button>
        </div>
        <div v-else class="download-dialog__actions">
            <n-button type="primary" size="medium" @click="handleSave"
                class="download-dialog__btn download-dialog__btn--save">
                保存
            </n-button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';
import { NProgress, NButton, useMessage } from 'naive-ui';
import { useUserStore } from '@/store/user';
import JSZip from 'jszip'
import { getFileChunks, getFilesByParentId, getChunkProxyDownload } from '@/api/file'
import type { FileItem, FileChunk } from '@/types/file'

// 定义组件属性
interface Props {
    file: FileItem
}

const props = defineProps<Props>()

// 定义事件
interface Emits {
    (e: 'cancel'): void
}

const emit = defineEmits<Emits>()

const message = useMessage()

// 状态管理
const isDownloading = ref(false)
const progress = ref(0)
const showSaveButton = ref(false)
const currentFileName = ref(props.file.name)

// Progress 组件支持的状态: 'default' | 'info' | 'success' | 'warning' | 'error'
const progressStatus = computed(() => {
    if (progress.value === 100) return 'success'
    if (progress.value > 0) return 'info'
    return 'default'
})

// 下载控制器
let abortController: AbortController | null = null

// 下载单个分片
async function downloadChunk(chunk: FileChunk): Promise<Blob> {
    if (!abortController) {
        abortController = new AbortController()
    }

    try {
        // 使用代理下载（解决CORS问题）
        const userStore = useUserStore()
        return await getChunkProxyDownload(chunk.telegram_file_id, userStore.getToken)
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw error
        }
        throw new Error(`下载分片失败: ${(error as Error).message}`)
    }
}

// 下载单个文件
async function downloadSingleFile(file: FileItem): Promise<Blob> {
    try {
        // 获取文件分片列表
        const chunks: FileChunk[] = await getFileChunks(file.id)

        if (chunks.length === 0) {
            throw new Error('文件没有分片数据')
        }

        // 按索引排序分片
        chunks.sort((a, b) => a.chunk_index - b.chunk_index)

        const totalSize = chunks.reduce((sum, chunk) => sum + chunk.chunk_size, 0)
        let downloadedSize = 0

        // 下载所有分片
        const chunkBlobs: Blob[] = []
        for (const chunk of chunks) {
            if (abortController?.signal.aborted) {
                throw new Error('下载已取消')
            }

            const blob = await downloadChunk(chunk)
            chunkBlobs.push(blob)
            downloadedSize += blob.size

            // 更新进度 - 确保百分比为整数且不超过100
            const calculatedProgress = Math.min(Math.floor((downloadedSize / totalSize) * 100), 100)
            progress.value = calculatedProgress
            currentFileName.value = `${file.name} (${calculatedProgress}%)`
        }

        // 合并所有分片
        return new Blob(chunkBlobs)
    } catch (error) {
        if (error instanceof Error && error.message === '下载已取消') {
            throw error
        }
        throw new Error(`下载文件失败: ${(error as Error).message}`)
    }
}

// 下载文件夹中的所有文件
async function downloadFolder(folder: FileItem): Promise<Blob> {
    try {
        // 获取文件夹中的文件列表
        const files: FileItem[] = await getFilesByParentId(folder.id)

        if (files.length === 0) {
            throw new Error('文件夹为空')
        }

        const zip = new JSZip()
        let completedFiles = 0
        const totalFiles = files.length

        // 逐个下载文件并添加到ZIP
        for (const file of files) {
            if (abortController?.signal.aborted) {
                throw new Error('下载已取消')
            }

            currentFileName.value = `正在下载: ${file.name} (${completedFiles + 1}/${totalFiles})`

            if (file.is_dir) {
                // 递归处理子文件夹
                const subFolderBlob = await downloadFolder(file)
                // 直接将子文件夹的内容添加到当前ZIP中
                const subZip = new JSZip()
                await subZip.loadAsync(subFolderBlob)
                const folderName = file.name
                const folder = zip.folder(folderName)
                if (folder) {
                    for (const [fileName, fileObj] of Object.entries(subZip.files)) {
                        if (!fileObj.dir) {
                            const content = await fileObj.async('blob')
                            folder.file(fileName, content)
                        }
                    }
                }
            } else {
                // 下载单个文件
                const fileBlob = await downloadSingleFile(file)
                zip.file(file.name, fileBlob)
            }

            completedFiles++
            // 更新文件夹下载进度 - 确保百分比为整数且不超过100
            const calculatedProgress = Math.min(Math.floor((completedFiles / totalFiles) * 100), 100)
            progress.value = calculatedProgress
        }

        return await zip.generateAsync({ type: 'blob' })
    } catch (error) {
        if (error instanceof Error && error.message === '下载已取消') {
            throw error
        }
        throw new Error(`下载文件夹失败: ${(error as Error).message}`)
    }
}

// 开始下载
async function startDownload() {
    if (isDownloading.value) return

    isDownloading.value = true
    showSaveButton.value = false
    progress.value = 0
    abortController = new AbortController()

    try {
        let finalBlob: Blob

        if (props.file.is_dir) {
            // 下载文件夹
            finalBlob = await downloadFolder(props.file)
        } else {
            // 下载单个文件
            finalBlob = await downloadSingleFile(props.file)
        }

        // 下载完成
        progress.value = 100
        showSaveButton.value = true
        isDownloading.value = false

            // 存储下载的Blob用于保存
            ; (window as any).downloadedBlob = finalBlob
            ; (window as any).downloadedFileName = props.file.is_dir
                ? `${props.file.name}.zip`
                : props.file.name

    } catch (error) {
        if (error instanceof Error && error.message === '下载已取消') {
            message.info('下载已取消')
        } else {
            message.error(`下载失败: ${(error as Error).message}`)
        }

        // 重置状态
        isDownloading.value = false
        showSaveButton.value = false
        progress.value = 0
        currentFileName.value = props.file.name
        abortController = null
    }
}

// 取消下载
function handleCancel() {
    if (abortController) {
        abortController.abort()
    }
    emit('cancel')
}

// 保存文件
function handleSave() {
    const blob = (window as any).downloadedBlob
    const fileName = (window as any).downloadedFileName

    if (!blob || !fileName) {
        message.error('没有可保存的文件')
        return
    }

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    emit('cancel')
}

// 组件卸载时清理
onUnmounted(() => {
    if (abortController) {
        abortController.abort()
    }
    abortController = null
})
</script>

<style scoped>
.download-dialog {
    padding: 20px;
    min-width: 300px;
}

.download-dialog__title {
    text-align: center;
    margin-bottom: 16px;
    font-size: 18px;
    font-weight: 600;
}

.download-dialog__file-info {
    margin-bottom: 16px;
    text-align: center;
    color: var(--n-text-color);
}

/* 下载模式选择样式 */
.download-dialog__mode-select {
    display: flex;
    gap: 16px;
    margin-bottom: 16px;
    justify-content: center;
}

.download-dialog__mode-label {
    display: flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
    font-size: 14px;
    color: var(--n-text-color);
    font-size: 14px;
}

.download-dialog__mode-radio {
    width: 16px;
    height: 16px;
    cursor: pointer;
}

.download-dialog__progress {
    margin-bottom: 20px;
}

.download-dialog__actions {
    display: flex;
    justify-content: center;
    gap: 12px;
}

.download-dialog__btn {
    min-width: 80px;
}
</style>