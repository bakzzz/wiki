---
name: server
description: >
  Сервер dafanasev — SSH, синхронизация Antigravity, Docker, деплой, бэкап.
  Push/pull всех данных (скилы, воркфлоу, brain, conversations, knowledge).
  Триггеры: "подключись к серверу", "sync push", "sync pull", "bootstrap",
  "деплой", "бэкап", "статус сервера", "перезапусти бота".
---

# Server — dafanasev

Единый скилл для работы с сервером: SSH-подключение, синхронизация Antigravity, **деплой Prod-окружения** и управление базами данных.

---

## 1. Архитектура Dev / Prod (Важно для Агентов)

> [!IMPORTANT]
> - **Dev (Локальная машина):** Это текущая среда `debian`. Здесь мы пишем код и запускаем `docker-compose.yml` напрямую из папок проектов (`~/dev/ora`, `~/dev/x5/V2`).
> - **Prod (Сервер dafanasev):** Удаленная машина `195.133.15.207`, где крутятся боевые сервисы. Прод конфигурации лежат в `~/dev/antigravity/*-compose.yml`.

### Скрипты управления (Используй их вместо написания длинных SSH команд)

На локальной машине (Dev) в `~/dev/antigravity/` лежат два главных скрипта для работы с Prod:

1. **Деплой из Dev в Prod:**
   Если пользователь просит обновить Prod или выкатить изменения:
   ```bash
   # Выполни локально, скрипт сам загрузит код, потушит контейнеры и пересоберет их
   bash ~/dev/antigravity/deploy-to-prod.sh <project_name> # (например: ora, x5)
   ```

2. **Стянуть боевые данные Prod -> Dev:**
   Если нужно локально протестировать фичу на реальных данных:
   ```bash
   # Выполни локально, скрипт сделает дамп на сервере и зальет его в локальный docker
   bash ~/dev/antigravity/sync-from-prod.sh <project_name> # (например: ora, x5)
   ```

---

## 2. SSH-подключение

```bash
# Выполнить команду
SSH_AUTH_SOCK="" ssh dafanasev "command"

# Интерактивный shell
SSH_AUTH_SOCK="" ssh dafanasev

# Через wrapper
dafanasev-ssh "command"
dafanasev-ssh --auto        # autossh с авторестартом
```

> ⚠️ `SSH_AUTH_SOCK=""` обязателен — IDE прокидывает свой ssh-agent, который перебивает ключ.

### Конфигурация SSH

| Параметр | Значение |
|----------|----------|
| Host | `dafanasev` (в `~/.ssh/config`) |
| IP | `195.133.15.207` |
| User | `root` (SSH key only) |
| Ключ | `~/.ssh/id_ed25519` (ed25519) |
| Keep-alive | `ServerAliveInterval 15` / `ClientAliveInterval 30` |
| Wrapper | `~/.local/bin/dafanasev-ssh` |

### Безопасность сервера (настроено)

| Параметр | Значение |
|----------|----------|
| PermitRootLogin | `prohibit-password` |
| PasswordAuthentication | `no` |
| PubkeyAuthentication | `yes` |
| cloud-init override | Нейтрализован |

---

## 2. Управление окружениями (Скрипты синхронизации)

Вместо постоянной фоновой автоматической синхронизации (которая приводила к зависаниям), мы используем явные скрипты `deploy` и `sync`. 

### Деплой на Prod (из Dev в Prod)
```bash
bash ~/dev/antigravity/deploy-to-prod.sh <project_name>
```
Скрипт загружает конфигурации и код на `dafanasev`, останавливает старые контейнеры, ждет 60 секунд (для безопасного сброса кэшей и API) и поднимает новые.

### Загрузка боевых данных (из Prod в Dev)
```bash
bash ~/dev/antigravity/sync-from-prod.sh <project_name>
```
Скрипт делает SSH-дамп базы данных из Prod (dafanasev), скачивает его, загружает в локальный Dev-контейнер Docker, и копирует всю загруженную статику (картинки, звуки). Позволяет тестировать локально на реальных данных.

---

## 3. Резервное копирование Antigravity (Экосистема ИИ)

Скрипт `sync-push.sh` пушит **только логи, скилы и воркфлоу самого искусственного интеллекта** на сервер для бэкапа и шаринга между машинами. Он **НЕ** деплоит код проектов.

> [!WARNING]
> Автоматическая синхронизация (cron) отключена, так как приводила к зависаниям NetworkManager'а. Использовать **только вручную**.

```bash
# Ручной бэкап мозгов ИИ (Antigravity ecosystem) на dafanasev
bash ~/.agent/skills/server/scripts/sync-push.sh

# Только скилы
bash ~/.agent/skills/server/scripts/sync-push.sh --skills-only
```

Что сохраняется (Local -> Prod):
- `~/.agent/skills/`
- `~/.agent/workflows/`
- `~/.gemini/antigravity/brain/`
- `~/.gemini/antigravity/knowledge/`

---

## 4. Bootstrap новой машины (ИИ Экосистема)

Если вы переехали на новый ноутбук, стяните мозги с Prod сервера:

```bash
# 1. SSH-ключ должен быть добавлен на dafanasev
# 2. Скачать bootstrap
SSH_AUTH_SOCK="" scp root@195.133.15.207:/opt/antigravity/skills/server/scripts/sync-pull.sh /tmp/
# 3. Запустить восстановление
bash /tmp/sync-pull.sh
```

---

## 5. Инфраструктура сервера

```
СЕРВЕР: Timeweb Cloud NL-15 (Ubuntu 24.04)
IP:     195.133.15.207
USER:   root (SSH key only), deploy (git)

Проекты:
├── /opt/medbot          ← MedBot Production
├── /opt/medbot-dev      ← MedBot Development
├── /opt/chromaton       ← Chromaton API
├── /var/www/ixora       ← Ixora Expert
├── /var/www/x5doc       ← X5 CDE
├── /var/www/webapp      ← MedBot WebApp
└── /var/www/medbot-dev  ← MedBot Dev WebApp

Standalone: redis (alpine)
SSL: Let's Encrypt
```

---

## 6. Типовые операции

```bash
# Статус контейнеров
SSH_AUTH_SOCK="" ssh dafanasev "docker ps --format 'table {{.Names}}\t{{.Status}}'"

# Логи бота
SSH_AUTH_SOCK="" ssh dafanasev "cd /opt/medbot && docker compose logs --tail=50 bot"

# Перезапуск (⚠️ ждать 60 сек — Telegram!)
SSH_AUTH_SOCK="" ssh dafanasev "cd /opt/medbot && docker compose down && sleep 60 && docker compose up -d"

# Бэкап БД
SSH_AUTH_SOCK="" ssh dafanasev "cd /opt/medbot && docker compose exec -T postgres pg_dump -U medbot medbot > /opt/backups/medbot_$(date +%Y%m%d).sql"

# Диск
SSH_AUTH_SOCK="" ssh dafanasev "df -h / && docker system df"
```

## 7. Деплой

```bash
SSH_AUTH_SOCK="" ssh dafanasev << 'EOF'
cd /opt/medbot
docker compose down
sleep 60
sudo -u deploy git pull origin main
DEPLOY_TIMESTAMP=$(date +%Y-%m-%d_%H:%M)
sed -i "s/^DEPLOY_DATE=.*/DEPLOY_DATE=$DEPLOY_TIMESTAMP/" .env
docker compose up -d --build
sleep 10
docker compose exec -T bot alembic upgrade head
docker compose ps
docker compose logs --tail=20 bot
EOF
```

## 8. Критические правила

| Запрещено | Правильно |
|-----------|-----------|
| `docker compose restart` | `down && up -d` (перечитывает `.env`) |
| `git pull` от root | `sudo -u deploy git pull` |
| Деплой без pytest | Сначала тесты |
| Пропуск `sleep 60` | Ждать 60 сек (TelegramConflictError) |

## 9. Troubleshooting

| Проблема | Решение |
|----------|---------|
| SSH timeout | `SSH_AUTH_SOCK="" ssh dafanasev "echo ok"` |
| Permission denied | Проверить ключ: `ssh-keygen -l -f ~/.ssh/id_ed25519` |
| TelegramConflictError | `docker compose down && sleep 60 && up -d` |
| git permission denied | `sudo -u deploy git ...` |
| Код не обновился | `docker compose build --no-cache bot` |
