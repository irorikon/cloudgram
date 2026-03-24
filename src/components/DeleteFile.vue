<template>
    <div class="delete-file-container">
        <h3 class="delete-file-title">删除资源</h3>
        <n-spin :show="loading" size="small">
            <n-tree :data="treeData" block-line expand-on-click default-expand-all :render-label="renderLabel" />
        </n-spin>
        <n-checkbox v-model:checked="deleteFromTelegram" class="delete-telegram-checkbox">
            同时删除 Telegram 信息(48小时内)
        </n-checkbox>
        <div class="delete-file-actions">
            <n-button @click="handleCancel" size="medium">取消</n-button>
            <n-button type="error" @click="handleConfirm" size="medium" :disabled="loading">
                删除
            </n-button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h } from 'vue';
import { NSpin, NTree, NCheckbox, NButton, NIcon } from 'naive-ui';
import { Folder, DocumentText } from '@vicons/ionicons5'
import { getFilesByParentId } from '@/api/file'
import type { FileItem } from '@/types/file'

// 扩展 FileItem 类型以支持 children
interface FileItemWithChildren extends FileItem {
    children?: FileItemWithChildren[]
}

// 定义组件属性
interface Props {
    file: FileItem
}

const props = defineProps<Props>()

// 定义事件
interface Emits {
    (e: 'confirm', deleteFromTelegram: boolean): void
    (e: 'cancel'): void
}

const emit = defineEmits<Emits>()

// 是否同时删除 Telegram 信息
const deleteFromTelegram = ref(false)
const loading = ref(false)

// 存储完整的树形数据（仅用于文件夹）
const fullTreeData = ref<FileItemWithChildren[]>([])

// 将文件转换为树形结构（包含根节点）
const treeData = computed(() => {
    // 创建根节点（目标文件或文件夹）
    const rootNode: FileItemWithChildren = {
        ...props.file,
        children: props.file.is_dir ? fullTreeData.value : undefined
    }

    return [convertToFileTreeNode(rootNode)]
})

// 获取文件夹的子文件
async function fetchFolderChildren(folderId: string): Promise<FileItemWithChildren[]> {
    try {
        const response = await getFilesByParentId(folderId)
        // 根据 request.ts 的实现，response 已经是文件数组，不是包含 data 属性的对象
        return Array.isArray(response) ? response : []
    } catch (error) {
        console.error('Failed to fetch folder children:', error)
        return []
    }
}

// 转换 FileItemWithChildren 为 Tree 节点
function convertToFileTreeNode(item: FileItemWithChildren) {
    const node: any = {
        key: item.id,
        title: item.name,
        isLeaf: !item.is_dir,  // 默认：文件是叶子节点，文件夹不是叶子节点
        isDir: item.is_dir
    }

    if (item.is_dir) {
        // 对于文件夹，检查是否有子节点
        node.isDir = true
        if (item.children && item.children.length > 0) {
            // 有子节点，设置 children 属性
            let childNodes = item.children.map(child => convertToFileTreeNode(child))
            node.children = childNodes
            node.isLeaf = false
        } else {
            // 没有子节点，明确标记为叶子节点，不设置 children 属性
            node.isLeaf = true
            // 不设置 node.children 属性，让 n-tree 正确识别为叶子节点
        }
    }
    // 对于文件（!item.is_dir），保持 isLeaf = true，不设置 children

    return node
}

// 构建完整的树形结构（仅用于文件夹）
async function buildTreeStructure() {
    if (!props.file.is_dir) {
        return
    }

    loading.value = true
    try {
        const children = await fetchFolderChildren(props.file.id)
        fullTreeData.value = children as FileItemWithChildren[]
    } catch (error) {
        console.error('Failed to build tree structure:', error)
        fullTreeData.value = []
    } finally {
        loading.value = false
    }
}

// 自定义标签渲染
const renderLabel = ({ option }: { option: any }) => {
    console.debug('option', option)
    if (!option.isDir) {
        return h('div', { style: { display: 'flex', alignItems: 'center' } }, [
            h(NIcon, {
                component: DocumentText,
                size: 20,
                style: { marginRight: '8px' },
                color: '#1890ff'
            }),
            option.title
        ])
    } else {
        return h('div', { style: { display: 'flex', alignItems: 'center' } }, [
            h(NIcon, {
                component: Folder,
                size: 20,
                style: { marginRight: '8px' },
                color: '#1890ff'
            }),
            option.title
        ])
    }
}

// 处理确认删除
const handleConfirm = () => {
    emit('confirm', deleteFromTelegram.value)
}

// 处理取消
const handleCancel = () => {
    emit('cancel')
}

// 组件挂载时构建树形结构（如果是文件夹）
onMounted(() => {
    if (props.file.is_dir) {
        buildTreeStructure()
    }
})
</script>

<style scoped>
.delete-file-container {
    display: flex;
    flex-direction: column;
    gap: var(--gap-large);
    padding: 1.5rem;
    width: 100%;
    min-width: 300px;
    max-width: 450px;
    box-sizing: border-box;
}

.delete-file-title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-color);
}

.file-info {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background-color: var(--bg-color-light);
    border-radius: 6px;
}

.file-name {
    font-weight: 500;
    color: var(--text-color);
}

.delete-telegram-checkbox {
    align-self: flex-start;
}

.delete-file-actions {
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