<script setup lang="ts">
// Course HTML rendered at build time (build/markdown.ts), with its quizzes made live.
defineProps<{ html: string; as?: string }>();

function onClick(e: MouseEvent) {
  const opt = (e.target as HTMLElement).closest<HTMLButtonElement>('.quiz-opt');
  const quiz = opt?.closest('.quiz');
  if (!opt || !quiz || opt.disabled) return;
  const right = opt.dataset.correct === 'true';
  opt.classList.remove('aura-btn--secondary');
  opt.classList.add(right ? 'aura-btn--success' : 'aura-btn--danger');
  if (right) {
    quiz.querySelectorAll<HTMLButtonElement>('.quiz-opt').forEach((o) => (o.disabled = true));
    quiz.querySelector<HTMLElement>('.quiz-explain')!.hidden = false;
  }
}
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -- course content, rendered and escaped at build time -->
  <component :is="as ?? 'div'" v-html="html" @click="onClick" />
</template>
