# DevOps Review Checklist

## Содержание
- [CI/CD Pipeline](#cicd-pipeline)
- [Контейнеризация](#контейнеризация)
- [Деплой и инфраструктура](#деплой-и-инфраструктура)
- [Мониторинг и логирование](#мониторинг-и-логирование)
- [Надёжность и восстановление](#надёжность-и-восстановление)

## CI/CD Pipeline

- [ ] CI pipeline определён в коде (GitHub Actions, GitLab CI, etc.)
- [ ] Этапы: lint → test → build → deploy (последовательно)
- [ ] Ветвление: feature branches → PR → main → deploy
- [ ] Автоматический деплой на staging при merge в main
- [ ] Manual approval для production deploy
- [ ] Кеширование зависимостей в CI (node_modules, pip cache)
- [ ] Артефакты сборки версионируются (Docker tags, build numbers)
- [ ] Pipeline проходит < 15 минут

## Контейнеризация

- [ ] Dockerfile есть и оптимизирован (multi-stage build)
- [ ] Образ на базе slim/alpine (не full ubuntu)
- [ ] `.dockerignore` настроен (исключает node_modules, .git, tests)
- [ ] Процесс запускается от non-root пользователя
- [ ] Health check в Dockerfile или docker-compose
- [ ] docker-compose для локальной разработки (app + DB + cache)
- [ ] Environment variables через `.env` или secrets, не захардкожены в образе
- [ ] Image scanning на уязвимости (Trivy/Snyk)

## Деплой и инфраструктура

- [ ] Infrastructure as Code (Terraform/Pulumi/CloudFormation)
- [ ] Environments разделены: dev → staging → production
- [ ] Zero-downtime deploy (rolling update / blue-green / canary)
- [ ] Rollback стратегия определена и протестирована
- [ ] Auto-scaling настроен (horizontal pod autoscaler / cloud auto-scaling)
- [ ] Load balancer с health checks
- [ ] SSL/TLS сертификаты автоматически обновляются (cert-manager/ACM)
- [ ] DNS управляется через IaC

## Мониторинг и логирование

- [ ] Structured logging (JSON формат, correlation ID)
- [ ] Централизованный сбор логов (ELK/Loki/CloudWatch)
- [ ] Метрики приложения (Prometheus/Datadog/New Relic)
- [ ] Алерты на критические события (error rate, latency, disk space)
- [ ] Dashboards для ключевых метрик
- [ ] Distributed tracing для микросервисов (Jaeger/Zipkin/OpenTelemetry)
- [ ] Uptime monitoring (external health checks)
- [ ] Log levels настраиваемы без передеплоя

## Надёжность и восстановление

- [ ] Backup стратегия: automated backups для БД
- [ ] Disaster recovery план документирован
- [ ] RTO и RPO определены
- [ ] Graceful degradation: приложение работает при отказе зависимостей
- [ ] Circuit breaker для inter-service calls
- [ ] Runbooks для типовых инцидентов
- [ ] Chaos engineering / failure injection tested
