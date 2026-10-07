import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, expect, it, vi } from 'vitest';
import { compiled } from '../../test/course-fixture.ts';
import { useProgress } from '../../stores/progress.ts';
import ItemsForm from './ItemsForm.vue';
import WritingTask from './WritingTask.vue';

const lesson = compiled.lessons.get('m/l')!;
const ex = (id: string) => lesson.exercises.find((e) => e.id === id)!;
const level = compiled.index.levels[0]!;

beforeEach(async () => {
  setActivePinia(createPinia());
  await useProgress().load();
});

it('checks typed answers and saves the attempt', async () => {
  const w = mount(ItemsForm, { props: { ex: ex('gap1') } });
  const inputs = w.findAll('input.answer');
  await inputs[0]!.setValue('has lived');
  await inputs[1]!.setValue('met');
  await w.find('button.check').trigger('click');
  const items = w.findAll('.item');
  expect(items[0]!.classes()).toContain('bad');
  expect(items[0]!.text()).toContain('Правильно: have lived');
  expect(items[0]!.html()).toContain('<strong>since</strong>');
  expect(items[1]!.classes()).toContain('ok');
  expect(w.text()).toContain('1 из 2');
  expect(w.text()).toContain('нужно ещё 1 правильный ответ');
  expect(useProgress().exercise('gap1')).toMatchObject({ attempts: 1, solved: false, best: 1 });

  // Typing again clears the mark of that item only.
  await inputs[0]!.setValue("'ve lived"); // a contraction counts as the full form
  expect(items[0]!.classes()).not.toContain('bad');
  await w.find('button.check').trigger('click');
  expect(w.text()).toContain('2 из 2 — засчитано');
  expect(useProgress().solved.has('gap1')).toBe(true);
});

it('builds an order answer from the word chips', async () => {
  const w = mount(ItemsForm, { props: { ex: ex('ord1') } });
  const words = ex('ord1').items[0]!.words;
  for (const word of ['I', 'am', 'at', 'the', 'station']) {
    await w.findAll('button.word')[words.indexOf(word)]!.trigger('click');
  }
  expect((w.find('input.answer').element as HTMLInputElement).value).toBe('I am at the station');
  expect(w.findAll('button.word').every((b) => b.attributes('disabled') !== undefined)).toBe(true);
  await w.find('button.check').trigger('click');
  expect(w.find('.item').classes()).toContain('ok');
});

it('restores answers from the draft', async () => {
  useProgress().saveDraft('gap1', JSON.stringify(['abc', '']));
  const w = mount(ItemsForm, { props: { ex: ex('gap1') } });
  expect((w.findAll('input.answer')[0]!.element as HTMLInputElement).value).toBe('abc');
});

it('a writing task is saved after the self-check and gives a prompt for Claude', async () => {
  const w = mount(WritingTask, { props: { ex: ex('w1'), lessonId: 'm/l', level } });
  await w.find('textarea').setValue('Hi');
  expect(w.text()).toContain('1 слово · нужно 4–20');
  await w.findAll('button').find((b) => b.text().includes('проверить себя'))!.trigger('click');
  await w.findAll('input[type=checkbox]')[0]!.setValue(true);
  await w.findAll('button').find((b) => b.text().includes('Сохранить работу'))!.trigger('click');
  await flushPromises();
  expect(w.text()).toContain('Слишком коротко');

  await w.find('textarea').setValue('I went to the cinema last night.');
  await w.findAll('button').find((b) => b.text().includes('Сохранить работу'))!.trigger('click');
  // IndexedDB answers on its own schedule.
  await vi.waitFor(() => expect(w.text()).toContain('Работа сохранена'));
  expect(w.text()).toContain('Самопроверка: 1 из 2');
  expect(w.html()).toContain('Model text.');
  expect(useProgress().solved.has('w1')).toBe(true);

  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  await w.findAll('button').find((b) => b.text().includes('Скопировать для Claude'))!.trigger('click');
  expect(writeText.mock.calls[0]![0]).toContain('I went to the cinema last night.');
  expect(writeText.mock.calls[0]![0]).toContain('B2 First');
});

it('progress survives a reload from IndexedDB', async () => {
  const p = useProgress();
  await p.markLessonDone('m/l');
  setActivePinia(createPinia());
  const again = useProgress();
  await again.load();
  expect(again.done.has('m/l')).toBe(true);
});
