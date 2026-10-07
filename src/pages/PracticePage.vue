<script setup lang="ts">
import { computed, watch, watchEffect } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import BackLink from '../components/BackLink.vue';
import ExerciseView from '../components/exercise/ExerciseView.vue';
import LoadState from '../components/LoadState.vue';
import { useLesson } from '../composables/useLesson.ts';
import { setTitle } from '../router.ts';
import { useProgress } from '../stores/progress.ts';
import { course, levelInfo, moduleOf } from '../useCourse.ts';
import NotFound from './NotFound.vue';

const route = useRoute();
const router = useRouter();
const progress = useProgress();

const id = computed(() => String(route.params.id));
const meta = computed(() => course.lessons[id.value]);
const mod = computed(() => (meta.value ? moduleOf(id.value) : null));
const { data, failed } = useLesson(id);

// ?ex=<id> picks the exercise; without it, the first unsolved one is put in the
// address once, so solving it does not switch the page under the learner.
watch(
  () => [id.value, route.query.ex],
  () => {
    const list = meta.value?.exercises ?? [];
    if (route.name !== 'practice' || typeof route.query.ex === 'string' || !list.length) return;
    const first = list.find((e) => !progress.solved.has(e.id)) ?? list[0]!;
    void router.replace({ path: route.path, query: { ...route.query, ex: first.id }, hash: route.hash });
  },
  { immediate: true },
);
const cur = computed(() => {
  const want = route.query.ex;
  const list = meta.value?.exercises ?? [];
  return typeof want === 'string' ? list.findIndex((e) => e.id === want) : 0;
});
const exMeta = computed(() => meta.value?.exercises[cur.value]);
const ex = computed(() => data.value?.exercises[cur.value] ?? null);

watchEffect(() => meta.value && setTitle(`Практика: ${meta.value.title}`));
</script>

<template>
  <NotFound v-if="!meta || !meta.exercises.length || !exMeta" />
  <div v-else class="practice">
    <BackLink :to="`/lesson/${id}`">Теория урока</BackLink>
    <div class="practice-head">
      <div>
        <p class="aura-text aura-text--caption muted">
          <RouterLink to="/">Курс</RouterLink> / {{ mod!.title }} / <RouterLink :to="`/lesson/${id}`">{{ meta.title }}</RouterLink>
        </p>
        <h1 class="aura-text aura-text--h2">Практика</h1>
      </div>
      <nav class="aura-group steps" style="--aura-gap: var(--space-1)" aria-label="Шаги урока">
        <RouterLink class="aura-badge aura-badge--info" :to="`/lesson/${id}`">1 · Теория</RouterLink><span class="aura-badge">2 · Практика</span>
      </nav>
    </div>

    <nav v-if="meta.exercises.length > 1" class="ex-pills" aria-label="Упражнения урока">
      <RouterLink
        v-for="(e, i) in meta.exercises"
        :key="e.id"
        :to="{ path: `/practice/${id}`, query: { ex: e.id } }"
        class="aura-btn aura-btn--sm"
        :class="i === cur ? 'aura-btn--secondary' : 'aura-btn--ghost'"
        :aria-current="i === cur ? 'step' : undefined"
        >{{ i + 1 }}. {{ e.title }}{{ progress.solved.has(e.id) ? ' ✓' : '' }}</RouterLink
      >
    </nav>

    <ExerciseView
      v-if="ex && data"
      :key="ex.id"
      :ex="ex"
      :lesson="meta"
      :level="levelInfo(mod!.level)"
      :next="meta.exercises[cur + 1] ?? null"
      :intro="cur === 0 ? data.practice : ''"
      :theory="data.theory"
    />
    <LoadState v-else :failed="failed" />
  </div>
</template>
