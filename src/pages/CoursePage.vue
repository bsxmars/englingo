<script setup lang="ts">
import { Badge, Chip, Progress } from '@ilomee/aura-vue';
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { dueCards } from '../course/review.ts';
import { KIND, pct } from '../course/text.ts';
import { useProgress } from '../stores/progress.ts';
import { course, useCourse } from '../useCourse.ts';

const { level } = useCourse();
const progress = useProgress();
const due = computed(() => dueCards(course, progress.data, level.value.level.code, Date.now()).length);
</script>

<template>
  <section class="aura-stack hero" style="--aura-gap: var(--space-3)">
    <h1 class="aura-text aura-text--display">Английский: от B1 к C1</h1>
    <p class="aura-text aura-text--bodyL muted">
      Две ступени: B1 → B2 (Oxford Practice Grammar Intermediate, экзамен B2 First) и B2 → C1 (OPG Advanced, C1
      Advanced). Модуль — это неделя: 3–4 урока грамматики, текст для чтения и задание на письмо; упражнения из учебника
      — в конце каждого урока. Каждый день — 10 минут карточек. Ступень выбирается вверху, в шапке.
    </p>
  </section>

  <div class="aura-stack level-modules" style="--aura-gap: var(--space-4)">
    <div class="level-head">
      <div class="aura-stack" style="--aura-gap: var(--space-1)">
        <h2 class="aura-text aura-text--h2">{{ level.level.track }} <Badge>{{ level.level.exam }}</Badge></h2>
        <p class="aura-text aura-text--caption muted">Пройдено уроков: {{ level.done }} из {{ level.total }}</p>
      </div>
      <div class="aura-group level-actions">
        <RouterLink v-if="level.next" class="aura-btn aura-btn--primary" :to="`/lesson/${level.next.id}`">
          Продолжить: {{ level.next.title }} →
        </RouterLink>
        <RouterLink v-if="due" class="aura-btn aura-btn--secondary" to="/review">
          Повторить карточки <span class="aura-badge aura-badge--sm">{{ due }}</span>
        </RouterLink>
      </div>
    </div>
    <Progress :value="pct(level.done, level.total)" label="Прогресс ступени" />

    <section v-for="m in level.modules" :key="m.module.id" class="aura-card module" :class="{ soon: !m.lessons.length }">
      <header class="aura-card__header">
        <h3 class="aura-text aura-text--h3">{{ m.module.title }}</h3>
        <span class="aura-card__extra">
          <template v-if="m.lessons.length">
            <Badge v-if="m.done === m.total" tone="success">пройден</Badge>
            <Badge v-else>{{ m.done }}/{{ m.total }}</Badge>
          </template>
          <Badge v-else tone="warning">скоро</Badge>
        </span>
      </header>
      <div class="aura-stack" style="--aura-gap: var(--space-3)">
        <p class="aura-text aura-text--body muted">{{ m.module.summary }}</p>
        <ol v-if="m.lessons.length" class="aura-list lessons">
          <li v-for="l in m.lessons" :key="l.lesson.id" :class="{ done: l.done }">
            <RouterLink :to="`/lesson/${l.lesson.id}`">{{ l.lesson.title }}</RouterLink>
            <Badge v-if="KIND[l.lesson.kind]" size="sm">{{ KIND[l.lesson.kind] }}</Badge>
            <RouterLink
              v-if="l.exerciseTotal"
              class="aura-badge aura-badge--sm"
              :class="l.solved === l.exerciseTotal ? 'aura-badge--success' : 'aura-badge--info'"
              :to="`/practice/${l.lesson.id}`"
              >практика {{ l.solved }}/{{ l.exerciseTotal }}</RouterLink
            >
          </li>
        </ol>
        <div v-else-if="m.module.topics.length" class="aura-group" style="--aura-gap: var(--space-2)">
          <Chip v-for="t in m.module.topics" :key="t" size="sm">{{ t }}</Chip>
        </div>
        <details v-if="m.module.sources.length" class="aura-accordion__item">
          <summary class="aura-accordion__summary">Источники</summary>
          <div class="aura-accordion__panel">
            <ul class="aura-list">
              <li v-for="s in m.module.sources" :key="s.url"><a :href="s.url" target="_blank" rel="noopener">{{ s.title }}</a></li>
            </ul>
          </div>
        </details>
      </div>
    </section>
  </div>
</template>
