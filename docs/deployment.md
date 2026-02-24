# 🚀 Git, Сервер, Деплой — Wiki

> Обновлено: 2026-02-24

## Git

### Репозиторий
- Платформа: [TODO: GitHub / GitLab / Bitbucket]
- URL: [TODO]
- Видимость: [TODO: Private / Public]

### Branching Strategy

```
main (production)
 └── develop (staging)
      ├── feature/xxx
      ├── fix/xxx
      └── hotfix/xxx
```

### Коммиты

Формат: `type(scope): описание`

Типы: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

### Code Review

- [TODO: Обязательный review? Сколько approvals?]

## CI/CD Pipeline

```mermaid
graph LR
    Push["Push"] --> Lint["Lint"]
    Lint --> Test["Test"]
    Test --> Build["Build"]
    Build --> Deploy["Deploy"]
```

### Stages

| Stage | Инструмент | Триггер |
|-------|-----------|---------|
| Lint | [TODO] | Push |
| Test | [TODO] | Push |
| Build | [TODO] | Merge to develop |
| Deploy staging | [TODO] | Merge to develop |
| Deploy production | [TODO] | Merge to main |

## Серверная инфраструктура

| Компонент | Сервис | Спецификация |
|-----------|--------|-------------|
| App server | [TODO] | — |
| DB server | [TODO] | — |
| CDN | [TODO] | — |
| DNS | [TODO] | — |

## Домен и SSL

- Домен: [TODO]
- SSL: [TODO: Let's Encrypt / Cloudflare / etc.]

## Мониторинг

| Что | Инструмент |
|-----|-----------|
| Uptime | [TODO] |
| Errors | [TODO: Sentry / etc.] |
| Logs | [TODO] |
| Metrics | [TODO] |

## Переменные окружения

| Переменная | Описание | Обязательна |
|-----------|----------|-------------|
| [TODO] | [TODO] | Да |
