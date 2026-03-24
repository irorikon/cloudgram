import { defineStore } from "pinia";
import router from '@/router'

// 创建 User Store
export const useUserStore = defineStore("user", {
  state: () => ({
    username: "",
    token: "",
    keepAlive: false,
  }),

  // 定义 getters
  getters: {
    getUsername: (state) => state.username,
    getToken: (state) => state.token,
    getKeepAlive: (state) => state.keepAlive,
  },
  actions: {
    setUsername(username: string) {
      this.username = username;
    },
    setToken(token: string) {
      this.token = token;
    },
    setKeepAlive(keepAlive: boolean) {
      this.keepAlive = keepAlive;
    },
    clearUser() {
      // 先执行路由跳转，避免持久化操作阻塞
      router.replace('/login');

      // 然后清除用户状态
      this.token = "";
    },
    logout() {
      this.clearUser();
    }
  },
  persist: true
});

export const useUserStoreWithOut = () => {
  return useUserStore();
}