#!/bin/bash
# sync-pull.sh — Bootstrap Antigravity с сервера dafanasev
# Подтягивает всю экосистему на новую машину
#
# Использование:
#   ./sync-pull.sh                   — полная синхронизация
#   ./sync-pull.sh --skills-only     — только скилы и воркфлоу
#   ./sync-pull.sh --no-conversations — без истории чатов
#   ./sync-pull.sh --dry-run         — посмотреть что будет

set -euo pipefail

# === Конфигурация ===
SERVER_IP="195.133.15.207"
SERVER_USER="root"
SERVER="$SERVER_USER@$SERVER_IP"
REMOTE_BASE="/opt/antigravity"

DRY_RUN=""
SKILLS_ONLY=""
NO_CONVERSATIONS=""

for arg in "$@"; do
    case $arg in
        --dry-run) DRY_RUN="true" ;;
        --skills-only) SKILLS_ONLY="true" ;;
        --no-conversations) NO_CONVERSATIONS="true" ;;
    esac
done

echo "═══════════════════════════════════════"
echo "  ⬇️  Antigravity Sync Pull (Bootstrap)"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "  dafanasev → $(hostname)"
if [ -n "$DRY_RUN" ]; then echo "  🔍 DRY RUN"; fi
echo "═══════════════════════════════════════"

# === SSH-команда ===
do_ssh() {
    SSH_AUTH_SOCK="" ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no "$SERVER" "$@"
}

# === Проверка SSH ===
echo ""
echo "📡 Проверяю SSH..."
if ! do_ssh "echo ok" &>/dev/null; then
    echo "❌ Не могу подключиться к $SERVER"
    echo ""
    echo "Для настройки SSH на новой машине:"
    echo "  1. ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519"
    echo "  2. ssh-copy-id -i ~/.ssh/id_ed25519.pub $SERVER"
    echo "  3. SSH_AUTH_SOCK=\"\" ssh $SERVER"
    exit 1
fi
echo "✅ SSH работает"

# === Инфо о последней синхронизации ===
echo ""
echo "📋 Последняя синхронизация:"
do_ssh "cat $REMOTE_BASE/meta/last_sync.json 2>/dev/null" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(f'   Дата:     {d.get(\"timestamp\", \"?\")[:19]}')
    print(f'   Машина:   {d.get(\"hostname\", \"?\")}')
    print(f'   Скилов:   {d.get(\"skills_count\", \"?\")}')
    print(f'   Воркфлоу: {d.get(\"workflows_count\", \"?\")}')
    print(f'   Чатов:    {d.get(\"conversations_count\", \"?\")}')
except: print('   Нет данных')
" 2>/dev/null || echo "   Нет данных"

# === Создание локальных директорий ===
echo ""
echo "📁 Создаю локальные директории..."
mkdir -p \
    "$HOME/.agent/skills" "$HOME/.agent/workflows" \
    "$HOME/.gemini/antigravity/brain" "$HOME/.gemini/antigravity/conversations" \
    "$HOME/.gemini/antigravity/knowledge" "$HOME/.gemini/antigravity/skills" \
    "$HOME/dev/antigravity" "$HOME/.ssh"

# === Функция ===
pull_item() {
    local remote_src="$1"
    local local_dst="$2"
    local label="$3"
    
    echo ""
    echo "📦 $label"
    
    if ! do_ssh "test -e $remote_src" 2>/dev/null; then
        echo "   ⏭️  Не найден на сервере"
        return
    fi
    
    echo "   dafanasev:$remote_src → $local_dst"
    
    if [ -n "$DRY_RUN" ]; then
        do_ssh "du -sh $remote_src 2>/dev/null" | awk '{print "   [DRY] " $1}'
        return
    fi
    
    if command -v rsync &>/dev/null; then
        SSH_AUTH_SOCK="" rsync -avz \
            --exclude='.DS_Store' --exclude='__pycache__' \
            -e "ssh -o StrictHostKeyChecking=no" \
            "$SERVER:$remote_src" "$local_dst"
    else
        # Fallback: tar + ssh
        if do_ssh "test -d $remote_src" 2>/dev/null; then
            SSH_AUTH_SOCK="" ssh -o StrictHostKeyChecking=no "$SERVER" \
                "tar czf - -C $(dirname $remote_src) $(basename $remote_src)" | \
                tar xzf - -C "$local_dst"
        else
            SSH_AUTH_SOCK="" scp -o StrictHostKeyChecking=no "$SERVER:$remote_src" "$local_dst"
        fi
    fi
    echo "   ✅ Done"
}

# === Синхронизация ===

pull_item "$REMOTE_BASE/skills/" "$HOME/.agent/skills/" "Skills"
pull_item "$REMOTE_BASE/workflows/" "$HOME/.agent/workflows/" "Workflows"
pull_item "$REMOTE_BASE/rules.md" "$HOME/.agent/" "Agent Rules"

if [ -n "$SKILLS_ONLY" ]; then
    echo ""
    echo "✅ Skills-only pull завершён"
    exit 0
fi

pull_item "$REMOTE_BASE/brain/" "$HOME/.gemini/antigravity/brain/" "Brain"

if [ -z "$NO_CONVERSATIONS" ]; then
    pull_item "$REMOTE_BASE/conversations/" "$HOME/.gemini/antigravity/conversations/" "Conversations"
else
    echo ""
    echo "⏭️  Conversations — пропущены (--no-conversations)"
fi

pull_item "$REMOTE_BASE/knowledge/" "$HOME/.gemini/antigravity/knowledge/" "Knowledge"
pull_item "$REMOTE_BASE/hub-skills/" "$HOME/.gemini/antigravity/skills/" "Hub Skills"
pull_item "$REMOTE_BASE/project/" "$HOME/dev/antigravity/" "Project Docs"

# SSH Config — обработка конфликтов
echo ""
echo "📦 SSH Config"
if do_ssh "test -f $REMOTE_BASE/ssh/config" 2>/dev/null; then
    if [ -f "$HOME/.ssh/config" ]; then
        echo "   ⚠️  config уже есть, сохраняю как config.server"
        [ -z "$DRY_RUN" ] && SSH_AUTH_SOCK="" scp -o StrictHostKeyChecking=no \
            "$SERVER:$REMOTE_BASE/ssh/config" "$HOME/.ssh/config.server"
        echo "   Сравните: diff ~/.ssh/config ~/.ssh/config.server"
    else
        [ -z "$DRY_RUN" ] && SSH_AUTH_SOCK="" scp -o StrictHostKeyChecking=no \
            "$SERVER:$REMOTE_BASE/ssh/config" "$HOME/.ssh/config" && chmod 600 "$HOME/.ssh/config"
        echo "   ✅ Установлен"
    fi
else
    echo "   ⏭️  Не найден на сервере"
fi

# === Отчёт ===
echo ""
echo "═══════════════════════════════════════"
echo "  ✅ Bootstrap завершён!"
echo "═══════════════════════════════════════"
echo ""
echo "Скилов:    $(ls -d $HOME/.agent/skills/*/ 2>/dev/null | wc -l)"
echo "Воркфлоу:  $(ls $HOME/.agent/workflows/*.md 2>/dev/null | wc -l)"
echo ""
echo "🚀 Следующие шаги:"
echo "   1. Проверьте SSH: SSH_AUTH_SOCK=\"\" ssh dafanasev"
echo "   2. Запустите /onboarding в Antigravity"
