<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import { usePrefs } from '../stores/prefs.ts';
import { useCourse } from '../useCourse.ts';

const { levels, level } = useCourse();
const prefs = usePrefs();
const route = useRoute();
const router = useRouter();

// Lessons belong to one level: switching from inside one goes back to the course map.
function pick(code: string) {
  prefs.level = code;
  if (route.name === 'lesson' || route.name === 'practice') void router.push('/');
}
</script>

<template>
  <nav class="level-switch" aria-label="Ступень курса">
    <button
      v-for="lv in levels"
      :key="lv.level.code"
      type="button"
      class="level-pill"
      :class="{ 'is-active': lv.level.code === level.level.code }"
      :aria-pressed="lv.level.code === level.level.code"
      :title="`${lv.level.exam} · пройдено ${lv.done} из ${lv.total}`"
      @click="pick(lv.level.code)"
    >
      {{ lv.level.track }}
    </button>
  </nav>
</template>
