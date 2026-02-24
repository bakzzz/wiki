---
name: fix-ux
description: >
  Исправление UI/UX-проблем, найденных при аудите. Юзабилити, accessibility (WCAG 2.2),
  визуальная консистентность, микро-взаимодействия. Изменения только в UI-слое, не трогая
  бизнес-логику. Триггеры: "исправь UX", "fix ux", "исправь дизайн", "fix accessibility".
---

# Fix UX

Исправление проблем UI/UX, найденных при fullstack-review.

## Методология безопасного исправления

### Принципы

1. **Только UI-слой** — стили, разметка, анимации, ARIA — не бизнес-логика
2. **Визуальная регрессия** — проверять что исправление не ломает другие страницы
3. **Progressive enhancement** — добавлять, не ломая существующее
4. **Mobile → Desktop** — проверять на мобильном viewport первым
5. **WCAG 2.2 Level AA** — все accessibility-фиксы по актуальному стандарту

## Стратегии исправления

### Юзабилити
- 3+ клика до действия: реорганизовать навигацию, shortcuts
- Формы без валидации: добавить inline validation, aria-describedby
- Нет loading states: добавить skeleton / spinner для каждого async блока
- Нет empty states: добавить информативное сообщение + CTA
- Нет confirmation: добавить confirm dialog для деструктивных действий
- **Redundant Entry (WCAG 3.3.7)**: не требовать повторного ввода данных в одной сессии
- **Consistent Help (WCAG 3.2.6)**: помощь в одном и том же месте на всех страницах

### Accessibility (WCAG 2.2)
- Семантика: заменить div на nav/main/article/section
- ARIA: добавить aria-label на иконки-кнопки, aria-describedby на ошибки форм
- Keyboard: табопорядок логичный, focus-visible стили, skip-to-content link
- Контрастность: проверить WCAG AA (≥4.5:1), исправить цвета
- Alt text: добавить на информационные изображения
- Motion: добавить @media (prefers-reduced-motion: reduce) для анимаций
- **Focus Not Obscured (WCAG 2.4.11)**: фокус не перекрывается другими элементами
- **Target Size Minimum (WCAG 2.5.8)**: интерактивные элементы ≥ 24×24 CSS px
- **Dragging Movements (WCAG 2.5.7)**: альтернатива drag-and-drop (кнопки, клик)
- **Accessible Authentication (WCAG 3.3.8)**: не полагаться на memory/cognitive tests
- **Reflow (WCAG 1.4.10)**: контент не теряется при zoom 200%

### Keyboard Navigation
- Логичный tab order через tabindex и DOM порядок
- Visible focus indicators (outline, box-shadow) — не удалять `outline: none`
- Skip-to-content link для screen readers
- Escape закрывает модалы, popups
- Arrow keys для навигации в lists, tabs, menus

### Визуальная консистентность
- Нет design tokens: создать CSS-переменные для цветов, spacing, radii, shadows
- Разные шрифты: унифицировать font-family, создать типографическую иерархию
- Непоследовательные spacing: внедрить шкалу (4px/8px basis)
- Нет dark mode: добавить через CSS-переменные + prefers-color-scheme

### Микро-взаимодействия
- Нет hover эффектов: добавить transition на интерактивные элементы
- Нет feedback: добавить ripple/scale/color на клик
- Нет toast/snackbar: добавить компонент подтверждения действий
- Нет smooth scroll: scroll-behavior: smooth для anchor-навигации

### Design System Integration
- **Accessibility в компонентах**: каждый компонент с a11y из коробки
- **Документация компонентов**: structure, focus order, keyboard, screen reader
- **Checklists в Figma/дизайн-тулах**: accessibility checklist при дизайне

## Logic Check (IN-FLIGHT)

После **каждого** изменённого файла — ответить на 3 вопроса:

1. **СВЯЗЬ**: Это изменение связано с конкретным требованием из RTM/аудита? Каким?
2. **БЕЗОПАСНОСТЬ**: Это изменение НЕ ЛОМАЕТ существующую функциональность?
3. **ПОЛНОТА**: Нет ли пропущенных требований, зависящих от этого шага?

> Если ответ «Нет» или «Не уверен» — **ОСТАНОВИТЬСЯ** и разобраться перед продолжением.

## Ограничения (НЕ делать)

- ❌ Не менять бизнес-логику, API вызовы, state management
- ❌ Не удалять контент или функциональность
- ❌ Не менять layout кардинально без согласования
- ❌ Не добавлять тяжёлые CSS-фреймворки (Bootstrap/Tailwind) если проект без них
- ❌ Не менять цветовую схему без согласования — только исправлять контрастность
- ❌ Не удалять focus indicators (`outline: none` без replacement)

## Команды верификации

После каждого fix запускать:
```bash
# Lint CSS
npx stylelint "src/**/*.css" 2>&1 || echo "NO STYLELINT"

# Build
npm run build

# Проверка accessibility
npx axe http://localhost:PORT/ 2>&1 || echo "NO AXE"
npx pa11y http://localhost:PORT/ 2>&1 || echo "NO PA11Y"
npx lighthouse http://localhost:PORT/ --only-categories=accessibility --output=json 2>&1 || echo "NO LIGHTHOUSE"

# Визуальная проверка (через browser tool)
# Открыть страницу, проверить на 375px и 1440px viewport
# Проверить keyboard navigation (Tab через все элементы)
# Проверить zoom 200%

git diff --stat
```
