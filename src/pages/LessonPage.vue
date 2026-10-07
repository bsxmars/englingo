<script setup lang="ts">
import { Badge } from '@ilomee/aura-vue';
import { computed, watchEffect } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import BackLink from '../components/BackLink.vue';
import HtmlBlock from '../components/HtmlBlock.vue';
import LoadState from '../components/LoadState.vue';
import { useLesson } from '../composables/useLesson.ts';
import { setTitle } from '../router.ts';
import { useProgress } from '../stores/progress.ts';
import { course, moduleOf } from '../useCourse.ts';
import NotFound from './NotFound.vue';

const route = useRoute();
const router = useRouter();
const progress = useProgress();

const id = computed(() => String(route.params.id));
const meta = computed(() => course.lessons[id.value]);
const mod = computed(() => (meta.value ? moduleOf(id.value) : null));
const { data, failed } = useLesson(id);
const done = computed(() => progress.done.has(id.value));
const prev = computed(() => (meta.value?.prev ? course.lessons[meta.value.prev] : null));
const next = computed(() => (meta.value?.next ? course.lessons[meta.value.next] : null));

watchEffect(() => meta.value && setTitle(meta.value.title));

// A lesson without exercises is finished here; one with exercises, on the practice screen.
async function finish() {
  await progress.markLessonDone(id.value);
  void router.push(next.value ? `/lesson/${next.value.id}` : '/');
}
</script>

<template>
  <NotFound v-if="!meta" />
  <article v-else class="lesson">
    <BackLink :to="{ path: '/', query: { level: mod!.level } }">К курсу</BackLink>
    <div class="step-bar">
      <p class="aura-text aura-text--caption muted"><RouterLink to="/">Курс</RouterLink> / {{ mod!.title }}</p>
      <nav v-if="meta.exercises.length" class="aura-group steps" style="--aura-gap: var(--space-1)" aria-label="Шаги урока">
        <span class="aura-badge">1 · Теория</span>
        <RouterLink class="aura-badge aura-badge--info" :to="`/practice/${id}`">2 · Практика</RouterLink>
      </nav>
    </div>
    <h1 class="aura-text aura-text--h1 lesson-title">{{ meta.title }}</h1>

    <template v-if="data">
      <HtmlBlock :html="data.theory" />

      <section v-for="b in data.refs" :key="b.title" class="aura-card book-block">
        <header class="aura-card__header">
          <Badge tone="info">Учебник</Badge>
          <h2 class="aura-text aura-text--h3">{{ b.title }}</h2>
          <span v-if="b.author" class="aura-card__extra"><span class="aura-text aura-text--caption muted">{{ b.author }}</span></span>
        </header>
        <div class="aura-stack" style="--aura-gap: var(--space-2)">
          <p class="aura-text aura-text--body muted">
            Когда закончишь практику здесь, открой эти разделы в книге<template v-if="b.keyPage">; ответы в ключах на с. {{ b.keyPage }}</template
            ><template v-if="b.extraTitle">; дополнительные упражнения — в {{ b.extraTitle }}<template v-if="b.extraKeyPage">, ключи на с. {{ b.extraKeyPage }}</template></template>.
          </p>
          <ul class="aura-list aura-list--plain units">
            <li v-for="u in b.units" :key="u.name">
              <span class="unit-n">{{ u.name }}</span> {{ u.title }}
              <span class="muted">· с. {{ u.page }}<template v-if="u.extra"> · доп. с. {{ u.extra }}</template><template v-if="u.ex"> · {{ u.ex }}</template></span>
            </li>
          </ul>
        </div>
      </section>

      <section v-if="data.sources.length" class="aura-card sources-block">
        <header class="aura-card__header">
          <h2 class="aura-text aura-text--h3">Источники</h2>
          <span class="aura-card__extra"><span class="aura-text aura-text--caption muted">учебники, упражнения и видео по теме</span></span>
        </header>
        <ul class="aura-list">
          <li v-for="s in data.sources" :key="s.url"><a :href="s.url" target="_blank" rel="noopener">{{ s.title }}</a></li>
        </ul>
      </section>
    </template>
    <LoadState v-else :failed="failed" />

    <section v-if="meta.exercises.length" id="practice" class="aura-card aura-card--raised practice-cta">
      <header class="aura-card__header">
        <Badge>Практика</Badge>
        <h2 class="aura-text aura-text--h3">Теперь закрепи на практике</h2>
      </header>
      <p class="aura-text aura-text--body muted">
        Ответы проверяются сразу, с объяснением каждой ошибки. Урок засчитывается, когда в каждом упражнении правильно
        хотя бы 80% пунктов. Теорию можно открыть рядом с упражнением.
      </p>
      <ol class="aura-list practice-list">
        <li v-for="ex in meta.exercises" :key="ex.id">
          <RouterLink :to="{ path: `/practice/${id}`, query: { ex: ex.id } }">{{ ex.title }}</RouterLink>
          <Badge v-if="progress.solved.has(ex.id)" size="sm" tone="success">решено</Badge>
        </li>
      </ol>
      <footer class="aura-card__footer">
        <RouterLink class="aura-btn aura-btn--primary aura-btn--lg" :to="`/practice/${id}`">Перейти к практике →</RouterLink>
      </footer>
    </section>

    <footer class="lesson-nav">
      <RouterLink v-if="prev" class="aura-btn aura-btn--ghost" :to="`/lesson/${prev.id}`">← {{ prev.title }}</RouterLink>
      <span v-else />
      <template v-if="meta.exercises.length">
        <RouterLink v-if="next" class="aura-btn aura-btn--ghost" :to="`/lesson/${next.id}`">{{ next.title }} →</RouterLink>
      </template>
      <button v-else type="button" class="aura-btn aura-btn--primary" @click="finish">{{ done ? 'Дальше' : 'Урок пройден' }} →</button>
    </footer>
  </article>
</template>
