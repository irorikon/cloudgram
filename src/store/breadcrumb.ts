import { defineStore } from "pinia";
import type { BreadcrumbItem } from "@/types/breadcrumb";

// 根目录常量定义
const ROOT_CRUMB: BreadcrumbItem = {
    id: "",
    isDir: true,
    name: "根目录",
    mimeType: "",
    root: true
};

// 创建面包屑导航的存储
export const useBreadcrumbStore = defineStore('breadcrumb', {
    state: () => ({
        // 初始化时直接包含根目录项
        crumbs: [ROOT_CRUMB] as BreadcrumbItem[]
    }),
    actions: {
        // 计算面包屑项数量（排除根目录）
        crumbCount() {
            return this.crumbs.length - 1; // 减去根目录
        },
        // 获取最后一个面包屑项（排除根目录）
        lastCrumb() {
            if (this.crumbs.length <= 1) {
                return null; // 只有根目录时返回null
            }
            return this.crumbs[this.crumbs.length - 1];
        },
        // 获取最后一个目录类型面包屑项（不排除根目录）
        lastCrumbTypeDir() {
            for (let i = this.crumbs.length - 1; i >= 0; i--) {
                if (this.crumbs[i]?.isDir) {
                    return this.crumbs[i];
                }
            }
        },
        // 添加面包屑项
        addCrumb(item: BreadcrumbItem) {
            // 避免重复添加，且不能添加根目录（id为""的项）
            if (item.id === "") {
                return; // 不允许添加根目录项
            }
            if (!this.crumbs.some(crumb => crumb.id === item.id)) {
                this.crumbs.push({ ...item });
            }
        },
        // 批量添加面包屑
        addCrumbs(items: BreadcrumbItem[]) {
            items.forEach(item => this.addCrumb(item));
        },
        // 点击面包屑时导航
        navigateToCrumb(targetId: string) {
            const index = this.crumbs.findIndex(crumb => crumb.id === targetId);
            if (index !== -1) {
                // 确保至少保留根目录（索引0）
                const newLength = Math.max(1, index + 1);
                this.crumbs = this.crumbs.slice(0, newLength);
            }
        },
        // 根据索引删除面包屑（保护根目录）
        removeCrumbByIndex(index: number) {
            // 不能删除根目录（索引0）
            if (index <= 0 || index >= this.crumbs.length) {
                return null;
            }
            return this.crumbs.splice(index, 1)[0] || null;
        },
        // 根据 id 查找面包屑
        findCrumbById(id: string) {
            return this.crumbs.find(crumb => crumb.id === id) || null;
        },
        // 重置面包屑（恢复到只包含根目录的状态）
        resetCrumbs() {
            this.crumbs = [ROOT_CRUMB];
        },
        // 获取除根目录外的面包屑项（用于UI显示）
        getDisplayCrumbs() {
            return this.crumbs.slice(1); // 排除根目录
        }
    }
})