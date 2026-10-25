<script setup lang="ts">
// One exercise next to the lesson's theory: the task (or text, or recording)
// in a side card, the answers in the main column.
import { Alert, Badge, Tabs } from '@ilomee/aura-vue';
import { computed, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { allSolved } from '../../course/levels.ts';
import type { Exercise, ExerciseMeta, Level, LessonMeta } from '../../course/types.ts';
import { useProgress } from '../../stores/progress.ts';
import AudioSource from '../AudioSource.vue';
import HtmlBlock from '../HtmlBlock.vue';
import ItemsForm from './ItemsForm.vue';
import WritingTask from './WritingTask.vue';

const props = defineProps<{
  ex: Exercise;
  lesson: LessonMeta;
  level: Level;
  next: ExerciseMeta | null;
  intro: string; // the lesson's words before the first exercise
  theory: string;
}>();

const progress = useProgress();
const router = useRouter();
const base = import.meta.env.BASE_URL;

const state = computed(() => progress.exercise(props.ex.id));
const status = computed(() => {
  const st = state.value;
  if (st.solved) return { tone: 'success' as const, text: props.ex.type === 'writing' ? '✓ сдано' : `✓ решено · лучший ${st.best}/${props.ex.items.length}` };
  if (st.attempts) return { tone: 'warning' as const, text: `попыток: ${st.attempts}` };
  return null;
});
const lessonSolved = computed(() => allSolved(props.lesson, progress.solved));

const tab = ref('task');
const tabs = computed(() => [
  { id: 'task', label: props.ex.type === 'reading' ? 'Текст' : props.ex.type === 'listening' ? 'Запись' : 'Задание' },
  { id: 'theory', label: 'Теория урока' },
]);

// Listening: the transcript opens once the answers have been checked.
const checked = ref(false);

const shown = ref(0);
const hints = computed(() => props.ex.hints.slice(0, shown.value));

async function finish() {
  await progress.markLessonDone(props.lesson.id);
  void router.push(props.lesson.next ? `/lesson/${props.lesson.next}` : '/');
}
</script>

<template>
  <section class="practice-grid">
    <div class="aura-card practice-side">
      <Tabs v-model="tab" :items="tabs">
        <template #panel="{ tab: t }">
          <div v-if="t.id === 'task'" class="aura-stack" style="--aura-gap: var(--space-3)">
            <div class="aura-flex" style="--aura-align: center; --aura-gap: var(--space-2); --aura-wrap: wrap">
              <h2 class="aura-text aura-text--h3">{{ ex.title }}</h2>
              <Badge v-if="status" :tone="status.tone">{{ status.text }}</Badge>
            </div>
            <HtmlBlock v-if="intro" class="muted intro" :html="intro" />
            <HtmlBlock v-if="ex.intro" class="task" :html="ex.intro" />
            <HtmlBlock v-if="ex.text" class="reading-text lesson" lang="en" :html="ex.text" />
            <audio v-if="ex.audio" class="player" controls preload="metadata" :src="base + ex.audio" />
            <template v-if="ex.link">
              <div class="aura-group">
                <a class="aura-btn aura-btn--secondary" :href="ex.link" target="_blank" rel="noopener">🎧 Открыть запись ↗</a>
              </div>
              <p class="aura-text aura-text--caption muted">Запись на сайте источника: послушай там, отвечай здесь.</p>
            </template>
            <AudioSource v-if="ex.source" :source="ex.source" />
            <details v-if="ex.transcript && checked" class="aura-accordion__item transcript">
              <summary class="aura-accordion__summary">Расшифровка</summary>
              <HtmlBlock class="aura-accordion__panel lesson" lang="en" :html="ex.transcript" />
            </details>
            <template v-if="ex.type === 'writing'">
              <HtmlBlock class="task" :html="ex.prompt" />
              <p class="aura-text aura-text--caption muted">Объём: {{ ex.words[0] }}–{{ ex.words[1] }} слов.</p>
              <div v-if="ex.targetGrammar.length" class="aura-stack" style="--aura-gap: var(--space-2)">
                <span class="aura-text aura-text--overline muted">Используй в тексте</span>
                <div class="aura-group" style="--aura-gap: var(--space-2)">
                  <span v-for="g in ex.targetGrammar" :key="g" class="aura-chip aura-chip--sm">{{ g }}</span>
                </div>
              </div>
            </template>
          </div>
          <HtmlBlock v-else class="lesson theory-panel" :html="theory" />
        </template>
      </Tabs>
    </div>

    <div class="practice-main aura-stack" style="--aura-gap: var(--space-4)">
      <component
        :is="ex.type === 'writing' ? WritingTask : ItemsForm"
        :ex="ex"
        :base="base"
        :lesson-id="lesson.id"
        :level="level"
        @checked="checked = true"
      >
        <template #hints>
          <div v-if="hints.length" class="aura-stack hints" style="--aura-gap: var(--space-2)">
            <Alert v-for="(h, i) in hints" :key="i" tone="warning" :title="`Подсказка ${i + 1} из ${ex.hints.length}`">{{ h }}</Alert>
          </div>
        </template>
        <template #tools>
          <button v-if="ex.hints.length" class="aura-btn aura-btn--secondary hint" type="button" aria-label="Подсказка" :disabled="shown >= ex.hints.length" @click="shown++">
            💡<span class="wide-only"> Подсказка</span>
          </button>
        </template>
        <template #next>
          <RouterLink v-if="next && state.solved" class="aura-btn aura-btn--success next" :to="{ path: `/practice/${lesson.id}`, query: { ex: next.id } }">
            Следующее упражнение →
          </RouterLink>
          <button v-if="lessonSolved" class="aura-btn aura-btn--success finish" type="button" @click="finish">Завершить урок →</button>
        </template>
      </component>
    </div>
  </section>
</template>
