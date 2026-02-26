---
name: deploy
description: >
  Деплой Wiki на продакшн сервер dafanasev (wiki.chromaton.ru).
  Строгие правила синхронизации, сборки и проверки.
  Триггеры: "задеплой", "deploy", "выкати на прод", "обнови прод".
---

# Deploy — Wiki Production (wiki.chromaton.ru)

## ⛔ КРИТИЧЕСКИЕ ПРАВИЛА

> [!CAUTION]
> **НИКОГДА** не меняй пароли, порты или DATABASE_URL в `docker-compose.yml` без явного указания пользователя!
> PostgreSQL volume инициализируется один раз. Смена пароля в compose **НЕ** меняет пароль в уже созданном volume.

| Запрещено | Правильно |
|-----------|-----------|
| Менять `POSTGRES_PASSWORD` | Использовать оригинальный `wiki_password` |
| `git pull` на сервере | rsync с локальной машины |
| Включать тест-файлы в prod build | Исключить `*.test.*`, `setupTests.ts` в `tsconfig.app.json` |
| `docker compose restart` | `docker compose up -d --build <service>` |
| Деплоить без проверки `npm run build` | Сначала локальный `npm run build` и `npm run test` |

---

## 1. Архитектура

```
ЛОКАЛЬНАЯ МАШИНА (Dev)          СЕРВЕР dafanasev (Prod)
~/dev/ixora/wiki/          →    /opt/wiki/
  ├── backend/                    ├── backend/
  ├── frontend/                   ├── frontend/
  └── docker-compose.yml          └── docker-compose.yml

Домен: wiki.chromaton.ru
Маршрутизация: Traefik (SSL Let's Encrypt)
БД: PostgreSQL 15 (wiki_db, user: wiki_user, pass: wiki_password)
Хранилище: MinIO (minioadmin / minioadmin123)
```

---

## 2. Чеклист перед деплоем

```bash
# 1. Тесты
cd ~/dev/ixora/wiki/frontend && npm run test

# 2. Сборка (проверка TypeScript и Vite)
cd ~/dev/ixora/wiki/frontend && npm run build

# 3. Проверка docker-compose.yml — пароль БД
grep "wiki_password" ~/dev/ixora/wiki/docker-compose.yml || echo "⛔ ПАРОЛЬ НЕ wiki_password!"

# 4. Проверка tsconfig — исключение тестов
grep "setupTests" ~/dev/ixora/wiki/frontend/tsconfig.app.json || echo "⛔ Тесты не исключены из prod build!"
```

---

## 3. Команда деплоя

### Шаг 1: Синхронизация файлов (rsync)

```bash
SSH_AUTH_SOCK="" rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude 'frontend/dist' \
    --exclude '.git' \
    --exclude 'venv' \
    --exclude '.venv' \
    --exclude '__pycache__' \
    --exclude '.pytest_cache' \
    --exclude '.coverage' \
    -e "ssh -o StrictHostKeyChecking=no" \
    /home/dev/dev/ixora/wiki/ \
    root@195.133.15.207:/opt/wiki/
```

### Шаг 2: Пересборка контейнеров

```bash
# Только фронтенд (если менялся только frontend)
SSH_AUTH_SOCK="" ssh dafanasev "cd /opt/wiki && docker compose up -d --build frontend"

# Только бэкенд (если менялся только backend)
SSH_AUTH_SOCK="" ssh dafanasev "cd /opt/wiki && docker compose up -d --build backend"

# Всё (если менялся docker-compose.yml или оба)
SSH_AUTH_SOCK="" ssh dafanasev "cd /opt/wiki && docker compose up -d --build"
```

### Шаг 3: Проверка здоровья

```bash
# Логи бэкенда (должен быть "Application startup complete")
SSH_AUTH_SOCK="" ssh dafanasev "cd /opt/wiki && docker compose logs --tail=10 backend"

# Логи фронтенда (должен быть "Accepting connections")
SSH_AUTH_SOCK="" ssh dafanasev "cd /opt/wiki && docker compose logs --tail=10 frontend"

# HTTP статус (должен быть 200)
curl -s -o /dev/null -w "%{http_code}" "https://wiki.chromaton.ru/"
```

---

## 4. Учётные данные (НЕ МЕНЯТЬ!)

| Сервис | Переменная | Значение |
|--------|-----------|----------|
| PostgreSQL | `POSTGRES_USER` | `wiki_user` |
| PostgreSQL | `POSTGRES_PASSWORD` | `wiki_password` |
| PostgreSQL | `POSTGRES_DB` | `wiki_db` |
| MinIO | `MINIO_ROOT_USER` | `minioadmin` |
| MinIO | `MINIO_ROOT_PASSWORD` | `minioadmin123` |
| App | `SECRET_KEY` | `b58d92fd4c2f8240ba7b2c01ca74c439169fa89e` |

> [!WARNING]
> Пароль `wiki_password` зашит в PostgreSQL volume. Его нельзя менять через docker-compose без пересоздания volume (= потеря данных).

---

## 5. Откат

Если деплой сломал прод:

```bash
# 1. Посмотреть логи
SSH_AUTH_SOCK="" ssh dafanasev "cd /opt/wiki && docker compose logs --tail=30"

# 2. Откатить код к предыдущему коммиту
git revert HEAD
git push

# 3. Повторить деплой (Шаги 1-3)
```

---

## 6. Типичные ошибки и решения

| Ошибка | Причина | Решение |
|--------|---------|---------|
| `InvalidPasswordError` | Пароль в compose не совпадает с volume | Вернуть `wiki_password` |
| `Cannot find module 'vitest'` | Тест-файлы в prod build | Исключить в `tsconfig.app.json` |
| `Bad Gateway` (502) | Контейнер ещё стартует или упал | Подождать 30с, потом проверить логи |
| `Container name already in use` | Старый контейнер не удалён | `docker rm -f <name>` на сервере |
| Файлы не обновились | Docker использует кэш | `--build` флаг при `up -d` |
