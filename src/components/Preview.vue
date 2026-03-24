<template>
  <div class="preview-container">
    <n-modal
      v-model:show="internalShow"
      :mask-closable="true"
      preset="card"
      style="width: 80%; max-width: 800px; height: 80vh;"
      :title="file?.name || '文件预览'"
      @close="handleClose"
    >
      <div class="modal-content" v-if="file">
        <!-- 图片预览 -->
        <div v-if="isImage" class="image-preview">
          <!-- 移除一层容器，直接在父容器中使用 flex -->
          <n-image
            v-if="previewUrl"
            :src="previewUrl"
            :alt="file.name"
            object-fit="contain"
            :lazy="false"
            :preview-disabled="false"
            @load="onImageLoad"
            @error="onImageError"
            class="preview-image"
            style="max-width: 100%; max-height: 100%;"
          />
          <div v-else-if="loading" class="loading-container">
            <n-spin size="large" description="正在加载文件..." />
          </div>
          <div v-else-if="error" class="error-container">
            <n-alert type="error" title="预览失败">
              {{ error }}
            </n-alert>
          </div>
        </div>
        
        <!-- 非图片文件提示 -->
        <div v-else class="non-image-container">
          <n-alert type="info" title="文件类型不支持预览">
            当前仅支持图片文件预览。文件类型：{{ file.mime_type || '未知' }}
          </n-alert>
        </div>
      </div>
      
      <div v-else class="loading-container">
        <n-spin size="large" description="正在获取文件信息..." />
      </div>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import { NModal, NImage, NSpin, NAlert } from 'naive-ui';
import { useUserStore } from '@/store/user';
import { getFileById, getFileChunks, getChunkProxyDownload } from '@/api/file'
import type { FileItem, FileChunk } from '@/types/file'

// Props
const props = defineProps({
  fileId: {
    type: String,
    default: ''
  }
})

// Emits
const emit = defineEmits<{
  (e: 'close'): void
}>()

// State
const internalShow = ref(false)
const file = ref<FileItem | null>(null)
const chunks = ref<FileChunk[]>([])
const previewUrl = ref<string | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

// Computed
const isImage = computed(() => {
  if (!file.value) return false
  const mimeType = file.value.mime_type?.toLowerCase() || ''
  return mimeType.startsWith('image/')
})

// useUserStore 已自动导入
const userStore = useUserStore()
const token = computed(() => userStore.token)

// Methods
const show = () => {
  if (props.fileId) {
    internalShow.value = true
  }
}

const hide = () => {
  internalShow.value = false
}

const handleClose = () => {
  hide()
  emit('close')
  cleanup()
}

const cleanup = () => {
  file.value = null
  chunks.value = []
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = null
  }
  loading.value = false
  error.value = null
}

const onImageLoad = () => {
  loading.value = false
}

const onImageError = (err: Event) => {
  loading.value = false
  error.value = '图片加载失败，请稍后重试'
}

const fetchFileAndChunks = async () => {
  try {
    // 获取文件详情 - API already returns data directly
    const fileResponse = await getFileById(props.fileId)
    file.value = fileResponse
    
    // 检查是否为图片
    if (!isImage.value) {
      loading.value = false
      return
    }
    
    // 获取分片列表 - API already returns data directly
    const chunksResponse = await getFileChunks(props.fileId)
    chunks.value = chunksResponse
    
    if (chunks.value.length === 0) {
      error.value = '未找到文件分片数据'
      return
    }
    
    // 按chunk_index排序确保顺序正确
    chunks.value.sort((a, b) => a.chunk_index - b.chunk_index)
    
    // 下载并合并分片
    await downloadAndMergeChunks()
  } catch (err) {
    console.error('Failed to fetch file and chunks:', err)
    error.value = '获取文件信息失败，请稍后重试'
    loading.value = false
  }
}

const downloadAndMergeChunks = async () => {
  try {
    loading.value = true
    error.value = null
    
    // 并发下载所有分片
    const chunkPromises = chunks.value.map(chunk => 
      getChunkProxyDownload(chunk.telegram_file_id, token.value)
    )
    
    const chunkBlobs = await Promise.all(chunkPromises)
    
    // 合并所有分片
    const combinedBlob = new Blob(chunkBlobs, { type: file.value?.mime_type || 'application/octet-stream' })
    
    // 创建预览URL
    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value)
    }
    previewUrl.value = URL.createObjectURL(combinedBlob)
    
    loading.value = false
  } catch (err) {
    console.error('Failed to download and merge chunks:', err)
    error.value = '文件下载失败，请稍后重试'
    loading.value = false
  }
}

// Watchers
watch(() => props.fileId, (newFileId) => {
  if (newFileId && internalShow.value) {
    cleanup()
    fetchFileAndChunks()
  }
})

// Watch internalShow to trigger data loading
watch(internalShow, (newVal) => {
  if (newVal && props.fileId) {
    cleanup()
    fetchFileAndChunks()
  } else if (!newVal) {
    cleanup()
  }
})

// Cleanup on unmount
onBeforeUnmount(() => {
  cleanup()
})

// Expose methods for parent component to control
defineExpose({
  show,
  hide
})
</script>
<style scoped>
.preview-container {
  position: relative;
}

/* 模态框内容容器 */
.modal-content {
  width: 100%;
  height: calc(80vh - 120px); /* 预留标题和按钮空间 */
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 图片预览容器 */
.image-preview {
  width: 100%;
  height: 100%;
  max-height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}

/* 确保 n-image 组件内部图片被约束 */
:deep(.n-image) {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

:deep(.n-image img) {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  display: block;
}

.loading-container,
.error-container,
.non-image-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  padding: 20px;
}

:deep(.n-alert) {
  width: 100%;
  max-width: 100%;
}
</style>