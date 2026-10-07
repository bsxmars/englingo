<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { NAV } from './nav.ts';

const route = useRoute();
// Lessons and practice are part of the course section.
const current = computed(() =>
  route.name === 'lesson' || route.name === 'practice' ? '/' : NAV.find((n) => n.to === route.path)?.to,
);
</script>

<template>
  <nav class="bottom-nav" aria-label="Разделы">
    <RouterLink
      v-for="n in NAV"
      :key="n.to"
      :to="n.to"
      class="bottom-nav__item"
      :class="{ 'is-active': current === n.to }"
      :aria-current="current === n.to ? 'page' : undefined"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true"><path :d="n.icon" /></svg>
      <span>{{ n.label }}</span>
    </RouterLink>
  </nav>
</template>
