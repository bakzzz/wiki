---
name: fullstack-review
description: >
  Expert-level project review and testing across 6 professional disciplines: Frontend, Backend,
  Security, QA, DevOps, and UI/UX. Produces a scored assessment (0-10 per criterion) with a
  detailed Russian-language report including problems found and actionable recommendations.
  Use when the user asks to: (1) review/audit a project, (2) test project quality,
  (3) check code for issues, (4) assess project readiness, (5) run a fullstack review,
  (6) evaluate a codebase, or any variation of "проверь проект" / "оцени код" / "ревью проекта".
  Works with any project type: web apps, APIs, mobile, desktop, microservices, monoliths.
---

# Fullstack Review

Expert-level project assessment across 6 professional disciplines.

## Review Process

1. **Scan the project** — analyze structure, tech stack, dependencies, configs
2. **Run 6 expert reviews** — evaluate each discipline using its reference checklist
3. **Score each criterion** — assign 0-10 per discipline
4. **Cross-discipline analysis** — check interactions between layers
5. **Generate report** — Russian-language report with findings and recommendations

## Step 1: Project Scan

Analyze the project root to determine:

- Tech stack and frameworks (package.json, requirements.txt, go.mod, Cargo.toml, etc.)
- Project structure and architecture patterns
- Configuration files (.env, docker-compose, CI configs, etc.)
- Entry points and key modules

```bash
# Scan structure
find . -maxdepth 3 -not -path './.git/*' -not -path './node_modules/*' -not -path './.venv/*' | head -100
```

## Step 2: Run 6 Expert Reviews

For each discipline, load and follow the corresponding checklist:

| # | Роль | Файл чеклиста | Фокус |
|---|------|---------------|-------|
| 1 | 🎨 Frontend | [references/frontend.md](references/frontend.md) | Компоненты, рендер, адаптивность, производительность |
| 2 | ⚙️ Backend | [references/backend.md](references/backend.md) | API, архитектура, БД, обработка ошибок |
| 3 | 🔒 Security | [references/security.md](references/security.md) | Уязвимости, аутентификация, данные, OWASP |
| 4 | 🧪 QA | [references/qa.md](references/qa.md) | Тесты, покрытие, edge cases, CI |
| 5 | 🏗️ DevOps | [references/devops.md](references/devops.md) | CI/CD, контейнеры, деплой, мониторинг |
| 6 | 🎯 UI/UX | [references/ux.md](references/ux.md) | Юзабилити, accessibility, консистентность |

Load each reference file and evaluate the project against its criteria. Skip criteria not applicable to the project type (e.g., skip Frontend for a CLI tool).

### Cross-Discipline Checks

В дополнение к 6 дисциплинам, проверить cross-cutting concerns:

- **Accessibility (A11y)**: WCAG 2.2 Level AA compliance, keyboard navigation, screen reader support
- **Performance metrics**: Web Vitals (LCP < 2.5s, FID < 100ms, CLS < 0.1), bundle size, API response time p95
- **Architecture alignment**: SOLID principles, design patterns, separation of concerns
- **Small PR principle**: рекомендовать ≤400 строк на PR для эффективного review

## Step 3: Scoring

Rate each discipline 0-10:

| Балл | Уровень | Описание |
|------|---------|----------|
| 0-2 | 🔴 Критический | Серьёзные проблемы, проект не готов |
| 3-4 | 🟠 Низкий | Много недостатков, требует существенной доработки |
| 5-6 | 🟡 Средний | Базовый уровень, есть заметные проблемы |
| 7-8 | 🟢 Хороший | Качественная реализация, незначительные замечания |
| 9-10 | 🟣 Превосходный | Экспертный уровень, best practices соблюдены |

## Step 3.5: Logic Check (POST-CHECK)

Перед формированием отчёта — запустить верификацию по скиллу `logic-check`:

1. **Сверить RTM** — все ли требования задачи покрыты в review?
2. **Чеклист** — пройти чеклист верификации (все дисциплины проверены?)
3. **CoVe** — 3 контрольных вопроса:
   - «Если пользователь проверит [X], увидит ли он [Y]?»
4. **Конфликты** — нет ли противоречий между рекомендациями разных дисциплин?

> Если обнаружены пропуски или конфликты — исправить ДО генерации отчёта.

## Step 4: Report Format

Generate the report in Russian using this structure:

```
# 📊 Fullstack Review: [Название проекта]

## Сводка

| Критерий | Оценка | Уровень |
|----------|--------|---------|
| 🎨 Frontend | X/10 | [emoji] [Уровень] |
| ⚙️ Backend | X/10 | [emoji] [Уровень] |
| 🔒 Security | X/10 | [emoji] [Уровень] |
| 🧪 QA | X/10 | [emoji] [Уровень] |
| 🏗️ DevOps | X/10 | [emoji] [Уровень] |
| 🎯 UI/UX | X/10 | [emoji] [Уровень] |
| **Итого** | **XX/60** | **[Общий уровень]** |

## Performance Metrics (если применимо)

| Метрика | Значение | Цель | Статус |
|---------|----------|------|--------|
| LCP | [value] | < 2.5s | ✅/❌ |
| FID | [value] | < 100ms | ✅/❌ |
| CLS | [value] | < 0.1 | ✅/❌ |
| Bundle size | [value] | < 250KB | ✅/❌ |
| API p95 | [value] | < 500ms | ✅/❌ |

## Accessibility Score (если применимо)

| Проверка | Статус |
|----------|--------|
| Keyboard navigation | ✅/❌ |
| WCAG 2.2 AA contrast | ✅/❌ |
| ARIA labels | ✅/❌ |
| Focus management | ✅/❌ |

## 🎨 Frontend — X/10
### Найденные проблемы
- ...
### Рекомендации
- ...

## ⚙️ Backend — X/10
[аналогично для каждого критерия]

## 🏆 Итоговые рекомендации
Топ-3 приоритетных действия для улучшения проекта.
```

Adapt sections: if a criterion is not applicable, note "N/A — не применимо к данному типу проекта" and exclude from total score.

## Ограничения

- ❌ Не менять код при ревью — только анализировать и рекомендовать
- ❌ Не пропускать дисциплины без пометки N/A
- ❌ Не завышать оценки — объективность важнее позитива
- ❌ Не выставлять оценку без конкретных findings
