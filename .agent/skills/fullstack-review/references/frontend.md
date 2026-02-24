# Frontend Review Checklist

## Содержание
- [Архитектура компонентов](#архитектура-компонентов)
- [Производительность рендера](#производительность-рендера)
- [Адаптивность и кроссбраузерность](#адаптивность)
- [Управление состоянием](#управление-состоянием)
- [Качество кода](#качество-кода)

## Архитектура компонентов

- [ ] Компоненты атомарные, переиспользуемые, с единой ответственностью
- [ ] Чёткое разделение: UI-компоненты vs контейнеры/страницы
- [ ] Props типизированы (TypeScript/PropTypes/JSDoc)
- [ ] Нет prop drilling глубже 2 уровней (используются контексты/stores)
- [ ] Композиция вместо наследования
- [ ] Нет дублирования логики между компонентами
- [ ] Lazy loading для тяжёлых компонентов и маршрутов

## Производительность рендера

- [ ] Нет лишних ре-рендеров (React.memo/useMemo/useCallback при необходимости)
- [ ] Виртуализация для длинных списков (>100 элементов)
- [ ] Изображения оптимизированы (WebP, lazy loading, srcset)
- [ ] Bundle size контролируется (tree-shaking, code splitting)
- [ ] Критический CSS инлайнится или загружается первым
- [ ] Шрифты: font-display: swap, preload
- [ ] Core Web Vitals: LCP < 2.5s, FID < 100ms, CLS < 0.1

## Адаптивность

- [ ] Responsive design: mobile-first или desktop-first подход консистентен
- [ ] Breakpoints определены в design system / CSS переменные
- [ ] Тач-интеракции для мобильных (40px+ touch targets)
- [ ] Тестирование на разных viewport'ах (320px - 2560px)
- [ ] Нет горизонтального скролла на мобильных
- [ ] Медиа-контент адаптируется (responsive images/video)

## Управление состоянием

- [ ] Глобальное vs локальное состояние разделено осознанно
- [ ] Серверный state управляется через data-fetching библиотеку (React Query/SWR/RTK Query)
- [ ] Нет store-hell (десятки мелких store файлов без структуры)
- [ ] Кеширование и инвалидация данных продуманы
- [ ] Оптимистичные обновления для UX-критичных операций
- [ ] Обработка loading/error/empty состояний везде

## Качество кода

- [ ] Единый code style (ESLint/Prettier/Biome настроены)
- [ ] Нет `any` типов (TypeScript strict mode)
- [ ] Нет console.log в продакшен коде
- [ ] Нет TODO/FIXME/HACK без issue-ссылок
- [ ] Именование файлов и компонентов консистентно
- [ ] Импорты организованы (абсолютные пути, barrel exports)
- [ ] Нет неиспользуемых зависимостей в package.json

## Web Performance (из Cloudflare web-perf)

- [ ] Определить framework и bundler:

| Tool | Конфиг файлы |
|------|-------------|
| Webpack | `webpack.config.js`, `webpack.*.js` |
| Vite | `vite.config.ts`, `vite.config.js` |
| Next.js | `next.config.js`, `next.config.mjs` |
| Nuxt | `nuxt.config.ts` |
| SvelteKit | `svelte.config.js` |

- [ ] Tree-shaking: `mode: 'production'`, `sideEffects` в package.json
- [ ] Нет barrel-файлов (`index.js` re-export) для tree-shakeable библиотек
- [ ] Полифиллы: browserslist не слишком широкий, нет лишнего core-js
- [ ] Компрессия: gzip/brotli в production, source maps отключены или external
- [ ] Bundle analyzer: запустить `npx webpack-bundle-analyzer` или `npx vite-bundle-visualizer`

## Антипаттерны (конкретные примеры)

```typescript
// ❌ ПЛОХО: Missing useEffect dependency
useEffect(() => {
  fetchData(userId);
}, []);  // userId не в deps

// ✅ ХОРОШО:
useEffect(() => {
  fetchData(userId);
}, [userId]);
```

```typescript
// ❌ ПЛОХО: Wholesale import
import _ from 'lodash';
_.get(obj, 'path');

// ✅ ХОРОШО: Named import (tree-shakeable)
import get from 'lodash/get';
get(obj, 'path');
```

```typescript
// ❌ ПЛОХО: Inline object in props (creates new ref every render)
<Component style={{ color: 'red' }} />

// ✅ ХОРОШО: Stable reference
const style = useMemo(() => ({ color: 'red' }), []);
<Component style={style} />
```

