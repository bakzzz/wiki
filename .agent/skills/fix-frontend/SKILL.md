---
name: fix-frontend
description: >
  Исправление Frontend-проблем, найденных при аудите. Безопасное исправление компонентов,
  рендера, адаптивности, performance, state management и кода. Каждое изменение проверяется ревизором.
  Триггеры: "исправь frontend", "fix frontend", "почини компоненты", "исправь рендер".
---

# Fix Frontend

Исправление проблем Frontend, найденных при fullstack-review.

## Методология безопасного исправления

### Перед каждым изменением

1. **Прочитать файл целиком** — понять контекст, не фрагмент
2. **Определить blast radius** — какие компоненты/страницы затронет изменение
3. **Проверить зависимости** — кто импортирует этот компонент/модуль
4. **Запланировать минимальное изменение** — одна проблема = один fix

### После каждого изменения

1. **Проверить что ничего не сломано** — запустить lint, type-check, билд
2. **Проверить визуально** — если есть dev-server, открыть страницу
3. **Зафиксировать** что именно было изменено и почему

## Стратегии исправления

### Компоненты и архитектура
- Разбиение God-компонентов: extract → test → replace → verify imports
- Prop drilling fix: определить границы контекста, создать Provider, мигрировать поэтапно
- Дублирование: извлечь общий компонент, заменить во всех местах, проверить props
- **Composition over Inheritance**: использовать composition pattern вместо наследования
- **Custom Hooks**: извлечь переиспользуемую логику в custom hooks

### Performance и оптимизация рендера
- Лишние ре-рендеры: добавить React.memo / useMemo / useCallback с профилированием
- Bundle size: dynamic import + React.lazy для тяжёлых компонентов
- Изображения: добавить loading="lazy", WebP, srcset — не трогая layout
- **List virtualization**: react-window / react-virtualized для больших списков (>100 items)
- **Code splitting**: React.lazy + Suspense для маршрутов и тяжёлых компонентов
- **Web Workers**: offload heavy computations (парсинг, шифрование)
- **React 18 concurrent**: useTransition для non-urgent updates, useDeferredValue для debounce
- **Throttle/debounce**: ограничить частоту scroll, resize, input обработчиков
- **React Fragments**: использовать <></> вместо лишних wrapper div
- **Immutable data**: immutable structures для эффективного diffing

### Адаптивность
- Breakpoints: вынести в CSS-переменные, единый файл tokens
- Touch targets: увеличить padding интерактивных элементов до ≥44px
- Горизонтальный скролл: проверить overflow, max-width, flex-wrap

### State management
- Разделить серверный/клиентский state
- Добавить loading/error/empty обработку для каждого async-запроса
- Настроить кеширование через React Query / SWR
- **Zustand/Jotai**: рассмотреть для complex global state вместо props

### Accessibility (базовая)
- **Semantic HTML**: header, nav, main, article, section, footer
- **ARIA labels**: на иконки-кнопки и интерактивные элементы
- **Keyboard navigation**: все элементы доступны через Tab
- **Color contrast**: WCAG AA ≥4.5:1

### Secure frontend practices
- **CSP headers**: Content-Security-Policy для защиты от XSS
- **Dependency audit**: `npm audit` / Snyk для проверки зависимостей
- **No exposed secrets**: API keys не в frontend-коде, использовать env vars
- **Sanitize user input**: DOMPurify для пользовательского HTML

### Качество кода
- Настроить ESLint/Prettier если отсутствует
- Заменить `any` типы на конкретные (TypeScript strict)
- Удалить console.log, организовать импорты

## Logic Check (IN-FLIGHT)

После **каждого** изменённого файла — ответить на 3 вопроса:

1. **СВЯЗЬ**: Это изменение связано с конкретным требованием из RTM/аудита? Каким?
2. **БЕЗОПАСНОСТЬ**: Это изменение НЕ ЛОМАЕТ существующую функциональность?
3. **ПОЛНОТА**: Нет ли пропущенных требований, зависящих от этого шага?

> Если ответ «Нет» или «Не уверен» — **ОСТАНОВИТЬСЯ** и разобраться перед продолжением.

## Ограничения (НЕ делать)

- ❌ Не менять бизнес-логику при исправлении UI
- ❌ Не обновлять зависимости (это DevOps)
- ❌ Не трогать backend/API код
- ❌ Не менять структуру БД
- ❌ Не рефакторить более 3 файлов за один fix без подтверждения

## Команды верификации

После каждого fix запускать:
```bash
npx eslint src/ --max-warnings=0   # lint
npx tsc --noEmit                    # type-check
npm run build                       # build проходит
npm test                            # тесты зелёные
npm audit --audit-level=high        # security audit
npx lighthouse http://localhost:PORT/ --only-categories=performance --output=json 2>&1 || echo "NO LIGHTHOUSE"
git diff --stat                     # проверить scope изменений
```
