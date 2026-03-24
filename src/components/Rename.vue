<template>
  <div class="rename-dialog">
    <h3 class="rename-dialog__title">输入一个新名称</h3>
    <n-input
      v-model:value="newName"
      ref="inputRef"
      placeholder="请输入新名称"
      clearable
      :maxlength="255"
      @keydown.enter="handleConfirm"
      class="rename-dialog__input"
    />
    <div class="rename-dialog__actions">
      <n-button size="medium" @click="handleCancel" class="rename-dialog__btn">
        取消
      </n-button>
      <n-button
        type="primary"
        size="medium"
        :disabled="!isValidName"
        :loading="confirmLoading"
        @click="handleConfirm"
        class="rename-dialog__btn rename-dialog__btn--confirm"
      >
        确认
      </n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { NInput, NButton } from 'naive-ui';

// 定义组件属性
interface Props {
  modelValue: string
}

const props = defineProps<Props>()

// 定义事件
interface Emits {
  (e: 'confirm', newName: string): void
  (e: 'cancel'): void
}

const emit = defineEmits<Emits>()

// 输入框引用
const inputRef = ref<InstanceType<typeof NInput> | null>(null)

// 确认加载状态
const confirmLoading = ref(false)

// 新名称
const newName = ref(props.modelValue)

// 验证名称是否有效（不为空且与原名称不同）
const isValidName = computed(() => {
  const name = newName.value.trim()
  return name.length > 0 && name !== props.modelValue
})

// 处理确认
const handleConfirm = () => {
  if (!isValidName.value) return

  confirmLoading.value = true
  const trimmedName = newName.value.trim()

  // 触发确认事件
  emit('confirm', trimmedName)
}

// 处理取消
const handleCancel = () => {
  emit('cancel')
}

// 聚焦到输入框
onMounted(() => {
  nextTick(() => {
    if (inputRef.value?.focus) {
      inputRef.value.focus()
    }
  })
})

// 监听外部值变化
watch(() => props.modelValue, (newVal) => {
  newName.value = newVal
})
</script>

<style scoped>
.rename-dialog {
  display: flex;
  flex-direction: column;
  gap: var(--gap-xlarge);
  padding: 1.5rem;
  min-width: 280px;
  max-width: 400px;
  width: 100%;
  box-sizing: border-box;
}

.rename-dialog__title {
  margin: 0;
  font-size: var(--text-size-large);
  font-weight: 600;
  color: var(--n-text-color-1);
  text-align: center;
  line-height: 1.4;
}

.rename-dialog__input :deep(input) {
  text-align: left;
}

.rename-dialog__actions {
  display: flex;
  gap: var(--gap-large);
  justify-content: flex-end;
  margin-top: 0;
}

.rename-dialog__btn {
  min-width: 80px;
  padding: 8px 16px;
}

/* 小屏幕设备优化 */
@media (max-width: 768px) {
  .rename-dialog {
    padding: 1.25rem;
    min-width: 260px;
    max-width: 320px;
    gap: var(--gap-large);
  }
  
  .rename-dialog__title {
    font-size: var(--text-size-medium);
  }
  
  .rename-dialog__actions {
    gap: var(--gap-medium);
    margin-top: 0;
  }
  
  .rename-dialog__btn {
    min-width: 70px;
    padding: 6px 12px;
  }
}

/* 大屏幕设备优化 */
@media (min-width: 1200px) {
  .rename-dialog {
    padding: 2rem;
    min-width: 300px;
    max-width: 450px;
    gap: calc(var(--gap-xlarge) * 1.5);
  }
  
  .rename-dialog__title {
    font-size: var(--text-size-xlarge);
  }
  
  .rename-dialog__actions {
    gap: var(--gap-xlarge);
    margin-top: 0;
  }
  
  .rename-dialog__btn {
    min-width: 90px;
    padding: 10px 20px;
  }
}
</style>