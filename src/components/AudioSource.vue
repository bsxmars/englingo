<script setup lang="ts">
import type { AudioSource } from '../course/types.ts';

// Attribution under a recording: CC BY requires author and license.
defineProps<{ source: AudioSource }>();
</script>

<template>
  <p class="aura-text aura-text--caption muted audio-source">
    Запись: <a :href="source.url" target="_blank" rel="noopener">{{ source.title }}</a
    ><template v-if="source.author"> · {{ source.author }}</template> · {{ source.license }}
  </p>
</template>
