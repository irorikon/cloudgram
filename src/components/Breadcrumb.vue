<template>
  <n-breadcrumb v-if="breadcrumbItems.length > 0">
    <template v-for="(item, index) in breadcrumbItems" :key="item.id">
      <!-- 根目录（第一项）特殊处理：添加路由链接和点击事件 -->
      <n-breadcrumb-item v-if="index === 0">
        <span @click="handleRootClick(item)" class="breadcrumb-link">
          <n-icon v-if="item.name" color="#1890ff" size="20">
            <component :is="getIcon(item.isDir, item.name, item.mimeType, item.root)" />
          </n-icon>
          <span>{{ item.name }}</span>
        </span>
      </n-breadcrumb-item>
      <!-- 非最后一项的中间项：可点击导航 -->
      <n-breadcrumb-item v-else-if="index < breadcrumbItems.length - 1">
        <span @click="handleItemClick(item)" class="breadcrumb-link">
          <n-icon v-if="item.name" color="#1890ff" size="20">
            <component :is="getIcon(item.isDir, item.name, item.mimeType)" />
          </n-icon>
          <span>{{ item.name }}</span>
        </span>
      </n-breadcrumb-item>
      <!-- 最后一项：只显示文本和图标，不可点击 -->
      <n-breadcrumb-item v-else>
        <span class="breadcrumb-current">
          <n-icon v-if="item.name" color="#1890ff" size="20">
            <component :is="getIcon(item.isDir, item.name, item.mimeType)" />
          </n-icon>
          <span>{{ item.name }}</span>
        </span>
      </n-breadcrumb-item>
    </template>
  </n-breadcrumb>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { NIcon, NBreadcrumb, NBreadcrumbItem } from 'naive-ui';
import { getIcon } from '@/utils/mimetype';
import { useBreadcrumbStore } from '@/store/breadcrumb'

// 定义emit事件
const emit = defineEmits<{
  (e: 'item-click', item: any): void
}>()

// 使用 Pinia 存储和路由
const breadcrumbStore = useBreadcrumbStore()
const router = useRouter()

// 处理根目录点击
const handleRootClick = async (item: any) => {
  // 导航到根路径
  await router.push('/')

  // 触发面包屑导航
  handleItemClick(item)
}

// 处理面包屑项点击
const handleItemClick = async (item: any) => {
  // 触发导航到指定面包屑项
  breadcrumbStore.navigateToCrumb(item.id)

  // 只发射事件，让父组件处理文件获取逻辑
  emit('item-click', item)
}

// 从 Pinia 存储获取所有面包屑项（包括根目录）
const breadcrumbItems = computed(() => {
  return breadcrumbStore.crumbs
})

</script>

<style scoped>
.breadcrumb-link {
  font-size: 16px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: var(--gap-medium);
}

.breadcrumb-link:hover {
  color: #1890ff;
}

.breadcrumb-current {
  font-size: 16px;
  display: inline-flex;
  align-items: center;
  gap: var(--gap-medium);
}
</style>