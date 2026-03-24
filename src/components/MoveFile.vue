<template>
  <div class="move-file-container">
    <h3 class="move-file-title">选择目标目录</h3>
    <n-tree
      v-model:selected-keys="selectedKeys"
      v-model:expanded-keys="expandedKeys"
      :data="treeData"
      @load="loadChildren"
      lazy
      :on-update:selected-keys="handleSelectionChange"
      block-line
      expand-on-click
      selectable
      :render-label="renderLabel"
      :node-props="getNodeProps"
    />
    <div class="move-file-actions">
      <n-button @click="handleCancel" size="medium">取消</n-button>
      <n-button 
        type="primary" 
        @click="handleConfirm" 
        :disabled="selectedKeys.length === 0"
        size="medium"
      >
        确定
      </n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, h } from 'vue';
import { NTree, NButton, NIcon, useMessage } from 'naive-ui';
import { Folder } from '@vicons/ionicons5'
import { getFoldersByParentId } from '@/api/file'
import type { FileItem } from '@/types/file'

// 定义组件属性
interface Props {
  visible?: boolean
}

const props = defineProps<Props>()

// 定义事件
interface Emits {
  (e: 'update:visible', visible: boolean): void
  (e: 'confirm', targetDirId: string): void
  (e: 'cancel'): void
}

const emit = defineEmits<Emits>()

// 状态管理
const message = useMessage()
const treeData = ref<any[]>([])
const selectedKeys = ref<string[]>([])
const expandedKeys = ref<string[]>([])

// 获取根目录数据
const fetchRootDirectories = async () => {
  try {
    // 根目录默认展开，加载其子目录
    const folders: FileItem[] = await getFoldersByParentId(null)
    
    // 为每个文件夹创建树节点
    const children = folders.map((folder: FileItem) => ({
      key: folder.id,
      title: folder.name,
      isLeaf: false,
      children: undefined // lazy loading
    }))
    
    treeData.value = [{
      key: '',
      title: '根目录',
      isLeaf: false,
      children: children
    }]
    
    // 默认展开根目录
    expandedKeys.value = ['']
  } catch (error) {
    message.error('获取目录列表失败')
    console.error('Failed to fetch root directories:', error)
  }
}

// 加载子目录（懒加载）
const loadChildren = async (node: any) => {
  if (node.key === '') {
    // 根目录已经在初始化时加载了子目录
    return node.children || []
  }
  
  try {
    const folders: FileItem[] = await getFoldersByParentId(node.key)
    if (!Array.isArray(folders) || folders.length === 0) {
      node.isLeaf = true
      return []
    }
    return folders.map((folder: FileItem) => ({
      key: folder.id,
      title: folder.name,
      isLeaf: false,
      children: undefined // 支持进一步的懒加载
    }))
  } catch (error) {
    message.error('获取子目录失败')
    console.error('Failed to load children:', error)
    return []
  }
}

// 处理选择变化
const handleSelectionChange = (keys: string[]) => {
  selectedKeys.value = keys
}

// 获取节点属性
const getNodeProps = ({ option }: { option: any }) => {
  return {
    onClick: () => {
      // 点击节点时自动选中
      selectedKeys.value = [option.key]
    }
  }
}

// 自定义标签渲染
const renderLabel = ({ option }: { option: any }) => {
  return h('div', { style: { display: 'flex', alignItems: 'center' } }, [
    h(NIcon, {
      component: Folder,
      size: 20,
      style: { marginRight: '8px' },
      color: "#1890ff"
    }),
    option.title
  ])
}

// 处理确认
const handleConfirm = () => {
  if (selectedKeys.value.length > 0) {
    const targetDirId = selectedKeys.value[0]
    if (targetDirId !== undefined) {
      emit('confirm', targetDirId)
    }
  }
}

// 处理取消
const handleCancel = () => {
  emit('cancel')
}

// 初始化
fetchRootDirectories()

// 监听可见性变化
watch(() => props.visible, (newVal) => {
  if (newVal) {
    // 重置选择状态
    selectedKeys.value = []
  }
})
</script>

<style scoped>
.move-file-container {
  display: flex;
  flex-direction: column;
  gap: var(--gap-large);
  padding: 1.5rem;
  width: 100%;
  min-width: 300px;
  max-width: 450px;
  box-sizing: border-box;
}

.move-file-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-color);
}

.move-file-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--gap-medium);
  margin-top: auto;
  padding-top: var(--gap-large);
  border-top: 1px solid var(--border-color);
}

/* 确保树形组件不会过度占用空间 */
:deep(.n-tree) {
  max-height: 300px;
  overflow-y: auto;
  padding-right: 8px;
}

/* 滚动条样式优化 */
:deep(.n-tree)::-webkit-scrollbar {
  width: 6px;
}

:deep(.n-tree)::-webkit-scrollbar-track {
  background: transparent;
}

:deep(.n-tree)::-webkit-scrollbar-thumb {
  background: var(--scrollbar-color, #ccc);
  border-radius: 3px;
}
</style>