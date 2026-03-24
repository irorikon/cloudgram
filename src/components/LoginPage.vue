<template>
  <div class="auth-login">
    <div class="auth-login__card">
      <!-- 登录表单 -->
      <n-form ref="loginFormRef" :model="loginForm" :rules="formRules" class="auth-login__form" size="large"
        :disabled="loginLoading">
        <!-- Logo和标题区域 -->
        <div class="auth-login__header">
          <div class="logo-container">
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
          </div>
          <p class="auth-login__subtitle">请登录您的账号</p>
        </div>

        <!-- 用户名输入 -->
        <n-form-item path="username" label="账号">
          <n-input v-model:value="loginForm.username" placeholder="请输入用户名" clearable :disabled="loginLoading"
            @keydown.enter="handleLogin" :loading="loginLoading" :input-props="{
              autocomplete: 'username'
            }">
            <template #prefix>
              <n-icon :component="PersonOutline" />
            </template>
          </n-input>
        </n-form-item>

        <!-- 密码输入 -->
        <n-form-item path="password" label="密码">
          <n-input v-model:value="loginForm.password" :type="showPassword ? 'text' : 'password'" placeholder="请输入密码"
            clearable :disabled="loginLoading" @keydown.enter="handleLogin" :input-props="{
              autocomplete: 'current-password'
            }">
            <template #prefix>
              <n-icon :component="LockClosedOutline" />
            </template>
            <template #suffix>
              <n-icon :component="showPassword ? EyeOffOutline : EyeOutline" class="auth-login__password-toggle"
                @click="showPassword = !showPassword" />
            </template>
          </n-input>
        </n-form-item>

        <!-- 记住账号 -->
        <div class="auth-login__options">
          <n-checkbox v-model:checked="rememberMe" :disabled="loginLoading">
            <span class="auth-login__checkbox-label">记住账号</span>
          </n-checkbox>
        </div>

        <!-- 按钮区域 -->
        <div class="auth-login__button-group">
          <n-button type="success" size="large" :disabled="loginLoading" @click="clearForm"
            class="auth-login__clear-btn">
            <span class="auth-login__btn-text">清除</span>
          </n-button>
          <n-button type="primary" size="large" block :loading="loginLoading" :disabled="!isFormValid"
            @click="handleLogin" class="auth-login__btn">
            <template #icon>
              <n-icon v-if="!loginLoading" :component="LogInOutline" />
            </template>
            <span class="auth-login__btn-text">{{ buttonText }}</span>
          </n-button>
        </div>
      </n-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { useMessage, useLoadingBar, NIcon, NInput, NForm, NFormItem, NButton, NCheckbox } from 'naive-ui';
import {
  PersonOutline,
  LockClosedOutline,
  LogInOutline,
  EyeOutline,
  EyeOffOutline
} from '@vicons/ionicons5';
import { login } from '@/api/auth';
import type { LoginParams } from '@/types/login';
import type { FormInst, FormRules } from 'naive-ui';
import { useUserStore } from '@/store/user';

// 定义组件事件
interface Emits {
  (e: 'login', data: LoginParams): void;
}

// 定义组件属性
interface Props {
  loading?: boolean;
  autoFocus?: boolean;
  username?: string;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  autoFocus: true,
  username: ''
});

const emit = defineEmits<Emits>();

// Naive UI hooks (这些应该由自动导入提供，但需要显式声明)
const message = useMessage();
const loadingBar = useLoadingBar();
// Pinia store
const userStore = useUserStore();

// 响应式数据
const loginFormRef = ref<FormInst | null>(null);
const rememberMe = ref(false);
const showPassword = ref(false);
const loginLoading = ref(props.loading);

// 表单数据
const loginForm = reactive<LoginParams>({
  username: props.username,
  password: '',
});

// 计算属性
const isFormValid = computed(() => {
  return loginForm.username.trim() !== '' &&
    loginForm.password.trim() !== '';
});

const buttonText = computed(() => {
  return loginLoading.value ? '登录中...' : '登录';
});

// 表单验证规则
const formRules: FormRules = {
  username: [
    {
      required: true,
      message: '请输入用户名',
      trigger: ['blur', 'input']
    },
    {
      pattern: /^[a-zA-Z0-9_.-]+$/,
      message: '用户名只能包含字母、数字、下划线、点号和短横线',
      trigger: 'blur'
    }
  ],
  password: [
    {
      required: true,
      message: '请输入密码',
      trigger: ['blur', 'input']
    },
    {
      min: 6,
      message: '密码长度不能少于6位',
      trigger: ['blur', 'input']
    }
  ],
};

// 监听 loading 属性变化
watch(() => props.loading, (newVal) => {
  loginLoading.value = newVal;
});

// 监听 username 属性变化
watch(() => props.username, (newVal) => {
  if (newVal !== loginForm.username) {
    loginForm.username = newVal;
  }
});

// 初始化时恢复记住的用户名
onMounted(() => {
  // 从Pinia store获取记住的用户名
  if (userStore.keepAlive) {
    loginForm.username = userStore.username;
    rememberMe.value = true;
  }

  // 自动聚焦
  if (props.autoFocus) {
    setTimeout(() => {
      const input = document.querySelector(
        loginForm.username
          ? '.auth-login__form input[type="password"]'
          : '.auth-login__form input[type="text"]'
      ) as HTMLInputElement;
      input?.focus();
    }, 100);
  }
});

// 登录处理
const handleLogin = async () => {
  if (loginLoading.value || !isFormValid.value) {
    return;
  }

  try {
    loginLoading.value = true;
    loadingBar.start();

    await loginFormRef.value?.validate();

    // 使用Pinia store存储记住的用户名
    if (rememberMe.value) {
      userStore.setKeepAlive(true);
    } else {
      // 如果取消记住账号，则清空store中的用户名
      userStore.setKeepAlive(false);
    }

    emit('login', {
      username: loginForm.username,
      password: loginForm.password,
    });

    const response = await login(loginForm);

    loadingBar.finish();

  } catch (error: any) {
    console.error('登录失败:', error);
    loadingBar.error();
    handleLoginError(error);

  } finally {
    loginLoading.value = false;
  }
};

// 错误处理函数
const handleLoginError = (error: any) => {
  if (Array.isArray(error) && error.length > 0) {
    message.error('请检查表单填写是否正确');
  } else if (error.code === 400) {
    message.error('请求格式错误');
  } else if (error.code === 401) {
    message.error('用户名或密码错误');
  } else if (error.code === 429) {
    message.error('请求过于频繁，请稍后重试');
  } else if (error.code === 500) {
    message.error('服务器错误，请稍后重试');
  } else if (error.message?.includes('网络错误') || error.message?.includes('Network')) {
    message.error('网络连接失败，请检查网络');
  } else if (error.message?.includes('请求超时') || error.message?.includes('timeout')) {
    message.error('请求超时，请稍后重试');
  } else if (error.message?.includes('JSON')) {
    message.error('服务器响应格式错误');
  } else {
    message.error(error.message || '登录失败，请稍后重试');
  }
};

// 清除表单
const clearForm = () => {
  loginForm.username = '';
  loginForm.password = '';
  loginFormRef.value?.restoreValidation();
};

// 重置表单
const resetForm = () => {
  loginFormRef.value?.restoreValidation();
  loginForm.password = '';
  if (!rememberMe.value) {
    loginForm.username = '';
  }
};

// 聚焦到用户名输入框
const focus = () => {
  setTimeout(() => {
    const usernameInput = document.querySelector('.auth-login__form input[type="text"]') as HTMLInputElement;
    usernameInput?.focus();
  }, 100);
};

// 手动设置登录状态
const setLoading = (loading: boolean) => {
  loginLoading.value = loading;
};

// 获取表单数据
const getFormData = (): LoginParams => {
  return { ...loginForm };
};

// 暴露方法给父组件
defineExpose({
  resetForm,
  focus,
  setLoading,
  getFormData,
  clearForm
});
</script>

<style scoped>
.auth-login {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: linear-gradient(135deg, var(--n-color-body) 0%, var(--n-color-body) 100%);
}

.auth-login__card {
  width: 100%;
  max-width: 420px;
  background: var(--n-color);
  border-radius: 16px;
  padding: 48px 40px;
  box-shadow:
    0 4px 20px rgba(0, 0, 0, 0.1),
    0 2px 6px rgba(0, 0, 0, 0.05);
  border: 1px solid var(--n-border-color);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(10px);
}

.auth-login__card:hover {
  box-shadow:
    0 8px 30px rgba(0, 0, 0, 0.15),
    0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.auth-login__header {
  text-align: center;
  margin-bottom: 24px;
}

.logo-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--gap-medium);
  margin-bottom: 8px;
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

.auth-login__subtitle {
  font-size: var(--text-size-large);
  color: var(--n-text-color-2);
  margin: 0;
  line-height: 1.5;
}

.auth-login__form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 优化输入框文字大小和颜色 */
:deep(.auth-login__form .n-input__input) {
  font-size: var(--text-size-large);
  letter-spacing: 0.5px;
  color: var(--n-text-color);
  background-color: transparent;
}

:deep(.auth-login__form .n-form-item-label) {
  font-weight: 600;
  color: var(--n-text-color);
  margin-bottom: 8px;
  font-size: var(--text-size-large);
}

:deep(.auth-login__form .n-input) {
  border-radius: 12px;
  transition: all 0.3s ease;
  background-color: var(--n-color);
  border: 1px solid var(--n-border-color);
}

:deep(.auth-login__form .n-input:hover) {
  border-color: var(--n-color-primary);
}

:deep(.auth-login__form .n-input:focus-within) {
  border-color: var(--n-color-primary);
  box-shadow: 0 0 0 2px var(--n-color-primary-1);
}

:deep(.auth-login__form .n-input__placeholder) {
  color: var(--n-text-color-3);
}

.auth-login__password-toggle {
  cursor: pointer;
  color: var(--n-text-color-3);
  transition: color 0.2s ease;
  padding: 6px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  font-size: var(--icon-size-large);
}

.auth-login__password-toggle:hover {
  color: var(--n-color-primary);
  background-color: var(--n-color-primary-1);
}

.auth-login__options {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  margin: 4px 0 16px;
}

.auth-login__clear-btn {
  font-size: var(--text-size-medium);
  padding: 4px 8px;
}

.auth-login__checkbox-label {
  font-size: var(--text-size-large);
  color: var(--n-text-color-2);
  user-select: none;
}

:deep(.auth-login__options .n-checkbox__label) {
  font-size: var(--text-size-large);
}

.auth-login__button-group {
  display: flex;
  gap: 16px;
  margin-top: 4px;
}

.auth-login__clear-btn {
  flex: 1;
  border-radius: 12px;
  height: 52px;
  font-weight: 600;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.auth-login__btn {
  flex: 1;
  border-radius: 12px;
  height: 52px;
  font-weight: 600;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.auth-login__btn-text {
  font-size: var(--text-size-large);
  letter-spacing: 0.8px;
  font-weight: 600;
}

:deep(.auth-login__btn .n-button__icon) {
  font-size: var(--icon-size-xlarge);
}

.auth-login__btn:not(:disabled):not(.n-button--loading):hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px var(--n-color-primary-1);
}

.auth-login__btn:not(:disabled):not(.n-button--loading):active {
  transform: translateY(0);
}

/* 暗色模式增强 - 使用CSS媒体查询确保暗色模式下卡片更明显 */
@media (prefers-color-scheme: dark) {
  .auth-login__card {
    box-shadow:
      0 4px 20px rgba(0, 0, 0, 0.3),
      0 2px 6px rgba(0, 0, 0, 0.15);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .auth-login__card:hover {
    box-shadow:
      0 8px 30px rgba(0, 0, 0, 0.4),
      0 4px 12px rgba(0, 0, 0, 0.2);
  }
}

/* 响应式设计 - 平板设备 */
@media (max-width: 768px) {
  .auth-login {
    padding: 16px;
  }

  .auth-login__card {
    padding: 40px 32px;
    max-width: 100%;
  }

  .auth-login__title {
    font-size: var(--text-size-xlarge);
  }

  .auth-login__subtitle {
    font-size: var(--text-size-large);
  }

  .auth-login__btn {
    height: 50px;
  }

  .auth-login__btn-text {
    font-size: var(--text-size-large);
  }

  :deep(.auth-login__form .n-input__input) {
    font-size: var(--text-size-large);
  }
}

/* 响应式设计 - 手机设备 */
@media (max-width: 480px) {
  .auth-login {
    padding: 12px;
    min-height: calc(100vh - 24px);
  }

  .auth-login__card {
    padding: 36px 24px;
    max-width: 100%;
    border-radius: 16px;
  }

  .auth-login__header {
    margin-bottom: 28px;
  }

  .auth-login__title {
    font-size: var(--text-size-large);
    line-height: 1.2;
  }

  .auth-login__subtitle {
    font-size: var(--text-size-medium);
    line-height: 1.4;
  }

  .auth-login__form {
    gap: 20px;
  }

  :deep(.n-form-item-blank) {
    min-height: 52px;
  }

  :deep(.n-input) {
    height: 52px;
  }

  :deep(.n-input__input) {
    height: 52px;
    padding: 0 16px;
    font-size: var(--text-size-large);
    line-height: 52px;
  }

  :deep(.n-input__prefix) {
    padding-left: 16px;
  }

  :deep(.n-input__suffix) {
    padding-right: 16px;
  }

  .auth-login__button-group {
    gap: 12px;
  }

  .auth-login__clear-btn,
  .auth-login__btn {
    height: 56px;
    font-size: var(--text-size-large);
    font-weight: 600;
  }

  .auth-login__btn-text {
    font-size: var(--text-size-large);
    letter-spacing: 1px;
  }

  .auth-login__options {
    margin: 8px 0 24px;
  }

  .auth-login__checkbox-label {
    font-size: var(--text-size-medium);
  }

  .auth-login__clear-btn {
    font-size: var(--text-size-small);
    padding: 2px 6px;
  }

  :deep(.n-icon) {
    font-size: var(--icon-size-large);
  }

  :deep(.auth-login__btn .n-button__icon) {
    font-size: var(--icon-size-large);
  }

  .logo-icon {
    height: 28px;
  }

  .logo-text {
    font-size: 20px;
    font-weight: 700;
  }
}

/* 超小屏幕设备 (如 iPhone SE) */
@media (max-width: 375px) {
  .auth-login__card {
    padding: 32px 20px;
  }

  .auth-login__title {
    font-size: var(--text-size-large);
  }

  .auth-login__subtitle {
    font-size: var(--text-size-small);
  }

  .auth-login__button-group {
    gap: 10px;
  }

  .auth-login__clear-btn,
  .auth-login__btn {
    height: 54px;
  }

  .auth-login__btn-text {
    font-size: var(--text-size-medium);
  }

  .logo-icon {
    height: 24px;
  }

  .logo-text {
    font-size: 18px;
    font-weight: 700;
  }
}

/* 减少动画模式 */
@media (prefers-reduced-motion: reduce) {
  .auth-login__card {
    animation: none;
    transition: none;
  }

  .auth-login__card:hover {
    transform: none;
    box-shadow:
      0 4px 20px rgba(0, 0, 0, 0.1),
      0 2px 6px rgba(0, 0, 0, 0.05);
  }

  .auth-login__btn {
    transition: none;
  }

  .auth-login__btn:not(:disabled):not(.n-button--loading):hover {
    transform: none;
    box-shadow: 0 4px 12px var(--n-color-primary-1);
  }
}

/* 触摸设备优化 - 增大触摸目标 */
@media (pointer: coarse) {
  .auth-login__password-toggle {
    width: 36px;
    height: 36px;
    padding: 10px;
  }

  :deep(.n-checkbox) {
    min-height: 48px;
  }

  .auth-login__btn {
    min-height: 56px;
  }
}
</style>