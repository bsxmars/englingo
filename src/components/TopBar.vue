<script setup lang="ts">
import { IconButton } from '@ilomee/aura-vue';
import { RouterLink, useRoute } from 'vue-router';
import { usePrefs } from '../stores/prefs.ts';
import LevelSwitch from './LevelSwitch.vue';
import { NAV } from './nav.ts';

const prefs = usePrefs();
const route = useRoute();
</script>

<template>
  <header class="topbar">
    <div class="aura-container topbar-inner" :class="{ 'page--wide': route.meta.wide }">
      <RouterLink class="logo" to="/">Englingo</RouterLink>
      <LevelSwitch />
      <nav class="main-nav" aria-label="Разделы">
        <RouterLink v-for="n in NAV" :key="n.to" :to="n.to" class="aura-btn aura-btn--text aura-btn--sm">{{ n.label }}</RouterLink>
      </nav>
      <IconButton size="sm" ariaLabel="Сменить тему" class="theme-btn" @click="prefs.toggleTheme()">◐</IconButton>
    </div>
  </header>
</template>
