<template>
    <div class="footer">
        <div class="footer-content">
            <a href="https://workers.cloudflare.com/" target="_blank" rel="noopener noreferrer"
                class="footer-link">Power By Cloudflare Worker</a>
            <span>|</span>
            <router-link to="/about" class="footer-link">About</router-link>
        </div>
    </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.footer {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 1rem;
    width: 100%;
    box-sizing: border-box;
    background-color: var(--n-color-body);
    border-top: none;
}

.footer-content {
    display: flex;
    gap: var(--gap-small);
    align-items: center;
    font-size: var(--text-size-large);
    color: var(--n-text-color-2);
}

.footer-link {
    color: var(--icon-color-primary);
    text-decoration: none;
    transition: color 0.2s ease;
}

.footer-link:hover {
    color: var(--n-color-primary-hover);
    text-decoration: underline;
}

/* 小屏幕设备优化 */
@media (max-width: 768px) {
    .footer {
        padding: 0.75rem;
    }

    .footer-content {
        font-size: var(--text-size-medium);
    }
}

/* 大屏幕设备优化 */
@media (min-width: 1200px) {
    .footer-content {
        font-size: var(--text-size-xlarge);
        gap: var(--gap-large);
    }
}

/* 减少动画模式 */
@media (prefers-reduced-motion: reduce) {
    .footer-link {
        transition: none;
    }
}
</style>