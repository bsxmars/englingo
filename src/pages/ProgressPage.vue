<script setup lang="ts">
import { Badge, HabitHeatmap } from '@ilomee/aura-vue';
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import Meter from '../components/Meter.vue';
import { activeDays, writingsNewestFirst } from '../course/progress.ts';
import { exerciseCounts, streak, topicTable, weak } from '../course/stats.ts';
import { day, plural } from '../course/text.ts';
import { useProgress } from '../stores/progress.ts';
import { toaster } from '../toaster.ts';
import { course, useCourse } from '../useCourse.ts';

const { level } = useCourse();
const progress = useProgress();
const code = computed(() => level.value.level.code);

const now = Date.now();
const active = computed(() => activeDays(progress.data));
const exercises = computed(() => exerciseCounts(course, code.value, progress.solved));
const table = computed(() => topicTable(course, code.value, progress.scores));
const weakList = computed(() => weak(course, code.value, progress.scores));

const lessonOfExercise = new Map(
  Object.values(course.lessons).flatMap((l) => l.exercises.map((e) => [e.id, l] as const)),
);
const writings = computed(() =>
  writingsNewestFirst(progress.data).flatMap((w) => {
    const l = lessonOfExercise.get(w.ex);
    if (l && course.modules.find((m) => m.id === l.module)?.level !== code.value) return [];
    return [{ ...w, lesson: l, title: l?.exercises.find((e) => e.id === w.ex)?.title ?? w.ex }];
  }),
);

// Four weeks, Monday to Sunday, column by column as the heatmap draws them.
const weeks = computed(() => {
  const start = new Date(now);
  start.setHours(12, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7) - 21);
  return Array.from({ length: 28 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d.getTime() > now ? 0 : active.value.has(day(d)) ? 1 : 0;
  });
});

function exportProgress() {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([progress.exportFile()], { type: 'application/json' }));
  a.download = `englingo-progress-${day(Date.now())}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const importing = ref(false);
async function importProgress(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  importing.value = true;
  try {
    const text = await file.text();
    if (!confirm('Заменить прогресс на этом устройстве данными из файла?')) return;
    await progress.importFile(text);
    toaster.success('Прогресс загружен');
  } catch (err) {
    toaster.danger('Это не файл прогресса', { description: (err as Error).message });
  } finally {
    importing.value = false;
  }
}

const date = (t: number) => new Date(t).toLocaleDateString('ru');
</script>

<template>
  <section class="aura-stack progress-page" style="--aura-gap: var(--space-5)">
    <h1 class="aura-text aura-text--h1">Прогресс · {{ level.level.track }}</h1>

    <div class="stats">
      <div class="aura-card stat"><span class="stat-n">{{ level.done }}<small>/{{ level.total }}</small></span><span class="muted">уроков пройдено</span></div>
      <div class="aura-card stat"><span class="stat-n">{{ exercises.done }}<small>/{{ exercises.total }}</small></span><span class="muted">упражнений решено</span></div>
      <div class="aura-card stat"><span class="stat-n">{{ writings.length }}</span><span class="muted">{{ plural(writings.length, 'текст написан', 'текста написано', 'текстов написано') }}</span></div>
      <div class="aura-card stat"><span class="stat-n">{{ streak(active, now) }}</span><span class="muted">дней подряд</span></div>
    </div>

    <section class="aura-card">
      <header class="aura-card__header"><h2 class="aura-text aura-text--h3">Последние 4 недели</h2></header>
      <HabitHeatmap :values="weeks" :weeks="4" :max="1" cell-label="занятия" />
      <p class="aura-text aura-text--caption muted heatmap-note">Столбец — неделя, сверху понедельник.</p>
    </section>

    <section v-if="table" class="aura-card">
      <header class="aura-card__header">
        <h2 class="aura-text aura-text--h3">Темы · {{ table.level.track }}</h2>
        <span class="aura-card__extra"><span class="aura-text aura-text--caption muted">последняя попытка</span></span>
      </header>
      <div class="aura-table-wrap">
        <table class="aura-table topics">
          <thead>
            <tr>
              <th>Модуль</th>
              <th v-for="t in table.tests" :key="t.ex.id">{{ t.ex.title }}</th>
              <th>Упражнения</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in table.rows" :key="r.module.id">
              <td>{{ r.module.title }}</td>
              <td v-for="(t, i) in r.tests" :key="i"><Meter v-if="t.total" :ok="t.ok" :total="t.total" /><span v-else class="faint">—</span></td>
              <td><Meter v-if="r.practice.total" :ok="r.practice.ok" :total="r.practice.total" /><span v-else class="faint">—</span></td>
            </tr>
          </tbody>
        </table>
      </div>
      <template v-for="t in table.tests" :key="t.ex.id">
        <p v-if="!t.taken" class="aura-text aura-text--caption muted">
          «{{ t.ex.title }}» ещё не пройден —
          <RouterLink :to="{ path: `/practice/${t.lesson.id}`, query: { ex: t.ex.id } }">пройти</RouterLink>.
        </p>
      </template>
    </section>

    <section v-if="weakList.length" class="aura-card">
      <header class="aura-card__header"><h2 class="aura-text aura-text--h3">Стоит повторить</h2></header>
      <ul class="aura-list aura-list--plain weak">
        <li v-for="w in weakList" :key="w.ex.id">
          <RouterLink :to="{ path: `/practice/${w.lesson.id}`, query: { ex: w.ex.id } }">{{ w.ex.title }}</RouterLink>
          <span class="muted"> · {{ course.modules.find((m) => m.id === w.lesson.module)?.title }}</span>
          <Badge size="sm" :tone="w.pct < 60 ? 'danger' : 'warning'">{{ w.pct }}%</Badge>
        </li>
      </ul>
    </section>

    <section class="aura-card">
      <header class="aura-card__header"><h2 class="aura-text aura-text--h3">Письмо</h2></header>
      <ul v-if="writings.length" class="aura-list aura-list--plain writings">
        <li v-for="w in writings" :key="w.at">
          <span class="muted">{{ date(w.at) }}</span>
          <RouterLink v-if="w.lesson" :to="{ path: `/practice/${w.lesson.id}`, query: { ex: w.ex } }"> {{ w.title }}</RouterLink>
          <template v-else> {{ w.ex }}</template>
          <Badge size="sm">{{ w.words }} слов</Badge>
        </li>
      </ul>
      <p v-else class="aura-text aura-text--body muted">Пока ни одного текста. Задание на письмо — последний урок каждого модуля.</p>
    </section>

    <section class="aura-card">
      <header class="aura-card__header"><h2 class="aura-text aura-text--h3">Перенос прогресса</h2></header>
      <div class="aura-stack" style="--aura-gap: var(--space-3)">
        <p class="aura-text aura-text--body muted">
          Прогресс хранится только на этом устройстве, в браузере или в установленном приложении. Сохрани его в файл, чтобы
          перенести на другое устройство или не потерять при очистке данных сайта; там открой «Загрузить из файла».
        </p>
        <div class="aura-group">
          <button class="aura-btn aura-btn--secondary" type="button" @click="exportProgress">⬇ Сохранить в файл</button>
          <label class="aura-btn aura-btn--ghost" :aria-disabled="importing">
            ⬆ Загрузить из файла
            <input type="file" accept="application/json,.json" hidden @change="importProgress" />
          </label>
        </div>
      </div>
    </section>
  </section>
</template>
