# Как писать контент Englingo

Курс ведёт ученика с B1 до B2 за 16 недель по 45–60 минут в день. Ученик — русскоязычный взрослый, разработчик. Он давно занимается в Duolingo, но грамматику системно не учил. Теорию пишем по-русски, примеры и упражнения — по-английски.

После правок контента запусти `npm run validate`: он должен закончиться строкой `content OK`. При `npm run dev` курс перечитывается с диска на каждое сохранение, ошибка показывается прямо в браузере.

## Структура

```
content/
  <NN-module>/module.yaml
  <NN-module>/<NN-lesson>/lesson.md
  <NN-module>/<NN-lesson>/<exercise-id>/exercise.yaml
  cards/<NN-module>.yaml
```

Модули и их id (для поля `topic` в тестах):

| id | Тема |
|---|---|
| `00-diagnostic` | входной тест |
| `01-present-past` | Present Perfect и Past Simple, PP Continuous, Past Perfect, used to / would |
| `02-future` | will / going to / Present Continuous, Future Continuous и Perfect, time clauses |
| `03-modals` | obligation, ability, deduction, should have |
| `04-conditionals` | 0–3, mixed, wish / if only, unless / provided / in case |
| `05-passive` | пассив во всех временах, have something done, it is said that |
| `06-reported-speech` | statements, questions, reporting verbs |
| `07-clauses` | relative clauses (defining и non-defining), participle clauses |
| `08-verb-patterns` | gerund и infinitive, remember / stop / try, make / let / allow |
| `09-nouns-articles` | артикли, исчисляемые и неисчисляемые, quantifiers |
| `10-word-order` | порядок слов, косвенные вопросы, наречия, comparatives |
| `11-linking` | although / despite / whereas, linkers, cleft sentences, inversion |
| `12-prepositions` | предлоги места и времени, for / since / ago, during / while, by / until, as / like, сочетания с предлогами |
| `13-phrasal-verbs` | предложные глаголы, фразовые глаголы, verb + adverb + preposition |
| `14-pronouns-adjectives` | there / it, возвратные местоимения, one / ones, -ed / -ing, adjective или adverb, quite / rather, too / enough, such / what a |
| `15-word-formation` | словообразование: суффиксы и приставки (B2 First Use of English, Part 3) |
| `16-final` | итоговый тест в формате B2 First |

Каждый тематический модуль (01–15, c1-01–c1-17) содержит уроки грамматики, чтение, письмо и аудирование:

```
01-<тема>/   грамматика
02-<тема>/   грамматика
03-<тема>/   грамматика (сложные случаи и смешанная практика)
03a-<тема>/  необязательный четвёртый урок грамматики (имя сортируется до 04-reading)
04-reading/  kind: reading
05-writing/  kind: writing
06-listening/ kind: listening
```

ID упражнений **уникальны на весь курс**: префикс модуля плюс суть, например `m01-pp-vs-ps-gap`, `m01-reading`, `m01-writing`, `m01-listening`, `m01-dictation`.

## module.yaml

```yaml
title: "1. Настоящее и прошедшее"
summary: "Одна-две фразы: что умеешь к концу недели."
topics: ["Present Perfect vs Past Simple", "..."]
sources:
  - {title: "Oxford Practice Grammar — разделы о Present Perfect и Past Simple", url: "https://elt.oup.com/catalogue/items/global/grammar_vocabulary/oxford_practice_grammar/"}
```

## lesson.md

```markdown
---
title: "Present Perfect или Past Simple"
kind: grammar          # grammar (по умолчанию) | reading | writing | test
book: [11, 12, 13, 14, 15]   # юниты Oxford Practice Grammar Intermediate (content/book.yaml)
sources:
  - {title: "...", url: "..."}
---
Теория по-русски...

## Практика

Одна-две фразы перед упражнениями (необязательно).

```exercise m01-pp-vs-ps-gap
```
```

Требования к теории грамматического урока (примерно 600–1200 слов):

- Начни с того, **зачем** это нужно и чем это отличается от русского.
- Дай правило: форма → значение → маркеры. Используй таблицы.
- Примеры — живые английские предложения. Перевод давай только там, где он помогает.
- Используй блок `> ` для «Типичная ошибка русскоговорящих» и для заметок «B2-уровень».
- Добавь 1–2 блока ` ```quiz ` для мгновенной проверки понимания (YAML: `q`, `options`, `answer` с отсчётом от 0, `explain`).
- Заголовки — `##` и `###`. Уровень `#` не используем: название урока выводится само.

## exercise.yaml

Общие поля: `title`, `type`, `intro` (markdown, что делать), `hints` (список строк), `items`, `pass` (процент для зачёта, по умолчанию 80).

У каждого пункта (item) есть `q` и **обязательный** `explain`: одно-два предложения по-русски о том, почему ответ именно такой. Explain показывается после проверки и для верных, и для неверных ответов, поэтому он должен учить, а не просто повторять ответ.

| type | Поля пункта | Что видит ученик |
|---|---|---|
| `gap` | `q` с одним `___`, `answers` | поле ввода на месте `___` |
| `choice` | `q`, `options`, `answer` (индекс) | радиокнопки |
| `transform` | `q` (исходное предложение), `key` (КЛЮЧЕВОЕ СЛОВО), `stem` с одним `___`, `answers` | формат B2 First Part 4: вписать 2–5 слов, включая ключевое |
| `error` | `q` — предложение **с одной ошибкой**, `answers` — исправленное предложение целиком | поле, заполненное исходным предложением, его нужно исправить |
| `order` | `q` — инструкция или контекст, `answers[0]` — правильное предложение | перемешанные слова, из которых собирается предложение |
| `reading` | на уровне упражнения `text`; пункты — `choice` (есть `options`) или с `answers` (необязательный `___` в `q`) | текст слева, вопросы справа |
| `writing` | на уровне упражнения `prompt`, `words: [min, max]`, `target_grammar`, `checklist`, `model_answer`; без `items` | редактор, самопроверка, образец, кнопка «Скопировать для Claude» |
| `listening` | `audio` **или** `link`, `audio_source`, `transcript`; пункты как у `reading` (`choice` или `q` с `___` и `answers`) | плеер или кнопка «Открыть запись», вопросы, после проверки — расшифровка |
| `dictation` | у каждого пункта `audio`, `audio_source` и либо `answers` (фраза целиком), либо `options` + `answer`; `explain` — перевод и разбор | плеер на каждый пункт, поле ввода или варианты |

### Ответы (answers)

Проверка прощает регистр, лишние пробелы, запятые, финальную точку, кавычки и сокращения: `I've` = `I have`, `can't` = `cannot` = `can not`, `won't` = `will not`, `'d` = `had` или `would`. Сокращение `'s` **не** раскрывается, поэтому `he's gone` и `he has gone` указывай оба.

**Перечисляй все грамматически верные варианты**, которые уместны в контексте: `["have lived", "have been living"]`. Ученик не должен получить «неверно» за правильный ответ. Это самое важное требование к контенту.

- `gap`: ответ — только то, что вписывается в пропуск. Если в скобках дан глагол — `I ___ (live) here since 2019.`
- `transform`: ответ — только вписываемая часть, 2–5 слов, с ключевым словом в неизменной форме. Каждый вариант в `answers` должен содержать ключевое слово.
- `error`: ровно одна ошибка. Ответ — всё предложение целиком. Если ошибку можно исправить двумя способами, укажи оба.
- `order`: предложение из 5–12 слов, у которого только один естественный порядок. Если допустим и второй порядок, добавь его в `answers`. Плитки слов строятся из первого ответа, поэтому альтернативы должны состоять из тех же слов.

### YAML

Строки с `:`, `?`, `#`, `'`, `"`, `[`, `]`, `{` и строки, начинающиеся с `*` или `-`, **бери в кавычки**. Удобнее всегда использовать двойные кавычки или блочный стиль `|`. Неизвестные поля — ошибка загрузки, и это сделано специально.

```yaml
title: "Present Perfect или Past Simple"
type: gap
intro: "Поставь глагол в скобках в Present Perfect или Past Simple."
hints:
  - "Есть ли в предложении законченный момент в прошлом (yesterday, in 2019, ago)?"
items:
  - q: "I ___ (live) in Kazan since 2019."
    answers: ["have lived", "have been living"]
    explain: "**since** + точка отсчёта → действие продолжается до сих пор → Present Perfect."
  - q: "We ___ (meet) at a conference two years ago."
    answers: ["met"]
    explain: "**ago** — законченный момент в прошлом → Past Simple."
```

## Объём на модуль

- Уроки грамматики (01–03 и дополнительные `01a`, `03b`…): по 4 упражнения в каждом (новый урок — 3–4), по 10–12 пунктов в упражнении. Типы смешивай: в уроке — те, которых ему не хватает. На модуль — минимум одно `transform`, одно `error` и одно `order`.
- Дополнительный урок (`01a-…`) — подтема, которой тесно в соседнем уроке. Имя каталога сортируется до `04-reading`. Существующие уроки, упражнения и карточки не переименовываем и не удаляем: прогресс хранится по их id.
- 04-reading: в теории урока — стратегия чтения (как работать с этим типом вопросов) и таблица из 8–12 слов из текста с переводом. Упражнение `reading`: **оригинальный** текст на 450–600 слов уровня B2 (статья, блог, интервью), насыщенный грамматикой модуля, и 8–10 вопросов: 5–6 `choice` на понимание (как в B2 First Part 5), 2–3 с `answers` на лексику из текста.
- 05-writing: в теории урока — устройство жанра (эссе, письмо, статья, отзыв, отчёт — жанры B2 First), план по абзацам, таблица полезных фраз, типичные ошибки. Упражнение `writing`: `words: [140, 190]`, чек-лист из 5–7 пунктов (структура, целевая грамматика, связки, регистр, объём), образец ответа 160–190 слов.
- 06-listening: в теории урока (200–400 слов) — стратегия нужной части Listening (B2 First / C1 Advanced: Part 1 — короткие отрывки с выбором, Part 2 — монолог с пропусками, Part 3 — multiple matching, Part 4 — интервью с выбором), «Типичная ошибка русскоговорящих». Два упражнения `listening` на **свои** записи разных частей (2–3 минуты на B2, 3–4 на C1; 6–10 пунктов) и одно `dictation` на 8–10 фраз с грамматикой модуля (4–5 своих TTS + 4–6 Tatoeba). Записи насыщены грамматикой модуля. Образец — `01-present-past/06-listening`. Карточек урок не добавляет.
- Карточки (`cards/<module>.yaml`): не меньше 32 на модуль, 6–10 на урок. `lesson` — урок, после которого карточка открывается. Типы: правило («Когда Past Perfect?»), «Найди ошибку: …», «Переведи: …», коллокации из текста. Ответ короткий, 1–3 строки.

```yaml
- id: m01-since-for
  lesson: 01-present-past/01-present-perfect
  q: "**since** или **for**: I've known her ___ ten years."
  a: "**for** — длительность (for ten years); **since** — точка отсчёта (since 2015)."
```

## Учебник Oxford Practice Grammar

`content/book.yaml` содержит 153 юнита книги OPG Intermediate (Eastwood). Номера и страницы во 2-м и 3-м изданиях совпадают. У каждого урока грамматики есть поле `book:` со списком юнитов, которые он покрывает. На странице урока они выводятся блоком «сделай упражнения из книги». Текст книги для сверки лежит в `scratchpad/opg/4_Oxford_Practice_Grammar_with_Answers.txt` (если доступен).

Книгу используем как **карту тем и справочник правил**: какие подпункты есть в юните, какие нюансы и исключения. Теорию пересказываем своими словами. Примеры, упражнения и тексты пишем свои — из книги не копируем ни предложений, ни упражнений.

## Источники

Указывай только проверенные ссылки (они открываются):

- Oxford Practice Grammar: `https://elt.oup.com/catalogue/items/global/grammar_vocabulary/oxford_practice_grammar/`. В title пиши тему раздела, а **не номер юнита**.
- Perfect English Grammar — страницы `https://www.perfect-english-grammar.com/<...>-exercise-N.html` из списка ниже.
- englisch-hilfen: `https://www.englisch-hilfen.de/en/exercises_list/alle_grammar.htm`; порядок слов в вопросах — `https://www.englisch-hilfen.de/en/exercises/questions/word_order3.htm`.
- Agenda Web: `https://agendaweb.org/`.
- EasySpeak о порядке слов: `https://easyspeak.ru/blog/vsyo-o-grammatike/poryadok-slov-v-anglijskom-yazyke-pravila-postroeniya-predlozhenij`.
- English Galaxy (видео A2–B1): `https://vk.com/video/playlist/-98069659_15`.
- Cambridge B2 First (формат экзамена, для уроков чтения и письма): `https://www.cambridgeenglish.org/exams-and-tests/first/`.
- InstaText (редактор для письма): `https://instatext.io/editor/`.

- Видеокурс Vlad and English «Английский с A2 до B2 за 51 час» — разбор English Grammar in Use (Мёрфи), уроки 1–145, 10 роликов. Расшифровки и таймкоды — см. раздел «Видео в уроке» ниже.

Страницы Perfect English Grammar (выбирай подходящие по теме): `past-simple-present-perfect-1..4`, `present-perfect-present-perfect-continuous-1..3`, `past-perfect-exercise-1..3`, `past-perfect-past-perfect-continuous-exercise-1`, `past-simple-past-continuous-exercise-1..2`, `used-to-exercise-1..3`, `future-tenses-form-mixed-exercise-1`, `future-continuous-exercise-1`, `future-perfect-exercise-4`, `future-perfect-continuous-exercise-4`, `modal-verbs-of-ability-exercise-1`, `modal-verbs-of-obligation-exercise-1`, `modal-verbs-of-probability-exercise-1..2`, `negative-modals-exercise`, `zero-conditional-exercise-1`, `first-conditional-exercise-1`, `second-conditional-exercise-1`, `third-conditional-exercise-1`, `first-second-third-conditionals-exercise`, `passive-exercise-1..5`, `passive-verbs-two-objects-exercise-1`, `passive-subordinate-clauses-exercise-1`, `causatives-exercise-1..2`, `reported-speech-exercise-1`, `reported-speech-exercise-3..12`, `say-or-tell-exercise-1`, `relative-clauses-exercise-1..4`, `relative-pronouns-exercise`, `which-or-that-exercise`, `who-or-whom-exercise`, `dropping-the-relative-pronoun-exercise`, `where-or-that-exercise`, `gerunds-and-infinitives-exercise-1..4`, `let-or-make-exercise-1`, `articles-exercise-1..2`, `bed-home-work-town-exercise-1`, `some-and-any-exercise-1..2`, `a-little-a-few-exercise-1`, `indirect-questions-exercise-1..3`, `embedded-questions-in-statements-exercise-1`, `negative-questions-exercise-1..2`, `comparative-adjectives-exercise-1`, `superlatives-exercise-1`, `adverbs-or-adjectives-exercise-1`, `linking-words-contrast-exercise-1`, `linking-words-reason-exercise-2`, `inversion-exercise-1`, `participle-adjectives-exercise-1..2`, `make-or-do-exercise-1..4`, `phrasal-verbs-exercise-1..3`, `verbs-and-prepositions-exercise-1..2`, `adjectives-and-prepositions-exercise-1`.

Пример ссылки: `https://www.perfect-english-grammar.com/past-simple-present-perfect-1.html`.

## Видео в уроке

Если тема урока разобрана в видеокурсе Vlad and English, урок ссылается на видео с таймкодом начала видеоурока (раздел «Видео» в теле урока не делаем):

- Во фронтматтере `sources` — по записи на видеоурок: `{title: "Видео Vlad and English: урок 7 — Present Perfect, часть 1", url: "https://www.youtube.com/watch?v=KHAQFIjPg5E&t=9601s"}`.
- В `module.yaml` — по записи на часть видеокурса: `{title: "Видео Vlad and English: часть 1 — времена (уроки 1–18)", url: "https://www.youtube.com/watch?v=KHAQFIjPg5E"}`.

| Часть | Ролик | Уроки | Модули |
|---|---|---|---|
| 1. Времена | `KHAQFIjPg5E` | 1–18 | 01 |
| 2. Будущее и модальные | `V-cRBDeMn6I` | 19–37 | 02, 03 |
| 3. Условные, пассив, косвенная речь, вопросы | `m8pe5CiAVVE` | 38–52 | 04, 05, 06, 10 |
| 4. Герундий и инфинитив | `0VRFZ_tym2o` | 53–68 | 08, 01, 07, 11 |
| 5. Артикли и существительные | `eWTY7yqu2lE` | 69–81 | 09 |
| 6. Местоимения, quantifiers, придаточные | `1_FACNmXj9M` | 82–97 | 14, 09, 07 |
| 7. Прилагательные и наречия, сравнения, порядок слов | `7EQrZ8CbWkM` | 98–112 | 14, 10 |
| 8. Союзы и предлоги | `26J1ryERDWo` | 113–128 | 11, 04, 12 |
| 9. Предлоги после слов | `NvdqoMJlgCg` | 129–136 | 12, 13 |
| 10. Фразовые глаголы | `b9ap7lAe9z4` | 137–145 | 13 |

## Аудирование

### Своя озвучка: `scripts/tts.py`

Сценарий — `content/audio/tts/<NN>/<имя>.txt` (`<NN>` — номер модуля: `01`, `c1-05`), рядом собирается mp3 нейронными голосами Microsoft (edge-tts). Одна строка — одна реплика, префикс — диктор; акценты разные, как на экзамене:

| | | | |
|---|---|---|---|
| `A:` Sonia — британский, ж. | `B:` Ryan — британский, м. | `C:` Libby — британский, ж. | `D:` Thomas — британский, м. |
| `E:` Jenny — американский, ж. | `F:` Andrew — американский, м. | `G:` Natasha — австралийский, ж. | `H:` Connor — ирландский, м. |

```
# pause: 700        пауза между репликами, мс (по умолчанию 600)
# rate: -5%         темп; для диктанта можно чуть медленнее
A: Welcome back to Weekend Lives…
D: Well, it wasn't a big plan…
```

```bash
scripts/.venv/bin/python scripts/tts.py 01          # собрать mp3 модуля (только устаревшие)
```

`audio_source` такой записи: `{title: "Course recording (edge-tts)", url: "https://github.com/rany2/edge-tts", author: "<голоса через запятую>", license: "TTS"}`. `transcript` — текст сценария, реплики интервью с именами жирным (`**Presenter:**`), абзацами.

### Живые голоса: `scripts/tatoeba.py`

`scripts/pool.tsv` — английские фразы Tatoeba с записями носителей под CC BY / CC BY-SA и русским переводом (если есть). Столбцы: `sentence_id, audio_id, words, en, ru, username, license`. `python3 scripts/tatoeba.py fetch <sentence_id> …` скачивает mp3 в `content/audio/tatoeba/` и печатает готовый пункт диктанта; допиши в `explain` разбор и при необходимости второй вариант ответа (цифры словами, полная форма вместо сокращения). Одна запись — в одном упражнении курса.

### Внешние записи (`link`)

Записи под копирайтом (BBC Learning English, British Council LearnEnglish, Cambridge, VOA Learning English, TED, YouTube) не копируем: `link` на страницу, `audio_source` с `license: "©"`, вопросы и краткое содержание — свои.

## Авторское право

Все тексты, упражнения и примеры пишем сами. Из Oxford Practice Grammar и с сайтов **не копируем**, только ссылаемся.

## Ступень B2 → C1

Вторая ступень курса идёт по **Oxford Practice Grammar — Advanced** (George Yule, 2006) и его **Supplementary Exercises**. Цель — уровень экзамена Cambridge C1 Advanced. Модули лежат в тех же `content/`, их имена начинаются с `c1-`, поэтому сортируются после модулей B2:

| id | Тема | Главы книги |
|---|---|---|
| `c1-00-diagnostic` | входной тест C1 | — |
| `c1-01-sentences-tenses` | структура предложения, глаголы и дополнения; времена в тонкостях | 1, 2 |
| `c1-02-modals` | модальные: complex modals, prediction, willingness, deduction | 3 |
| `c1-03-negatives-questions` | отрицания и вопросы: порядок слов, negative words, question tags | 4 |
| `c1-04-passive` | пассив: модальные, инфинитивы и герундии, ergatives, get-passive, by-phrases | 5 |
| `c1-05-articles-nouns` | артикли и существительные в дискурсе, generic, compound | 6 |
| `c1-06-determiners` | determiners и quantifiers, fractions и percentages | 7 |
| `c1-07-pronouns-ellipsis` | местоимения, substitution (one, so, do so), ellipsis | 8 |
| `c1-08-adjectives-adverbs` | прилагательные и наречия: позиция, viewpoint и comment adverbs, equatives | 9 |
| `c1-09-prepositions` | предлоги и предложные фразы, фразовые глаголы C1 | 10 |
| `c1-10-infinitives-gerunds` | сложные формы инфинитива и герундия | 11 |
| `c1-11-reporting` | косвенная речь и reporting verbs на уровне C1 | 12 |
| `c1-12-noun-clauses` | noun clauses, subjunctive и should | 13 |
| `c1-13-relative-clauses` | relative clauses: reduced, с предлогами, whatever / whoever | 14 |
| `c1-14-conditionals` | условные: mixed, порядок, only if / even if / if so, инверсия | 15 |
| `c1-15-adverbial-clauses` | обстоятельственные придаточные: время, образ действия, причина, цель, результат, уступка, сокращённые | 16 |
| `c1-16-connectors-focus` | connectors, fronting, inversion, cleft sentences | 17 |
| `c1-17-use-of-english` | коллокации, зависимые предлоги, open cloze, word formation C1, трансформации C1 | — |
| `c1-18-final` | итоговый тест в формате C1 Advanced | — |

Отличия от B2:

- `module.yaml` содержит `level: c1` и `book: book-advanced`, title — `"C1 · 1. Предложения и времена"`.
- `book:` в уроке — номера разделов из `content/book-advanced.yaml`: `n = глава * 100 + раздел` (например, `302` — Complex modals). На странице разделы выводятся с номерами страниц основной книги и Supplementary Exercises.
- ID упражнений: префикс `c1mNN-` (например, `c1m02-complex-modals-gap`); ID карточек — `c1mNN-...`; файлы карточек — `cards/c1-NN-<тема>.yaml`.
- Теория — по-русски, но плотнее. Ученик уже знает базу B2, поэтому ошибки не базовые, а тонкие (регистр, стиль, нюансы значения). Больше формального и письменного английского.
- Упражнения: 10–12 пунктов. Больше `transform` в формате C1 Advanced Part 4 (3–6 слов), `error` с тонкими ошибками и `choice`, где все варианты грамматичны, а верен один по смыслу или регистру.
- Чтение: текст на 650–850 слов уровня C1 (публицистика, эссе, научпоп) и 8–10 вопросов: choice с четырьмя вариантами в стиле C1 Part 5 плюс вопросы на лексику и перефразирование.
- Письмо: жанры C1 Advanced (essay, letter/email, proposal, report, review), `words: [220, 260]`, образец на 230–260 слов.
- Книга — скан без текстового слоя. Страницу читаем рендером в PNG: в pymupdf (индексы с 0) страница основной книги — печатный номер + 3 до с. 179 включительно и + 4 начиная со с. 180 (в скане продублирована страница); Supplementary — печатный + 1. В `book-advanced.yaml` и в уроках всегда **печатные** номера. Книгу, как и раньше, используем только как карту тем и справочник правил.
