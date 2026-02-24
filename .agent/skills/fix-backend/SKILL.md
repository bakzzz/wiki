---
name: fix-backend
description: >
  Исправление Backend-проблем, найденных при аудите. Безопасное исправление API, архитектуры,
  работы с данными, обработки ошибок и производительности. Каждое изменение под контролем ревизора.
  Триггеры: "исправь backend", "fix backend", "почини API", "исправь сервер".
---

# Fix Backend

Исправление проблем Backend, найденных при fullstack-review.

## Методология безопасного исправления

### Перед каждым изменением

1. **Root Cause Analysis** — диагностировать причину, а не симптом
2. **Понять data flow** — откуда данные, куда идут, кто зависит
3. **Проверить контракт API** — не ломается ли существующий интерфейс
4. **Оценить миграции** — нужны ли изменения в БД, обратимы ли они
5. **Запланировать rollback** — как откатить если что-то пойдёт не так

### После каждого изменения

1. **Проверить тесты** — запустить существующий test suite
2. **Проверить API** — эндпоинты отвечают корректно
3. **Проверить логи** — нет новых ошибок
4. **Post-fix monitoring** — наблюдать метрики после деплоя

## Стратегии исправления

### Архитектура
- Нарушение слоёв: extract service layer, не менять controller interface
- God-класс: поэтапное извлечение методов в отдельные сервисы
- Циклические зависимости: инверсия через интерфейсы/events
- Хардкод конфигурации: вынести в env vars с fallback на текущие значения

### API дизайн
- HTTP коды: исправить ответы с неправильными статусами (не ломая клиентов)
- Валидация: добавить Zod/Joi/Pydantic на входе в эндпоинт
- Пагинация: добавить limit/offset или cursor — старое поведение = дефолт
- Rate limiting: добавить middleware, дефолт лимиты, конфиг через env
- **API versioning**: v1/v2 для breaking changes, deprecation headers
- **Consistent error format**: `{ success: false, error: { code, message, details } }`
- **Documentation**: OpenAPI/Swagger spec для каждого эндпоинта

### Работа с данными (Database optimization)
- N+1: заменить на eager loading (include/join/populate)
- Индексы: добавить для часто запрашиваемых полей (EXPLAIN ANALYZE)
- Транзакции: обернуть связанные операции
- Connection pool: настроить если прямое подключение
- **Sharding/partitioning**: для таблиц >10М записей
- **Query monitoring**: логировать медленные запросы (>100ms)
- **Кеширование**: Redis с TTL для hot data, invalidation strategy

### Обработка ошибок
- Глобальный handler: добавить middleware для необработанных ошибок
- Error-классы: создать базовый AppError с code/status/message
- Graceful shutdown: добавить обработку SIGTERM/SIGINT
- Health check: добавить /health endpoint
- **Structured error responses**: HTTP status + JSON body с error code
- **Error logging**: централизованный логгер, не expose sensitive data
- **Fallback mechanisms**: retry для критичных операций, dead letter queue

### Производительность
- Кеширование: Redis/in-memory для hot data, TTL = разумный дефолт
- Async: заменить блокирующие I/O на async/await
- Компрессия: добавить gzip middleware
- **Background jobs**: тяжёлые операции в worker processes (Bull, Celery)
- **Connection pooling**: database, HTTP clients, Redis
- **Monitoring post-fix**: track response time, error rate, throughput

## Logic Check (IN-FLIGHT)

После **каждого** изменённого файла — ответить на 3 вопроса:

1. **СВЯЗЬ**: Это изменение связано с конкретным требованием из RTM/аудита? Каким?
2. **БЕЗОПАСНОСТЬ**: Это изменение НЕ ЛОМАЕТ существующую функциональность?
3. **ПОЛНОТА**: Нет ли пропущенных требований, зависящих от этого шага?

> Если ответ «Нет» или «Не уверен» — **ОСТАНОВИТЬСЯ** и разобраться перед продолжением.

## Ограничения (НЕ делать)

- ❌ Не менять frontend-код
- ❌ Не ломать обратную совместимость API без согласования
- ❌ Не делать деструктивные миграции БД (не удалять колонки/таблицы)
- ❌ Не менять auth-механизм (это Security)
- ❌ Не удалять эндпоинты — только добавлять/исправлять
- ❌ Не fix-ить симптомы — всегда Root Cause Analysis

## Команды верификации

После каждого fix запускать:
```bash
# Node.js / TypeScript
npm test                            # тесты
npx tsc --noEmit                    # type-check

# Python
pytest                              # тесты
mypy src/                           # type-check

# Проверка API
curl -s http://localhost:PORT/health | jq .  # health check

# Database
# EXPLAIN ANALYZE <query>;          # проверить query plan

# Performance (после деплоя)
# Проверить response time p95, error rate, throughput

git diff --stat                     # scope изменений
```
