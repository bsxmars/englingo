// Saves a draft after a pause in typing; leaving the page flushes a pending save.
import { onBeforeUnmount } from 'vue';

export function useDraft(save: () => void, delay = 800) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const flush = () => {
    if (!timer) return;
    clearTimeout(timer);
    timer = null;
    save();
  };
  addEventListener('pagehide', flush);
  // A phone may never fire pagehide: switching apps hides the page first.
  const onHidden = () => document.visibilityState === 'hidden' && flush();
  document.addEventListener('visibilitychange', onHidden);
  onBeforeUnmount(() => {
    flush();
    removeEventListener('pagehide', flush);
    document.removeEventListener('visibilitychange', onHidden);
  });
  return () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      save();
    }, delay);
  };
}
