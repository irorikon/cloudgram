<template>
  <div class="about">
    <div class="content-container">
      <n-card class="about-content">
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

        <div class="badges">
          <n-a href="https://workers.cloudflare.com/" target="_blank" class="badge-link">
            <img src="https://img.shields.io/badge/Cloudflare-Workers-orange.svg" alt="Cloudflare Workers" />
          </n-a>
          <n-a href="https://core.telegram.org/bots/api" target="_blank" class="badge-link">
            <img src="https://img.shields.io/badge/Telegram-Bot%20API-blue.svg" alt="Telegram Bot API" />
          </n-a>
        </div>

        <p class="description">CloudGram 是一个基于 Cloudflare Workers 和 Telegram Bot API 的云文件管理系统</p>
      </n-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NCard, NA } from 'naive-ui';
</script>

<style scoped>
.about {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--n-color-body);
}

.content-container {
  flex: 1;
  width: 100%;
  min-width: 800px;
  max-width: 50%;
  margin: 0 auto;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.about-content {
  width: 100%;
}

.logo-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  margin-bottom: 30px;
  text-decoration: none;
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.logo-container:hover {
  transform: scale(1.05);
  opacity: 0.9;
}

.logo-icon {
  width: 60px;
  height: 60px;
  margin-bottom: 10px;
  transition: transform 0.2s ease;
}

.logo-container:hover .logo-icon {
  transform: scale(1.1);
}

.logo-text {
  font-size: 2rem;
  font-weight: bold;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  transition: transform 0.2s ease;
}

.logo-container:hover .logo-text {
  transform: scale(1.05);
}

.badges {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-bottom: 24px;
}

.badge-link {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.badge-link:hover {
  transform: scale(1.1);
  opacity: 0.9;
}

.description {
  text-align: center;
  font-size: 1.2rem;
  line-height: 1.6;
  margin-top: 0;
}

/* 减少动画模式 */
@media (prefers-reduced-motion: reduce) {
  .logo-container,
  .logo-icon,
  .logo-text,
  .badge-link {
    transition: none;
    transform: none;
  }
}

/* 平板设备优化 */
@media (max-width: 768px) {
  .content-container {
    min-width: auto;
    max-width: 80%;
    padding: 0 12px;
  }

  .logo-icon {
    width: 80px;
    height: 80px;
  }

  .logo-text {
    font-size: 2.5rem;
  }
  
  .description {
    font-size: 1.1rem;
  }
}

/* 手机设备优化 */
@media (max-width: 480px) {
  .content-container {
    min-width: auto;
    max-width: 100%;
    padding: 0;
  }

  .logo-icon {
    width: 50px;
    height: 50px;
  }

  .logo-text {
    font-size: 1.8rem;
  }

  .badges {
    flex-direction: column;
    align-items: center;
  }
  
  .description {
    font-size: 1rem;
  }
}
</style>