// Per-device choices: the theme and the course level. Kept in localStorage.
import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, v: string | null) => {
  try {
    if (v == null) localStorage.removeItem(key);
    else localStorage.setItem(key, v);
  } catch {
    // Storage blocked: the choice lasts until reload.
  }
};

export type Theme = 'light' | 'dark';

export const usePrefs = defineStore('prefs', () => {
  // Light by default, whatever the system uses; the button in the header switches.
  const theme = ref<Theme>(read('englingo-theme') === 'dark' ? 'dark' : 'light');
  watch(
    theme,
    (t) => {
      document.documentElement.dataset.theme = t;
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'dark' ? '#0B0C10' : '#F4F6F8');
    },
    { immediate: true },
  );

  /** The level the learner picked; null follows the one they are working on. */
  const level = ref(read('englingo-level'));
  watch(level, (v) => write('englingo-level', v));

  return {
    theme,
    level,
    toggleTheme() {
      theme.value = theme.value === 'dark' ? 'light' : 'dark';
      write('englingo-theme', theme.value);
    },
  };
});
