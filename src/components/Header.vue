<template>
    <div class="header">
        <router-link to="/" class="logo-container">
            <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 448 512"
                class="logo-icon">
                <defs>
                    <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#667eea" />
                        <stop offset="50%" stop-color="#764ba2" />
                        <stop offset="100%" stop-color="#f093fb" />
                    </linearGradient>
                </defs>
                <path
                    d="M446.7 98.6l-67.6 318.8c-5.1 22.5-18.4 28.1-37.3 17.5l-103-75.9l-49.7 47.8c-5.5 5.5-10.1 10.1-20.7 10.1l7.4-104.9l190.9-172.5c8.3-7.4-1.8-11.5-12.9-4.1L117.8 284L16.2 252.2c-22.1-6.9-22.5-22.1 4.6-32.7L418.2 66.4c18.4-6.9 34.5 4.1 28.5 32.2z"
                    fill="url(#logoGradient)"></path>
            </svg>
            <span class="logo-text">CloudGram</span>
        </router-link>

        <div class="header-actions">
            <!-- 主题切换按钮 -->
            <n-button type="primary" text circle size="large" @click="toggleTheme" class="theme-toggle-btn">
                <template #icon>
                    <n-icon :component="currentThemeIcon" />
                </template>
            </n-button>

            <!-- 用户下拉菜单 -->
            <n-dropdown :options="options" placement="bottom-end" trigger="click" @select="handleSelect">
                <n-avatar size="large" class="header-avatar">
                    <n-icon color="#1890ff">
                        <PersonOutline />
                    </n-icon>
                </n-avatar>
            </n-dropdown>
        </div>

        <!-- 频道设置对话框 -->
        <n-modal
            v-model:show="showChannelSettings"
            preset="card"
            title="频道设置"
            :style="{ width: '650px' }"
            :bordered="false"
            :segmented="{ content: true, footer: true }"
        >
            <EditChannel />
        </n-modal>
    </div>
</template>

<script setup lang="ts">
import { computed, h, ref } from 'vue';
import { useRouter } from 'vue-router';
import { NIcon, NAvatar, NButton, NDropdown, NModal } from 'naive-ui';
import { useUserStore } from '@/store/user';
import { useThemeStore } from '@/store/theme';
import { LogOutOutline as LogoutIcon, PersonOutline, SettingsOutline } from '@vicons/ionicons5'
import { Moon, Sunny } from '@vicons/ionicons5'
import EditChannel from '@/components/EditChannel.vue'

const userStore = useUserStore()
const themeStore = useThemeStore()
const router = useRouter()

// 控制频道设置对话框显示
const showChannelSettings = ref(false)

// 计算当前主题图标 - 暗色模式显示太阳图标，亮色模式显示月亮图标
const currentThemeIcon = computed(() => {
    return themeStore.isDark ? Sunny : Moon
})

const options = computed(() => [
    {
        label: '频道设置',
        key: 'channel-settings',
        icon: () => h(NIcon, { component: SettingsOutline })
    },
    {
        label: '退出登录',
        key: 'logout',
        icon: () => h(NIcon, { component: LogoutIcon })
    }
])

// 处理下拉菜单选择
const handleSelect = (key: string) => {
    if (key === 'logout') {
        userStore.logout()
        router.push('/login')
    } else if (key === 'channel-settings') {
        showChannelSettings.value = true
    }
}

// 切换主题
const toggleTheme = () => {
    themeStore.toggle()
}
</script>

<style scoped>
.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 16px;
    min-height: 64px;
    width: 100%;
    box-sizing: border-box;
    background-color: var(--n-color-body);
}

.logo-container {
    display: flex;
    align-items: center;
    gap: var(--gap-medium);
    text-decoration: none;
    transition: transform 0.2s ease;
}

.logo-container:hover {
    transform: scale(1.05);
}

.logo-icon {
    height: 32px;
    width: auto;
}

.logo-text {
    font-size: 24px;
    font-weight: 700;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    line-height: 1;
    letter-spacing: -0.5px;
}

.header-actions {
    display: flex;
    gap: var(--gap-large);
    align-items: center;
}

.header-avatar {
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.header-avatar:hover {
    transform: scale(1.05);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.theme-toggle-btn {
    transition: all 0.2s ease;
    gap: var(--gap-large);
}

.theme-toggle-btn:hover {
    transform: scale(1.05);
}


/* 移动端优化 */
@media (max-width: 768px) {
    .header {
        padding: 0 12px;
        min-height: 56px;
    }

    .logo-icon {
        height: 28px;
    }

    .logo-text {
        font-size: 20px;
        font-weight: 700;
    }

    .header-actions {
        gap: var(--gap-medium);
    }

    .header-avatar,
    .theme-toggle-btn {
        transform: scale(1);
    }

    .header-avatar:hover,
    .theme-toggle-btn:hover {
        transform: scale(1.02);
    }
}


/* 减少动画模式 */
@media (prefers-reduced-motion: reduce) {
    .logo-container,
    .header-avatar,
    .theme-toggle-btn {
        transition: none;
    }

    .logo-container:hover,
    .header-avatar:hover,
    .theme-toggle-btn:hover {
        transform: none;
    }
}
</style>