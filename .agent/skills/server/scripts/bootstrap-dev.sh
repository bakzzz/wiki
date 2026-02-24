#!/bin/bash
# bootstrap-dev.sh — Clone all GitHub repos to ~/dev/
# Part of the 'server' skill bootstrap process
#
# Usage: bash bootstrap-dev.sh
# Prerequisites: gh auth login

set -euo pipefail

DEV_DIR="$HOME/dev"
GH_USER="bakzzz"

echo "🔧 Bootstrap: клонирование репозиториев из github.com/$GH_USER"
echo ""

# Check prerequisites
if ! command -v gh &>/dev/null; then
    echo "❌ gh CLI не установлен"
    echo "   Установка: https://cli.github.com/"
    exit 1
fi

if ! gh auth status &>/dev/null; then
    echo "❌ gh не авторизован"
    echo "   Авторизация: gh auth login"
    exit 1
fi

mkdir -p "$DEV_DIR"

# Get all repos for the user
echo "📋 Получаю список репозиториев..."
repos=$(gh repo list "$GH_USER" --json name --jq '.[].name' --limit 100)

if [ -z "$repos" ]; then
    echo "⚠️  Нет репозиториев для клонирования"
    exit 0
fi

cloned=0
skipped=0
failed=0

while IFS= read -r repo; do
    target="$DEV_DIR/$repo"
    if [ -d "$target/.git" ]; then
        echo "  ⏭️  $repo — уже существует, pull..."
        cd "$target"
        git pull --quiet 2>/dev/null && echo "     ✅ обновлён" || echo "     ⚠️  pull не удался"
        skipped=$((skipped + 1))
    else
        echo "  📥 $repo — клонирую..."
        if gh repo clone "$GH_USER/$repo" "$target" -- --quiet 2>/dev/null; then
            echo "     ✅ ok"
            cloned=$((cloned + 1))
        else
            echo "     ❌ ошибка клонирования"
            failed=$((failed + 1))
        fi
    fi
done <<< "$repos"

echo ""
echo "📊 Результат:"
echo "   ✅ Склонировано: $cloned"
echo "   ⏭️  Обновлено: $skipped"
[ "$failed" -gt 0 ] && echo "   ❌ Ошибок: $failed"
echo ""
echo "📁 Проекты в $DEV_DIR:"
ls -d "$DEV_DIR"/*/ 2>/dev/null | while read d; do
    name=$(basename "$d")
    if [ -d "$d/.git" ]; then
        echo "   📦 $name (git ✅)"
    else
        echo "   📁 $name (no git)"
    fi
done
