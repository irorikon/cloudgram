<template>
  <div class="new-folder-dialog">
    <h3 class="new-folder-dialog__title">请输入目录名称</h3>
    <n-input v-model:value="folderName" ref="inputRef" placeholder="请输入目录名称" clearable :maxlength="255"
      :status="inputStatus" :feedback="errorMessage" @keydown.enter="handleConfirm" class="new-folder-dialog__input" />
    <div class="new-folder-dialog__actions">
      <n-button size="medium" @click="handleCancel" class="new-folder-dialog__btn">
        取消
      </n-button>
      <n-button type="primary" size="medium" :disabled="!isValidName" :loading="confirmLoading" @click="handleConfirm"
        class="new-folder-dialog__btn new-folder-dialog__btn--confirm">
        确认
      </n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
// 保留必要的类型导入，因为这些类型没有在自动导入中配置
import { ref, computed, onMounted, nextTick } from 'vue';
import { NInput, NButton } from 'naive-ui';
import type { InputInst } from 'naive-ui'
import type { FileItem } from '@/types/file'

// 定义组件属性
interface Props {
  existingFiles: FileItem[]
}

const props = defineProps<Props>()

// 定义事件
interface Emits {
  (e: 'confirm', folderName: string): void
  (e: 'cancel'): void
}

const emit = defineEmits<Emits>()

// 输入框引用
const inputRef = ref<InputInst | null>(null)

// 确认加载状态
const confirmLoading = ref(false)

// 文件夹名称
const folderName = ref('')

// 错误信息
const errorMessage = ref('')

// 输入框状态
const inputStatus = computed(() => {
  if (errorMessage.value) {
    return 'error'
  }
  return undefined
})

// 验证名称是否有效
const isValidName = computed(() => {
  const name = folderName.value.trim()

  // 检查是否为空
  if (name.length === 0) {
    errorMessage.value = '目录名称不能为空'
    return false
  }

  // 检查是否包含非法字符
  const invalidChars = /[<>:"/\\|?*]/
  if (invalidChars.test(name)) {
    errorMessage.value = '目录名称不能包含以下字符: <>:"/\\|?*'
    return false
  }

  // 检查是否以点或空格开头/结尾
  if (name.startsWith('.') || name.startsWith(' ') || name.endsWith(' ')) {
    errorMessage.value = '目录名称不能以点或空格开头/结尾'
    return false
  }

  // 检查是否与现有文件名重复
  const existingNames = props.existingFiles.map(file => file.name.toLowerCase())
  if (existingNames.includes(name.toLowerCase())) {
    errorMessage.value = '目录名称已存在'
    return false
  }

  // 检查是否为保留名称（Windows）
  const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9']
  if (reservedNames.includes(name.toUpperCase())) {
    errorMessage.value = '目录名称不能使用系统保留名称'
    return false
  }

  errorMessage.value = ''
  return true
})

// 处理确认
const handleConfirm = () => {
  if (!isValidName.value) {
    return
  }

  confirmLoading.value = true

  // 使用 nextTick 确保 DOM 更新完成后再触发事件
  nextTick(() => {
    emit('confirm', folderName.value.trim())
    confirmLoading.value = false
  })
}

// 处理取消
const handleCancel = () => {
  emit('cancel')
}

// 组件挂载时聚焦输入框
onMounted(() => {
  nextTick(() => {
    inputRef.value?.focus()
  })
})
</script>

<style scoped>
.new-folder-dialog {
  padding: 1.5rem;
  min-width: 300px;
  max-width: 400px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  margin: 0 auto;
}

.new-folder-dialog__title {
  margin: 0 0 1.5rem;
  font-size: 1.25rem;
  font-weight: 600;
  text-align: left;
  color: var(--text-color);
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  flex-shrink: 0;
  line-height: 1.4;
}

.new-folder-dialog__input {
  margin-bottom: 1.5rem;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  flex-shrink: 0;
}

.new-folder-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  flex-shrink: 0;
  margin-top: auto;
}

.new-folder-dialog__btn {
  min-width: 80px;
  flex-shrink: 0;
  box-sizing: border-box;
}

/* 响应式适配 */
@media (max-width: 480px) {
  .new-folder-dialog {
    min-width: 280px;
    max-width: 100%;
    padding: 1.25rem;
  }

  .new-folder-dialog__title {
    font-size: 1.125rem;
    margin-bottom: 1.25rem;
  }

  .new-folder-dialog__input {
    margin-bottom: 1.25rem;
  }

  .new-folder-dialog__actions {
    gap: 10px;
  }

  .new-folder-dialog__btn {
    min-width: 70px;
    padding: 0 16px;
  }
}

/* 确保所有子元素遵循盒模型 */
.new-folder-dialog *,
.new-folder-dialog *::before,
.new-folder-dialog *::after {
  box-sizing: inherit;
}
</style>