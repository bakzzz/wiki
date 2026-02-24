# Backend Review Checklist

## Содержание
- [Архитектура и паттерны](#архитектура-и-паттерны)
- [API дизайн](#api-дизайн)
- [Работа с данными](#работа-с-данными)
- [Обработка ошибок](#обработка-ошибок)
- [Производительность](#производительность)

## Архитектура и паттерны

- [ ] Чёткое разделение слоёв (controllers/services/repositories или аналог)
- [ ] Dependency Injection или явное управление зависимостями
- [ ] SOLID принципы соблюдены (особенно Single Responsibility, Interface Segregation)
- [ ] Бизнес-логика отделена от инфраструктурного кода
- [ ] Конфигурация через environment variables, не захардкожена
- [ ] Модульная структура — модули/сервисы слабо связаны
- [ ] Нет циклических зависимостей между модулями
- [ ] Нет God-object / God-function (>300 строк)

## API дизайн

- [ ] RESTful соглашения или чёткий GraphQL/gRPC контракт
- [ ] Версионирование API (v1, v2 или через headers)
- [ ] Консистентный формат ответов (envelope pattern или стандарт)
- [ ] HTTP статус-коды используются корректно (не всегда 200)
- [ ] Пагинация для коллекций (cursor или offset)
- [ ] Rate limiting настроен
- [ ] Документация API (OpenAPI/Swagger, GraphQL schema, protobuf)
- [ ] Валидация входных данных на границе API (Zod/Joi/Pydantic/etc.)
- [ ] CORS сконфигурирован правильно

## Работа с данными

- [ ] ORM/Query Builder используется (не raw SQL везде)
- [ ] Миграции базы данных версионированы и обратимы
- [ ] Индексы определены для часто используемых запросов
- [ ] N+1 проблемы отсутствуют (eager loading где нужно)
- [ ] Транзакции используются для связанных операций
- [ ] Soft delete vs hard delete — осознанный выбор
- [ ] Seed-данные для разработки есть
- [ ] Подключение к БД через connection pool

## Обработка ошибок

- [ ] Глобальный обработчик ошибок (middleware/interceptor)
- [ ] Кастомные error-классы с кодами и HTTP-статусами
- [ ] Ошибки логируются с достаточным контекстом (stack trace, request id)
- [ ] Пользователю не возвращаются stack traces и internal details
- [ ] Graceful shutdown при SIGTERM/SIGINT
- [ ] Health check эндпоинт (/health или /readiness)
- [ ] Retry/circuit breaker для внешних сервисов

## Производительность

- [ ] Кеширование (Redis/Memcached/in-memory) для горячих данных
- [ ] Async операции для I/O-bound задач
- [ ] Очереди (Bull/Celery/RabbitMQ) для тяжёлых операций
- [ ] Запросы к БД оптимизированы (EXPLAIN ANALYZE)
- [ ] Нет блокирующих операций в главном потоке
- [ ] Streaming для больших ответов/файлов
- [ ] Компрессия ответов (gzip/brotli)

## Антипаттерны (конкретные примеры)

```python
# ❌ ПЛОХО: N+1 запрос
for user in users:
    print(user.profile.name)  # Отдельный запрос на каждого

# ✅ ХОРОШО: Eager loading
users = User.objects.select_related('profile')
```

```python
# ❌ ПЛОХО: SQL injection
cursor.execute(f"SELECT * FROM users WHERE id = {user_id}")

# ✅ ХОРОШО: Параметризованный запрос
cursor.execute("SELECT * FROM users WHERE id = %s", [user_id])
```

```javascript
// ❌ ПЛОХО: Нет обработки ошибок
app.get('/api/users/:id', async (req, res) => {
  const user = await db.users.findById(req.params.id);
  res.json(user); // Что если user = null? Что если db упадёт?
});

// ✅ ХОРОШО: Полная обработка
app.get('/api/users/:id', async (req, res, next) => {
  try {
    const user = await db.users.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) { next(err); }
});
```

