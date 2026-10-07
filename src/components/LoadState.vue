<script setup lang="ts">
import { Alert, Skeleton } from '@ilomee/aura-vue';

// While a lesson chunk loads, or why it did not.
defineProps<{ failed: string }>();
const reload = () => location.reload();
</script>

<template>
  <Alert v-if="failed" tone="danger" title="Урок не загрузился" urgent>
    <p>Проверь подключение к сети и обнови страницу. ({{ failed }})</p>
    <button type="button" class="aura-btn aura-btn--secondary aura-btn--sm" @click="reload">Обновить</button>
  </Alert>
  <div v-else class="aura-stack" aria-busy="true" style="--aura-gap: var(--space-3)">
    <Skeleton variant="text" />
    <Skeleton variant="text" />
    <Skeleton variant="text" />
  </div>
</template>
