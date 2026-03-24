<template>
  <div class="login-view">
    <login-page
      :loading="loading"
      @login="handleLogin"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import LoginPage from '../components/LoginPage.vue';
import { login } from '@/api/auth';

// 状态管理
const loading = ref(false);
const message = useMessage();
const router = useRouter();

// 处理登录
const handleLogin = async (data: any) => {
  loading.value = true;
  try {
    // 调用实际的登录 API
    await login(data);
    
    // 登录成功后重定向到根目录，并添加 from=login 参数
    message.success(`登录成功，欢迎回来！`);
    router.replace({ path: '/', query: { from: 'login' } });
  } catch (error: any) {
    // 错误处理已经在 api/auth.ts 中处理
    message.error('登录失败，请检查账号密码');
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.login-view {
  width: 100%;
  min-height: 100vh;
}
</style>