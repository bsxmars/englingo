<script setup lang="ts">
import { computed } from 'vue';
import { pct } from '../course/text.ts';

const props = defineProps<{ ok: number; total: number }>();
const p = computed(() => pct(props.ok, props.total));
</script>

<template>
  <span class="meter" :title="`${ok} из ${total}`">
    <span class="meter-bar"><span class="meter-fill" :class="{ low: p < 60, mid: p >= 60 && p < 80 }" :style="{ width: p + '%' }" /></span>
    <span class="meter-n">{{ p }}%</span>
  </span>
</template>
