<script setup lang="ts">
import { AuraProvider, ToastViewport } from '@ilomee/aura-vue';
import { useRegisterSW } from 'virtual:pwa-register/vue';
import { watch } from 'vue';
import { RouterView, useRoute } from 'vue-router';
import BottomNav from './components/BottomNav.vue';
import TopBar from './components/TopBar.vue';
import { toaster } from './toaster.ts';
import { usePrefs } from './stores/prefs.ts';
import { useProgress } from './stores/progress.ts';

const prefs = usePrefs();
const progress = useProgress();
const route = useRoute();

// A new version is cached and waits for the learner: reloading mid-exercise would lose answers.
const { needRefresh, updateServiceWorker } = useRegisterSW({ immediate: true });
watch(needRefresh, (need) => {
  if (!need) return;
  toaster.info('Есть новая версия курса', {
    description: 'Обновится при перезагрузке.',
    duration: 0,
    action: { label: 'Перезагрузить', onAction: () => updateServiceWorker(true) },
  });
});

watch(
  () => progress.error,
  (e) => e && toaster.danger('Прогресс не сохраняется', { description: e, duration: 0 }),
  { immediate: true },
);
</script>

<template>
  <AuraProvider :theme="prefs.theme" accent="aqua" class="app">
    <TopBar />
    <main class="aura-container page" :class="{ 'page--wide': route.meta.wide }">
      <RouterView />
    </main>
    <BottomNav />
    <ToastViewport :toasts="toaster.toasts.value" close-label="Закрыть" @dismiss="toaster.dismiss" />
  </AuraProvider>
</template>
