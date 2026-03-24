<template>
    <div class="edit-channel-dialog">
        <!-- 频道列表 -->
        <div class="channel-list">
            <div v-for="channel in channels" :key="channel.channel_id" class="channel-item"
                :class="{ 'channel-item--selected': selectedChannelId === channel.channel_id }"
                @click="selectChannel(channel.channel_id)">
                <div class="channel-info">
                    <span class="channel-name">{{ channel.name }}</span>
                    <span class="channel-id">{{ channel.channel_id }}</span>
                </div>
                <div class="channel-actions">
                    <n-button size="small" type="error" ghost @click.stop="handleDeleteChannel(channel.channel_id)"
                        :disabled="deletingChannelId === channel.channel_id">
                        {{ deletingChannelId === channel.channel_id ? '删除中...' : '删除' }}
                    </n-button>
                </div>
            </div>

            <div v-if="channels.length === 0" class="empty-state">
                <n-text type="secondary">暂无频道</n-text>
            </div>
        </div>

        <!-- 编辑/新增表单 -->
        <div class="channel-form">
            <n-form :model="form" :rules="rules" ref="formRef">
                <n-form-item label="频道ID" path="channelId">
                    <n-input v-model:value="form.channelId" placeholder="请输入频道ID" :disabled="!!editingChannelId"
                        clearable />
                </n-form-item>

                <n-form-item label="频道名称" path="channelName">
                    <n-input v-model:value="form.channelName" placeholder="请输入频道名称" clearable />
                </n-form-item>
            </n-form>

            <div class="form-actions">
                <n-button size="medium" @click="handleCancel" class="form-btn">
                    清除
                </n-button>
                <n-button type="primary" size="medium" :loading="submitLoading" :disabled="!isFormValid"
                    @click="handleSubmit" class="form-btn form-btn--submit">
                    {{ editingChannelId ? '更新' : '新增' }}
                </n-button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
    NButton,
    NInput,
    NForm,
    NFormItem,
    NText,
    useMessage
} from 'naive-ui'
import type { FormInst, FormRules } from 'naive-ui'
import { listChannels, createChannel, deleteChannel, updateChannel, checkChannel } from '@/api/channel'

// 定义频道类型
interface ChannelRecord {
    channel_id: string
    name: string
    limited: boolean
    message_id: number
    created_at: string
    updated_at: string
}

const message = useMessage()

// 状态管理
const channels = ref<ChannelRecord[]>([])
const selectedChannelId = ref<string>('')
const editingChannelId = ref<string>('')
const submitLoading = ref(false)
const deletingChannelId = ref<string>('')
const formRef = ref<FormInst | null>(null)

// 表单数据
const form = ref({
    channelId: '',
    channelName: ''
})

// 表单验证规则
const rules: FormRules = {
    channelId: [
        { required: true, message: '请输入频道ID', trigger: 'blur' }
    ],
    channelName: [
        { required: true, message: '请输入频道名称', trigger: 'blur' },
        { max: 255, message: '频道名称不能超过255个字符', trigger: 'blur' }
    ]
}

// 计算属性
const isFormValid = computed(() => {
    return form.value.channelId.trim() !== '' && form.value.channelName.trim() !== ''
})

// 新增计算属性：是否处于编辑模式
const isEditing = computed(() => {
    return !!editingChannelId.value
})

// 获取频道列表
const fetchChannels = async () => {
    try {
        const channelsData = await listChannels()
        channels.value = Array.isArray(channelsData) ? channelsData : []

        // 如果有频道且没有选中的频道，自动选择第一个
        if (channels.value.length > 0 && !selectedChannelId.value) {
            const firstChannel = channels.value[0]
            if (firstChannel) {
                selectChannel(firstChannel.channel_id)
            }
        }
    } catch (error) {
        message.error('获取频道列表失败')
        channels.value = []
    }
}

// 选择频道
const selectChannel = (channelId: string) => {
    selectedChannelId.value = channelId
    editingChannelId.value = channelId

    const channel = channels.value.find(c => c.channel_id === channelId)
    if (channel) {
        form.value = {
            channelId: channel.channel_id,
            channelName: channel.name
        }
    }
}

// 新增频道模式
const newChannelMode = () => {
    selectedChannelId.value = ''
    editingChannelId.value = ''
    form.value = {
        channelId: '',
        channelName: ''
    }
}

// 提交表单
const handleSubmit = async () => {
    if (!formRef.value) return

    try {
        await formRef.value.validate()
        submitLoading.value = true

        if (isEditing.value) {
            // 更新逻辑
            await updateChannel(form.value.channelId, form.value.channelName)
            message.success('频道更新成功')
        } else {
            // 新增频道
            // 检测频道可用性
            const aviable = await checkChannel(form.value.channelId)
            if (!aviable.tg_channel_status) {
                message.error('频道不存在或已关闭')
            } else {
                await createChannel(form.value.channelId, form.value.channelName)
                message.success('频道新增成功')
            }
        }

        // 重新获取列表
        await fetchChannels()
        newChannelMode()
    } catch (error) {
        message.error(isEditing.value ? '更新频道失败' : '新增频道失败')
    } finally {
        submitLoading.value = false
    }
}

// 删除频道
const handleDeleteChannel = async (channelId: string) => {
    if (confirm('确定要删除该频道吗？')) {
        try {
            deletingChannelId.value = channelId
            await deleteChannel(channelId)
            message.success('频道删除成功')

            // 重新获取列表
            await fetchChannels()

            // 如果删除的是当前选中的频道，切换到新增模式
            if (selectedChannelId.value === channelId) {
                newChannelMode()
            }
        } catch (error) {
            message.error('删除频道失败')
        } finally {
            deletingChannelId.value = ''
        }
    }
}

// 取消操作
const handleCancel = () => {
    newChannelMode()
}

// 初始化
onMounted(() => {
    fetchChannels()
})
</script>

<style scoped>
/* 移除所有可能导致偏移的样式，让内容完全自适应模态框宽度 */
.edit-channel-dialog {
    width: 100%;
    padding: 0 20px;
    box-sizing: border-box;
}

.channel-list {
    border: 1px solid var(--border-color);
    border-radius: 6px;
    padding: 12px;
    margin-bottom: 20px;
    max-height: 300px;
    overflow-y: auto;
}

.channel-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s;
}

.channel-item:hover {
    background-color: var(--hover-color);
}

.channel-item--selected {
    background-color: var(--primary-color-light);
    border: 1px solid var(--primary-color);
}

.channel-info {
    flex: 1;
    min-width: 0;
    /* 确保文本截断生效 */
}

.channel-name {
    font-weight: 600;
    display: block;
    margin-bottom: 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.channel-id {
    font-size: 12px;
    color: var(--text-color-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.channel-actions {
    flex-shrink: 0;
    margin-left: 12px;
}

.empty-state {
    text-align: center;
    padding: 24px;
}

.channel-form {
    border: 1px solid var(--border-color);
    border-radius: 6px;
    padding: 20px;
}

.form-actions {
    display: flex;
    justify-content: center;
    gap: 12px;
    margin-top: 20px;
}

.form-btn {
    min-width: 80px;
}

/* 响应式设计 */
@media (max-width: 768px) {
    .edit-channel-dialog {
        padding: 0 16px;
    }

    .channel-list {
        padding: 8px;
        margin-bottom: 16px;
    }

    .channel-item {
        padding: 10px;
        flex-direction: column;
        align-items: stretch;
        gap: 8px;
    }

    .channel-info {
        order: 2;
    }

    .channel-actions {
        order: 1;
        margin-left: 0;
        align-self: flex-end;
    }

    .channel-form {
        padding: 16px;
    }

    .form-actions {
        flex-direction: column;
        gap: 8px;
    }

    .form-btn {
        width: 100%;
        min-width: auto;
    }
}

/* 大屏幕优化 */
@media (min-width: 1200px) {
    .edit-channel-dialog {
        /* 在大屏幕上保持适当的内边距，但不设置最大宽度限制 */
        padding: 0 30px;
    }
}
</style>