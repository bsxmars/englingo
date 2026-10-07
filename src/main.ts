import '@ilomee/aura-core/css';
import '@ilomee/aura-core/components.css';
import './styles/app.css';
import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
import { router } from './router.ts';
import { useProgress } from './stores/progress.ts';

const app = createApp(App).use(createPinia());
// Progress first: every page shows it, and a page drawn without it would flash "not started".
await useProgress().load();
app.use(router).mount('#app');
