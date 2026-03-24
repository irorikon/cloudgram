<template>
  <div class="about">
    <div class="about-content">
      <h1><a href="https://github.com/Xhofe/alist">Alist</a></h1>
      <p>一款阿里云盘的目录文件列表程序，后端基于go语言fiber框架重构原始项目，前端使用vue和ant design。</p>
    </div>
  </div>
</template>

<style scoped>
.about {
  width: 100%;
  min-height: 100vh;
  box-sizing: border-box;
  background-color: var(--n-color-bg, #ffffff);
  font-family: var(--n-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif);
}

.about-content {
  width: 100%;
  max-width: min(800px, 90vw);
  margin: 20px auto;
  padding: 40px 20px;
  border-radius: 10px;
  background-color: var(--n-color-body, rgba(255, 255, 255, 0.9));
  box-shadow: var(--n-box-shadow, 0 2px 12px 0 rgba(0, 0, 0, 0.1));
  color: var(--n-text-color, var(--n-color-text, #000000));
  font-family: inherit;
}

/* 确保 h1 和 p 垂直排列 */
h1 {
  display: block;
  font-size: 2rem;
  font-weight: 600;
  margin-bottom: 24px;
  line-height: 1.3;
  color: var(--n-text-color, var(--n-color-text, #000000));
}

p {
  display: block;
  font-size: 1.125rem;
  line-height: 1.7;
  color: var(--n-text-color-2, var(--n-color-text-2, #666666));
  margin: 0;
}

/* 响应式断点优化 */
@media (min-width: 768px) {
  .about-content {
    padding: 40px 30px;
  }
  
  h1 {
    font-size: 2.25rem;
  }
  
  p {
    font-size: 1.25rem;
  }
}

/* 移动端优化 */
@media (max-width: 480px) {
  .about-content {
    margin: 16px auto;
    padding: 32px 16px;
    border-radius: 8px;
  }
  
  h1 {
    font-size: 1.5rem;
    margin-bottom: 16px;
    font-weight: 600;
  }
  
  p {
    font-size: 1rem;
    line-height: 1.6;
  }
}

/* 链接样式 */
a {
  color: var(--n-color-primary, #2080f0);
  text-decoration: none;
  transition: color 0.2s ease;
}

a:hover {
  text-decoration: underline;
  color: var(--n-color-primary-hover, #1668c2);
}

/* 暗色模式优化 */
@media (prefers-color-scheme: dark) {
  .about-content {
    background-color: var(--n-color-body, rgba(30, 30, 30, 0.95));
  }
  
  h1 {
    color: var(--n-color-text, #ffffff);
  }
  
  p {
    color: var(--n-color-text-2, #b0b0b0);
  }
}
</style>