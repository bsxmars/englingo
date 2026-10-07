// The lesson chunk for the current route, loaded on demand.
import { loadLesson } from 'virtual:course';
import { ref, watch, type Ref } from 'vue';
import type { LessonData } from '../course/types.ts';

export function useLesson(id: Ref<string>) {
  const data = ref<LessonData | null>(null);
  const missing = ref(false);
  const failed = ref('');
  watch(
    id,
    async (lid) => {
      missing.value = false;
      failed.value = '';
      if (data.value?.id === lid) return;
      data.value = null;
      try {
        const d = await loadLesson(lid);
        if (lid !== id.value) return;
        data.value = d;
        missing.value = !d;
      } catch (e) {
        // Offline and not cached yet, or a deploy replaced the chunk.
        failed.value = (e as Error).message;
      }
    },
    { immediate: true },
  );
  return { data, missing, failed };
}
