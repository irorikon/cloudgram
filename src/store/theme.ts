import { defineStore } from 'pinia';
import { darkTheme } from 'naive-ui';
import type { GlobalTheme } from 'naive-ui';

export const useThemeStore = defineStore('theme', {
  state: () => ({
    isDark: false,
    userDefined: false,
  }),
  getters: {
    currentTheme(): GlobalTheme | null {
      return this.isDark ? darkTheme : null;
    },
  },
  actions: {
    toggle() {
      this.isDark = !this.isDark;
      this.userDefined = true;
    },
    setLight() {
      this.isDark = false;
      this.userDefined = true;
    },
    setDark() {
      this.isDark = true;
      this.userDefined = true;
    },
  },
  persist: true,
});
