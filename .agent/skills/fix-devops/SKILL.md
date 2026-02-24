---
name: fix-devops
description: >
  Исправление DevOps-проблем, найденных при аудите. CI/CD, Docker, мониторинг, деплой,
  GitOps, IaC. Инфраструктурные изменения не должны ломать существующие пайплайны и деплои.
  Триггеры: "исправь devops", "fix devops", "настрой CI", "почини docker".
---

# Fix DevOps

Исправление проблем DevOps, найденных при fullstack-review.

## Методология безопасного исправления

### Принципы

1. **Инфраструктура как код** — все изменения коммитятся, не ручные
2. **Backward compatible** — новый CI/Docker не ломает старые процессы
3. **Тестировать локально** — docker build, docker-compose up перед пушем
4. **Инкрементально** — не переписывать CI полностью за один fix
5. **GitOps** — git как единый source of truth для инфра и приложения

## Стратегии исправления

### CI/CD Pipeline
- Нет CI: добавить .github/workflows/ci.yml или .gitlab-ci.yml (lint → test → build)
- Медленный CI: кеширование (actions/cache для node_modules, pip cache)
- Нет auto-deploy: добавить deploy stage с manual approval для prod
- Нет coverage: добавить step с coverage report и пороговым значением
- Нет DevSecOps: добавить SAST, SCA, secrets scanning в pipeline
- Нет CI templates: создать reusable workflow/templates для унификации

### Контейнеризация и Docker hardening
- Нет Dockerfile: создать multi-stage build (builder → runtime)
- Толстый образ: заменить FROM на slim/alpine, multi-stage build
- Root process: добавить USER nonroot, создать пользователя в Dockerfile
- Нет .dockerignore: добавить (node_modules, .git, .env, tests)
- Нет health check: добавить HEALTHCHECK в Dockerfile
- Нет docker-compose: создать для локальной разработки (app + DB + cache)
- **Нет image signing**: подписывать образы, сканировать на уязвимости (Trivy, Docker Scout)
- **Нет resource limits**: добавить CPU/memory limits в compose/K8s manifests
- **Read-only filesystem**: добавить `read_only: true` где возможно
- **Secrets management**: не хардкодить секреты, использовать Docker Secrets / Vault

### Infrastructure as Code (IaC)
- Нет IaC: Terraform/Ansible для конфигурации серверов
- **Нет IaC тестирования**: добавить Terratest / KitchenCI для валидации
- **Нет Policy as Code**: OPA / Sentinel для автоматического governance
- **Нет модульности**: разбить IaC на переиспользуемые модули (DRY)
- **Drift detection**: настроить terraform plan в CI для обнаружения дрифта

### Мониторинг и Observability
- Нет structured logging: добавить JSON formatter, correlation ID
- Нет health check endpoint: добавить /health, /readiness
- Нет алертов: добавить конфиг для alerting (uptime, error rate)
- Нет metrics: добавить Prometheus endpoint или middleware
- **Нет SLO/SLI**: определить Service Level Objectives и индикаторы
- **Нет distributed tracing**: добавить OpenTelemetry / Jaeger
- **Нет AIOps**: рассмотреть anomaly detection для production

### Надёжность
- Нет graceful shutdown: добавить обработку SIGTERM
- Нет backup стратегии: документировать backup procedure
- Нет SSL auto-renewal: добавить cert-manager / Let's Encrypt конфиг
- **Нет progressive delivery**: blue-green / canary deployments
- **Нет rollback strategy**: автоматический откат по SLO breach

### Cost Management (FinOps)
- **Нет контроля затрат**: добавить budget alerts в cloud
- **Нет оптимизации ресурсов**: right-sizing, spot instances, auto-scaling

## Logic Check (IN-FLIGHT)

После **каждого** изменённого файла — ответить на 3 вопроса:

1. **СВЯЗЬ**: Это изменение связано с конкретным требованием из RTM/аудита? Каким?
2. **БЕЗОПАСНОСТЬ**: Это изменение НЕ ЛОМАЕТ существующую функциональность?
3. **ПОЛНОТА**: Нет ли пропущенных требований, зависящих от этого шага?

> Если ответ «Нет» или «Не уверен» — **ОСТАНОВИТЬСЯ** и разобраться перед продолжением.

## Ограничения (НЕ делать)

- ❌ Не менять application-код (только infra/config файлы)
- ❌ Не удалять существующие CI stages — только добавлять/улучшать
- ❌ Не менять production secrets напрямую
- ❌ Не переключать cloud provider без согласования
- ❌ Не делать деструктивные изменения в IaC (destroy/replace)
- ❌ Не удалять мониторинг / алерты

## Команды верификации

После каждого fix запускать:
```bash
# Docker
docker build -t test-build . && echo "BUILD OK" || echo "BUILD FAILED"
docker compose config 2>&1                  # валидация compose
docker compose up -d --dry-run 2>&1         # dry run

# IaC (Terraform)
terraform validate 2>&1 || echo "NO TERRAFORM"
terraform plan -detailed-exitcode 2>&1 || echo "NO TERRAFORM"

# CI config
# GitHub Actions: actionlint .github/workflows/*.yml
# GitLab CI: gitlab-ci-lint (если установлен)

# Security scan
docker scout quickview 2>&1 || trivy image test-build 2>&1 || echo "NO SCANNER"

# Тесты
npm test || pytest
git diff --stat
```
