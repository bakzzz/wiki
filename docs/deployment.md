# 🚀 Git, Сервер, Деплой — Wiki

> Обновлено: 2026-02-24

## Серверная инфраструктура

Согласно требованиям: **обычный сервер компании (VPS/VDS)**. Отсутствуют облачные оркестраторы (типа K8s) на данном этапе.

| Компонент | Спецификация | Контейнер Docker |
|-----------|-------------|------------------|
| Nginx/Traefik | Reverse Proxy, SSL | \`nginx:alpine\` |
| Frontend React | Static Build (serve) | \`nginx:alpine\` (serve /usr/share/nginx/html) |
| Backend API | FastAPI (Uvicorn/Gunicorn)| \`python:3.10-slim\` |
| PostgreSQL | Database (Persistent DB) | \`postgres:15-alpine\` |
| MinIO S3 | Object Storage | \`minio/minio\` |

## Git

### Репозиторий
- Платформа: [GitHub](https://github.com/bakzzz/wiki)
- Видимость: Private

### Branching Strategy (Git Flow / GitHub Flow)
Основная ветка - `main` (production). Фичи разрабатываются в ветках `feature/*` и затем создается PR (Pull Request) или прямой мерж, если локальная разработка.

### Коммиты
Формат: `type(scope): описание`
Типы: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

## CI/CD Pipeline

Рекомендуется использование GitHub Actions:
1. **Lint** (Pytest ruff, ESLint).
2. **Build** (собрать React bundle, собрать Docker image для бэкенда).
3. **Deploy** (выполнить \`docker-compose up -d --build\` на целевом сервере).

## Домен и SSL
- Разворачивание по стандартным портам Nginx (80/443).
- SSL: Выпускается через certbot / Let's Encrypt (или предоставляется инфраструктурой DaFanasev-server).

## Мониторинг

| Что | Инструмент |
|-----|-----------|
| Logs Backend | Сбор stdout docker контейнеров (docker logs) |
| Metrics (Future) | Prometheus + Grafana |
| Errors Front | Sentry (Опционально) |
