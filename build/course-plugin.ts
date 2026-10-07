// Vite plugin: the course from content/ as modules the app imports.
//
//	virtual:course   the index (levels, modules, lessons, exercise list, card ids),
//	                 loadLesson(id) and loadCards() — one lazy chunk per lesson
//	                 and one with all cards
//
// Any change under content/ reloads the course and the page.
import { resolve, sep } from 'node:path';
import type { Plugin } from 'vite';
import { compile, type Compiled } from './compile.ts';
import { load } from './content.ts';
import { dirFS } from './fs.ts';

const ID = 'virtual:course';
const LESSON = 'virtual:course/lesson/';
const CARDS = 'virtual:course/cards';

/** As a JS module: JSON.parse of a string literal parses faster than an object literal. */
const json = (v: unknown) => `export default JSON.parse(${JSON.stringify(JSON.stringify(v))});\n`;

export function course(contentDir = 'content'): Plugin {
  const root = resolve(contentDir);
  let compiled: Compiled | null = null;
  let order: string[] = [];
  const get = () => {
    if (!compiled) {
      compiled = compile(load(dirFS(root)));
      order = [...compiled.lessons.keys()];
    }
    return compiled;
  };

  return {
    name: 'englingo-course',

    resolveId(id) {
      if (id === ID || id.startsWith(LESSON) || id === CARDS) return '\0' + id;
    },

    load(id) {
      if (!id.startsWith('\0virtual:course')) return;
      const c = get();
      id = id.slice(1);
      if (id === ID) {
        const loaders = order.map((l, i) => `${JSON.stringify(l)}: () => import(${JSON.stringify(LESSON + i)})`);
        return (
          json(c.index) +
          `const lessons = {\n${loaders.join(',\n')}\n};\n` +
          `export const loadLesson = (id) => (lessons[id] ? lessons[id]().then((m) => m.default) : Promise.resolve(null));\n` +
          `export const loadCards = () => import(${JSON.stringify(CARDS)}).then((m) => m.default);\n`
        );
      }
      if (id === CARDS) return json(c.cards);
      return json(c.lessons.get(order[Number(id.slice(LESSON.length))]!));
    },

    configureServer(server) {
      server.watcher.add(root);
      const reload = (file: string) => {
        if (!file.startsWith(root + sep)) return;
        compiled = null;
        for (const m of server.moduleGraph.idToModuleMap.values()) {
          if (m.id?.startsWith('\0virtual:course')) server.moduleGraph.invalidateModule(m);
        }
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('change', reload).on('add', reload).on('unlink', reload);
    },
  };
}
