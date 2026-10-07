<script setup lang="ts">
import { RouterLink, type RouteLocationRaw } from 'vue-router';

defineProps<{ to: RouteLocationRaw }>();
</script>

<template>
  <RouterLink class="back-link" :to="to">← <slot /></RouterLink>
</template>
