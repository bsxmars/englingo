<script setup lang="ts">
import { RouterLink } from 'vue-router';
</script>

<template>
  <div class="aura-stack" style="--aura-gap: var(--space-4)">
    <h1 class="aura-text aura-text--h1">Нет такой страницы</h1>
    <p class="aura-text aura-text--body muted">Возможно, урок переименовали. Курс целиком — на главной.</p>
    <div><RouterLink class="aura-btn aura-btn--primary" to="/">К курсу</RouterLink></div>
  </div>
</template>
