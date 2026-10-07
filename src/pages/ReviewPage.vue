<script setup lang="ts">
import { Alert, Badge } from '@ilomee/aura-vue';
import { loadCards } from 'virtual:course';
import { computed, ref, shallowRef } from 'vue';
import { RouterLink } from 'vue-router';
import HtmlBlock from '../components/HtmlBlock.vue';
import { dueCards } from '../course/review.ts';
import { Grade, review } from '../course/srs.ts';
import type { Card } from '../course/types.ts';
import { levelOf } from '../course/levels.ts';
import { useProgress } from '../stores/progress.ts';
import { course, useCourse } from '../useCourse.ts';

const { level } = useCourse();
const progress = useProgress();

const cards = shallowRef<Map<string, Card> | null>(null);
const failed = ref('');
loadCards().then(
  (list) => (cards.value = new Map(list.map((c) => [c.id, c]))),
  (e: Error) => (failed.value = e.message),
);

// Re-read the clock on every grade: a forgotten card comes back ten minutes later.
const now = ref(Date.now());
const due = computed(() => dueCards(course, progress.data, level.value.level.code, now.value));
const card = computed(() => (due.value[0] && cards.value?.get(due.value[0])) || null);
const unlocked = computed(() => Object.keys(progress.data.lessonsDone).some((id) => levelOf(course, id) === level.value.level.code));
const shown = ref(false);

const GRADES = [
  { g: Grade.Again, label: 'Не помню', cls: 'aura-btn--danger' },
  { g: Grade.Hard, label: 'Трудно', cls: 'aura-btn--secondary' },
  { g: Grade.Good, label: 'Помню', cls: 'aura-btn--primary' },
  { g: Grade.Easy, label: 'Легко', cls: 'aura-btn--success' },
];

function grade(g: Grade) {
  const c = card.value!;
  progress.saveCard(c.id, review(progress.card(c.id), g, Date.now()), g);
  shown.value = false;
  now.value = Date.now();
}
</script>

<template>
  <section class="aura-stack review" style="--aura-gap: var(--space-4)">
    <h1 class="aura-text aura-text--h1">Повторение · {{ level.level.track }}</h1>
    <Alert v-if="failed" tone="danger" title="Карточки не загрузились">{{ failed }}</Alert>
    <template v-else-if="due.length && !cards" />
    <template v-else-if="card">
      <p class="aura-text aura-text--body muted">Осталось на сегодня: <Badge>{{ due.length }}</Badge></p>
      <div class="aura-card aura-card--raised flashcard">
        <HtmlBlock class="card-q" :html="card.q" />
        <button v-if="!shown" type="button" class="aura-btn aura-btn--secondary card-show" @click="shown = true">Показать ответ</button>
        <template v-else>
          <HtmlBlock class="card-body" :html="card.a" />
          <div class="card-grades">
            <button v-for="b in GRADES" :key="b.g" type="button" class="aura-btn" :class="b.cls" @click="grade(b.g)">{{ b.label }}</button>
          </div>
        </template>
      </div>
      <p class="aura-text aura-text--caption muted">
        Из урока: <RouterLink :to="`/lesson/${card.lesson}`">{{ course.lessons[card.lesson]?.title }}</RouterLink>
      </p>
    </template>
    <template v-else-if="unlocked">
      <Alert tone="success" title="На сегодня всё повторено 🎉">Новые карточки появятся, когда пройдёшь следующие уроки.</Alert>
      <div><RouterLink class="aura-btn aura-btn--primary" to="/">К курсу</RouterLink></div>
    </template>
    <template v-else>
      <Alert tone="info" title="Пока пусто">
        Карточки открываются после прохождения уроков. Пройди первый урок — и здесь появятся вопросы.
      </Alert>
      <div><RouterLink class="aura-btn aura-btn--primary" to="/">К курсу</RouterLink></div>
    </template>
  </section>
</template>
