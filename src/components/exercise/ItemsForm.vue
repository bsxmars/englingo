<script setup lang="ts">
// An auto-checked exercise: gap, choice, transform, error, order, reading.
import { Alert } from '@ilomee/aura-vue';
import { nextTick, ref } from 'vue';
import { grade, type ItemResult } from '../../course/grade.ts';
import { plural } from '../../course/text.ts';
import type { Exercise } from '../../course/types.ts';
import { useDraft } from '../../composables/useDraft.ts';
import { useProgress } from '../../stores/progress.ts';

// Both task kinds get the same props and slots from ExerciseView; each uses what it needs.
defineOptions({ inheritAttrs: false });
const props = defineProps<{ ex: Exercise }>();
const progress = useProgress();

const fresh = () => props.ex.items.map((it) => it.prefill);
const answers = ref<string[]>(fresh());
try {
  const draft: unknown = JSON.parse(progress.exercise(props.ex.id).draft || 'null');
  if (Array.isArray(draft)) {
    draft.forEach((v, i) => {
      if (i < answers.value.length && typeof v === 'string' && v !== '') answers.value[i] = v;
    });
  }
} catch {
  // A draft from an older version of the exercise: start clean.
}
const used = ref<Set<number>[]>(props.ex.items.map(() => new Set()));
const results = ref<(ItemResult | null)[]>(props.ex.items.map(() => null));
const summary = ref<{ tone: 'success' | 'danger'; title: string; text: string } | null>(null);
const form = ref<HTMLFormElement | null>(null);
const resultEl = ref<HTMLElement | null>(null);

const save = useDraft(() => progress.saveDraft(props.ex.id, JSON.stringify(answers.value)));

function changed(i: number) {
  results.value[i] = null;
  save();
}

// Order: tapping a word appends it to the sentence.
function addWord(i: number, w: number) {
  answers.value[i] = `${answers.value[i]!.trim()} ${props.ex.items[i]!.words[w]}`.trim();
  used.value[i]!.add(w);
  changed(i);
}
function clearWords(i: number) {
  answers.value[i] = '';
  used.value[i] = new Set();
  changed(i);
}

async function check() {
  const g = grade(props.ex, answers.value);
  progress.saveAttempt(props.ex.id, [...answers.value], g.oks, g.passed);
  results.value = g.results;
  const left = props.ex.pass - g.score;
  summary.value = {
    tone: g.passed ? 'success' : 'danger',
    title: `${g.score} из ${g.total}` + (g.passed ? ' — засчитано' : ''),
    text: g.passed
      ? g.score === g.total
        ? 'Без единой ошибки.'
        : 'Разбери ошибки ниже — объяснение под каждым пунктом.'
      : `Для зачёта нужно ещё ${left} ${plural(left, 'правильный ответ', 'правильных ответа', 'правильных ответов')}. Исправь отмеченные пункты и проверь снова.`,
  };
  await nextTick();
  const firstBad = form.value?.querySelector('.item.bad');
  (firstBad ?? resultEl.value)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function reset() {
  if (!confirm('Стереть все ответы?')) return;
  answers.value = fresh();
  used.value = props.ex.items.map(() => new Set());
  results.value = props.ex.items.map(() => null);
  summary.value = null;
  save();
}

function onKeydown(e: KeyboardEvent) {
  if (e.key !== 'Enter' || e.isComposing) return;
  if (e.metaKey || e.ctrlKey) {
    e.preventDefault();
    void check();
    return;
  }
  const t = e.target as HTMLElement;
  if (!t.matches('input[type=text]')) return;
  // Enter moves to the next field instead of submitting the form.
  e.preventDefault();
  const inputs = [...form.value!.querySelectorAll<HTMLInputElement>('input.answer[type=text]')];
  const next = inputs[inputs.indexOf(t as HTMLInputElement) + 1];
  if (next) next.focus();
  else {
    (t as HTMLInputElement).blur();
    void check();
  }
}

const isLast = (i: number) => i === props.ex.items.length - 1;
defineExpose({ check, reset });
</script>

<template>
  <form ref="form" class="items" autocomplete="off" novalidate lang="en" @submit.prevent="check" @keydown="onKeydown">
    <div v-for="(it, i) in ex.items" :key="it.n" class="item" :class="{ ok: results[i]?.ok, bad: results[i] && !results[i]!.ok }">
      <div class="item-row">
        <span class="item-n" aria-hidden="true">{{ it.n }}</span>
        <div class="item-body aura-stack" style="--aura-gap: var(--space-2)">
          <fieldset v-if="it.choice" class="item-choice" role="radiogroup">
            <legend class="item-q" lang="ru" v-html="it.q" />
            <label v-for="(o, oi) in it.options" :key="oi" class="aura-check">
              <input v-model="answers[i]" type="radio" class="aura-radio answer" :name="`${ex.id}-${i}`" :value="String(oi)" @change="changed(i)" />
              <span v-html="o" />
            </label>
          </fieldset>

          <template v-else-if="it.inline">
            <div v-if="it.q" class="item-q" v-html="it.q" />
            <div v-if="it.key"><span class="aura-badge key">{{ it.key }}</span></div>
            <div class="item-line">
              <span v-html="it.before" />
              <input
                v-model="answers[i]"
                class="aura-field answer gap"
                :class="{ wide: it.key }"
                type="text"
                spellcheck="false"
                autocapitalize="off"
                autocorrect="off"
                :enterkeyhint="isLast(i) ? 'done' : 'next'"
                :aria-label="`Ответ ${it.n}`"
                @input="changed(i)"
              />
              <span v-html="it.after" />
            </div>
          </template>

          <template v-else-if="it.words.length">
            <div class="item-q" lang="ru" v-html="it.q" />
            <div class="aura-group words" style="--aura-gap: var(--space-1)">
              <button
                v-for="(w, wi) in it.words"
                :key="wi"
                type="button"
                class="aura-chip word"
                :disabled="used[i]!.has(wi)"
                @click="addWord(i, wi)"
              >
                {{ w }}
              </button>
            </div>
            <div class="item-line">
              <input
                v-model="answers[i]"
                class="aura-field answer"
                type="text"
                spellcheck="false"
                autocapitalize="off"
                autocorrect="off"
                :enterkeyhint="isLast(i) ? 'done' : 'next'"
                :aria-label="`Предложение ${it.n}`"
                @input="changed(i)"
              />
              <button type="button" class="aura-btn aura-btn--text aura-btn--sm clear-words" aria-label="Собрать заново" @click="clearWords(i)">↺</button>
            </div>
          </template>

          <template v-else>
            <div v-if="it.q" class="item-q" v-html="it.q" />
            <input
              v-model="answers[i]"
              class="aura-field answer"
              type="text"
              spellcheck="false"
              autocapitalize="off"
              autocorrect="off"
              :enterkeyhint="isLast(i) ? 'done' : 'next'"
              :aria-label="`Ответ ${it.n}`"
              @input="changed(i)"
            />
          </template>

          <div v-if="results[i]" class="feedback" lang="ru" aria-live="polite">
            <div class="fb-head">
              <template v-if="results[i]!.ok">✓ Верно</template>
              <template v-else>✗ Правильно: <strong lang="en">{{ results[i]!.expected }}</strong></template>
            </div>
            <div v-if="results[i]!.explain" class="fb-explain" v-html="results[i]!.explain" />
          </div>
        </div>
      </div>
    </div>
  </form>

  <slot name="hints" />

  <div class="action-bar">
    <div class="aura-group action-bar__main">
      <button class="aura-btn aura-btn--primary check" type="button" title="⌘/Ctrl + Enter" @click="check">✓ Проверить</button>
      <slot name="tools" />
      <button class="aura-btn aura-btn--text reset" type="button" aria-label="Стереть ответы и начать сначала" @click="reset">↺<span class="wide-only"> Сначала</span></button>
    </div>
    <div class="aura-group action-bar__next"><slot name="next" /></div>
  </div>
  <div ref="resultEl">
    <Alert v-if="summary" :tone="summary.tone" :title="summary.title">{{ summary.text }}</Alert>
  </div>
</template>
