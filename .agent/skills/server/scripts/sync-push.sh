#!/bin/bash
# sync-push.sh — Синхронизация Antigravity на сервер dafanasev
# Использование:
#   ./sync-push.sh              — полная синхронизация
#   ./sync-push.sh --skills-only — только скилы и воркфлоу
#   ./sync-push.sh --dry-run    — показать что будет

set -euo pipefail

# === Конфигурация ===
SERVER_IP="195.133.15.207"
SERVER_USER="root"
SERVER="$SERVER_USER@$SERVER_IP"
REMOTE_BASE="/opt/antigravity"

DRY_RUN=""
SKILLS_ONLY=""

for arg in "$@"; do
    case $arg in
        --dry-run) DRY_RUN="true" ;;
        --skills-only) SKILLS_ONLY="true" ;;
    esac
done

echo "═══════════════════════════════════════"
echo "  🔄 Antigravity Sync Push"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "  $(hostname) → dafanasev"
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
    echo "   Проверьте: SSH_AUTH_SOCK=\"\" ssh $SERVER"
    exit 1
fi
echo "✅ SSH работает"

# === Создание директорий ===
echo ""
echo "📁 Создаю структуру на сервере..."
do_ssh "mkdir -p $REMOTE_BASE/{skills,workflows,brain,conversations,knowledge,hub-skills,project,ssh,meta}"

# === Функция синхронизации ===
sync_item() {
    local src="$1"
    local remote_dst="$2"
    local label="$3"
    
    if [ ! -e "$src" ]; then
        echo "   ⏭️  $label — не найден ($src)"
        return
    fi
    
    echo ""
    echo "📦 $label"
    echo "   $src → dafanasev:$remote_dst"
    
    if [ -n "$DRY_RUN" ]; then
        if [ -d "$src" ]; then
            echo "   [DRY] $(find "$src" -type f | wc -l) файлов"
        else
            echo "   [DRY] $(du -sh "$src" | cut -f1)"
        fi
        return
    fi
    
    if command -v rsync &>/dev/null; then
        SSH_AUTH_SOCK="" rsync -avz --delete \
            --exclude='.DS_Store' --exclude='__pycache__' \
            --exclude='08_SECRETS.md' --exclude='.archive' \
            -e "ssh -o StrictHostKeyChecking=no" \
            "$src" "$SERVER:$remote_dst"
    else
        # Fallback: tar + ssh
        if [ -d "$src" ]; then
            tar czf - -C "$(dirname "$src")" "$(basename "$src")" | \
                SSH_AUTH_SOCK="" ssh -o StrictHostKeyChecking=no "$SERVER" \
                "rm -rf $remote_dst/$(basename "$src") && tar xzf - -C $remote_dst"
        else
            SSH_AUTH_SOCK="" scp -o StrictHostKeyChecking=no "$src" "$SERVER:$remote_dst"
        fi
    fi
    echo "   ✅ Done"
}

# === Синхронизация ===

# 1. Скилы и воркфлоу
sync_item "$HOME/.agent/skills/" "$REMOTE_BASE/skills/" "Skills"
sync_item "$HOME/.agent/workflows/" "$REMOTE_BASE/workflows/" "Workflows"
sync_item "$HOME/.agent/rules.md" "$REMOTE_BASE/" "Agent Rules"

if [ -n "$SKILLS_ONLY" ]; then
    echo ""
    echo "✅ Skills-only sync завершён"
    exit 0
fi

# 2. Brain, conversations, knowledge
sync_item "$HOME/.gemini/antigravity/brain/" "$REMOTE_BASE/brain/" "Brain (артефакты)"
sync_item "$HOME/.gemini/antigravity/conversations/" "$REMOTE_BASE/conversations/" "Conversations"
sync_item "$HOME/.gemini/antigravity/knowledge/" "$REMOTE_BASE/knowledge/" "Knowledge"
sync_item "$HOME/.gemini/antigravity/skills/" "$REMOTE_BASE/hub-skills/" "Hub Skills"

# 3. Проект и SSH
sync_item "$HOME/dev/antigravity/" "$REMOTE_BASE/project/" "Project Docs"
[ -f "$HOME/.ssh/config" ] && sync_item "$HOME/.ssh/config" "$REMOTE_BASE/ssh/" "SSH Config"

# === Метаданные ===
if [ -z "$DRY_RUN" ]; then
    echo ""
    echo "📝 Метаданные..."
    do_ssh "cat > $REMOTE_BASE/meta/last_sync.json << METAEOF
{
    \"timestamp\": \"$(date -Iseconds)\",
    \"hostname\": \"$(hostname)\",
    \"user\": \"$(whoami)\",
    \"skills_count\": $(ls -d $HOME/.agent/skills/*/ 2>/dev/null | wc -l),
    \"workflows_count\": $(ls $HOME/.agent/workflows/*.md 2>/dev/null | wc -l),
    \"conversations_count\": $(ls $HOME/.gemini/antigravity/conversations/*.pb 2>/dev/null | wc -l)
}
METAEOF"
fi

# === Отчёт ===
echo ""
echo "═══════════════════════════════════════"
echo "  ✅ Синхронизация завершена!"
echo "═══════════════════════════════════════"
if [ -z "$DRY_RUN" ]; then
    do_ssh "echo 'Размер: ' && du -sh $REMOTE_BASE/ && echo 'Файлов:' && find $REMOTE_BASE -type f | wc -l"
fi
