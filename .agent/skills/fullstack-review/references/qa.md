# QA Review Checklist

## Содержание
- [Покрытие тестами](#покрытие-тестами)
- [Качество тестов](#качество-тестов)
- [Стратегия тестирования](#стратегия-тестирования)
- [Edge Cases и обработка ошибок](#edge-cases)
- [CI интеграция](#ci-интеграция)

## Покрытие тестами

- [ ] Unit-тесты: ≥70% покрытие бизнес-логики
- [ ] Integration-тесты: ключевые API endpoints протестированы
- [ ] E2E-тесты: критичные user flows покрыты (login, checkout, CRUD)
- [ ] Snapshot/contract тесты для API ответов
- [ ] Покрытие покрывает edge cases, а не только happy path
- [ ] Тестовое покрытие измеряется и отслеживается (coverage report)

## Качество тестов

- [ ] Тесты изолированы — не зависят друг от друга и от порядка выполнения
- [ ] AAA паттерн (Arrange-Act-Assert) или Given-When-Then
- [ ] Mock/stub/spy используются правильно (не мокают SUT)
- [ ] Fixtures и factories вместо хардкод данных в тестах
- [ ] Тесты читаемы — по названию понятно что проверяется
- [ ] Нет flaky тестов (нестабильных, зависящих от timing/order)
- [ ] Database rollback/cleanup между тестами
- [ ] Тесты не тестируют имплементацию, а тестируют поведение

## Стратегия тестирования

- [ ] Пирамида тестирования: много unit > меньше integration > мало E2E
- [ ] Smoke tests для быстрой проверки после деплоя
- [ ] Performance/load тесты для критичных эндпоинтов
- [ ] Regression тесты для исправленных багов
- [ ] Тестовые окружения изолированы (test DB, mock servers)
- [ ] Test data management: seed/factory данные, не production копии

## Edge Cases

- [ ] Пустые данные (null, undefined, "", [], {})
- [ ] Граничные значения (0, -1, MAX_INT, очень длинные строки)
- [ ] Невалидные данные (wrong type, malformed JSON, SQL injection strings)
- [ ] Конкурентный доступ (race conditions, double-submit)
- [ ] Сетевые сбои (timeout, connection refused, 5xx от external API)
- [ ] Большие объёмы данных (pagination edge: last page, empty page)
- [ ] Unicode/emoji/special characters в пользовательском вводе
- [ ] Timezone edge cases (DST, UTC midnight)

## CI интеграция

- [ ] Тесты запускаются автоматически на каждый PR/push
- [ ] Тесты блокируют merge при failure
- [ ] Параллельный запуск тестов для скорости
- [ ] Test coverage report публикуется
- [ ] Время выполнения тестов < 10 минут (для unit + integration)
- [ ] Нотификации при падении тестов
