import { createRouter, createWebHistory } from 'vue-router';
import course from 'virtual:course';
import CoursePage from './pages/CoursePage.vue';
import LessonPage from './pages/LessonPage.vue';
import NotFound from './pages/NotFound.vue';
import PracticePage from './pages/PracticePage.vue';
import ProgressPage from './pages/ProgressPage.vue';
import ReviewPage from './pages/ReviewPage.vue';
import { usePrefs } from './stores/prefs.ts';

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'course', component: CoursePage, meta: { title: 'Курс' } },
    { path: '/lesson/:id(.*)', name: 'lesson', component: LessonPage },
    { path: '/practice/:id(.*)', name: 'practice', component: PracticePage, meta: { wide: true } },
    { path: '/review', name: 'review', component: ReviewPage, meta: { title: 'Повторение' } },
    { path: '/progress', name: 'progress', component: ProgressPage, meta: { title: 'Прогресс' } },
    { path: '/:rest(.*)*', name: 'not-found', component: NotFound, meta: { title: 'Нет такой страницы' } },
  ],
  scrollBehavior(to, from, saved) {
    if (saved) return saved;
    if (to.hash) return { el: decodeURIComponent(to.hash), top: 72 };
    // Switching exercises keeps the page where it is.
    if (to.name === from.name && to.path === from.path) return false;
    return { top: 0 };
  },
});

// ?level=<code> picks the level shown everywhere and is remembered.
router.beforeEach((to) => {
  const code = to.query.level;
  if (typeof code !== 'string') return;
  if (course.levels.some((l) => l.code === code)) usePrefs().level = code;
  const { level: _, ...query } = to.query;
  return { ...to, query };
});

router.afterEach((to) => {
  if (typeof to.meta.title === 'string') document.title = `${to.meta.title} · Englingo`;
});

/** Pages without a fixed title set it once their content is known. */
export const setTitle = (t: string) => (document.title = `${t} · Englingo`);
