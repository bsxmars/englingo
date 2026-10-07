<script setup lang="ts">
// A writing task: draft with a word count, self-check against the checklist,
// then the model answer and a ready prompt for feedback from Claude.
import { Alert } from '@ilomee/aura-vue';
import { computed, nextTick, ref } from 'vue';
import { claudePrompt, writingDoc } from '../../course/claude.ts';
import { plural, wordCount } from '../../course/text.ts';
import type { Exercise, Level } from '../../course/types.ts';
import { useDraft } from '../../composables/useDraft.ts';
import { useProgress } from '../../stores/progress.ts';
import { toaster } from '../../toaster.ts';

// Both task kinds get the same props and slots from ExerciseView; each uses what it needs.
defineOptions({ inheritAttrs: false });
const props = defineProps<{ ex: Exercise; lessonId: string; level: Level }>();
const progress = useProgress();

const text = ref(progress.exercise(props.ex.id).draft);
const checked = ref<boolean[]>(props.ex.checklist.map(() => false));
const reviewing = ref(false);
const submitted = ref<{ words: number; prompt: string; doc: string } | null>(null);
const error = ref('');
const selfcheck = ref<HTMLElement | null>(null);
const after = ref<HTMLElement | null>(null);

const [min, max] = props.ex.words;
const words = computed(() => wordCount(text.value));
const save = useDraft(() => progress.saveDraft(props.ex.id, text.value));

async function review() {
  reviewing.value = true;
  await nextTick();
  selfcheck.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function submit() {
  const t = text.value.trim();
  const n = wordCount(t);
  if (n < Math.floor(min / 2)) {
    error.value = `Слишком коротко: ${n} ${plural(n, 'слово', 'слова', 'слов')}, нужно хотя бы ${min}.`;
    return;
  }
  error.value = '';
  await progress.saveWriting(props.ex.id, t, n, [...checked.value]);
  const at = new Date();
  const stamp = `${at.toLocaleDateString('sv')} ${at.toTimeString().slice(0, 5)}`;
  submitted.value = {
    words: n,
    prompt: claudePrompt(props.ex, props.level, t, n),
    doc: writingDoc(props.ex, props.lessonId, props.level, t, n, checked.value, stamp),
  };
  await nextTick();
  after.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function copy() {
  const s = submitted.value!.prompt;
  try {
    await navigator.clipboard.writeText(s);
  } catch {
    // Clipboard API needs focus and a secure context; fall back to selecting the text.
    const ta = document.createElement('textarea');
    ta.value = s;
    document.body.append(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
  toaster.success('Скопировано', { description: 'Вставь в чат с Claude.' });
}

async function share() {
  const s = submitted.value!.prompt;
  try {
    await navigator.share({ title: props.ex.title, text: s });
  } catch {
    // Cancelled by the learner.
  }
}
const canShare = typeof navigator.share === 'function';

function download() {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([submitted.value!.doc], { type: 'text/markdown' }));
  a.download = `${new Date().toLocaleDateString('sv')}-${props.ex.id}.md`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const ticked = computed(() => checked.value.filter(Boolean).length);
</script>

<template>
  <div class="aura-card writing" lang="en">
    <label class="aura-label" for="essay" lang="ru">Твой текст</label>
    <textarea
      id="essay"
      v-model="text"
      class="aura-textarea essay"
      rows="16"
      spellcheck="false"
      autocapitalize="sentences"
      placeholder="Пиши здесь. Черновик сохраняется сам."
      @input="save"
    />
    <p class="aura-text aura-text--caption word-count" :class="{ over: words > max, enough: words >= min && words <= max }" aria-live="polite" lang="ru">
      {{ words }} {{ plural(words, 'слово', 'слова', 'слов') }} · нужно {{ min }}–{{ max }}
    </p>
  </div>

  <div v-if="reviewing" ref="selfcheck" class="aura-card selfcheck">
    <header class="aura-card__header"><h3 class="aura-text aura-text--h3">Проверь себя</h3></header>
    <div class="aura-stack" style="--aura-gap: var(--space-2)">
      <p class="aura-text aura-text--body muted">Перечитай текст и отметь, что получилось. Честно — это только для тебя.</p>
      <label v-for="(c, i) in ex.checklist" :key="i" class="aura-check">
        <input v-model="checked[i]" type="checkbox" class="aura-checkbox self" />
        <span>{{ c }}</span>
      </label>
    </div>
  </div>

  <slot name="hints" />

  <div class="action-bar">
    <div class="aura-group action-bar__main">
      <button v-if="!reviewing" class="aura-btn aura-btn--primary" type="button" @click="review">Готово — проверить себя</button>
      <button v-else class="aura-btn aura-btn--primary" type="button" @click="submit">Сохранить работу</button>
      <slot name="tools" />
    </div>
    <div class="aura-group action-bar__next"><slot name="next" /></div>
  </div>

  <Alert v-if="error" tone="danger" title="Не сохранилось">{{ error }}</Alert>
  <template v-if="submitted">
    <Alert tone="success" title="Работа сохранена">
      {{ submitted.words }} {{ plural(submitted.words, 'слово', 'слова', 'слов') }}. Самопроверка: {{ ticked }} из {{ checked.length }}.
      Теперь сравни с образцом и отправь текст Claude.
    </Alert>
    <div ref="after" class="aura-card after-submit">
      <div class="aura-stack" style="--aura-gap: var(--space-3)">
        <h3 class="aura-text aura-text--h3">Обратная связь от Claude</h3>
        <p class="aura-text aura-text--body muted">
          Скопируй готовый запрос и вставь его в чат с Claude. Он исправит текст, объяснит ошибки по-русски и оценит работу
          по шкалам Cambridge {{ level.exam }}.
        </p>
        <div class="aura-group">
          <button class="aura-btn aura-btn--secondary" type="button" @click="copy">📋 Скопировать для Claude</button>
          <button v-if="canShare" class="aura-btn aura-btn--ghost" type="button" @click="share">Поделиться…</button>
          <button class="aura-btn aura-btn--ghost" type="button" @click="download">⬇ Скачать .md</button>
        </div>
        <details class="aura-accordion__item model">
          <summary class="aura-accordion__summary">Образец ответа</summary>
          <div class="aura-accordion__panel lesson" lang="en" v-html="ex.modelAnswer" />
        </details>
      </div>
    </div>
  </template>
</template>
