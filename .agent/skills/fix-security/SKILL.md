---
name: fix-security
description: >
  Исправление Security-проблем, найденных при аудите. Безопасное устранение уязвимостей,
  усиление аутентификации, защита данных, OWASP Top 10, Proactive Controls 2024.
  Максимальная осторожность — каждое изменение проверяется дважды.
  Триггеры: "исправь security", "fix security", "закрой уязвимости".
---

# Fix Security

Исправление проблем безопасности, найденных при fullstack-review.

## ⚠️ Особый режим: Security Fix

Security-фиксы имеют **повышенный риск**. Применять правила:

1. **Один fix = одна уязвимость** — не группировать
2. **Тестировать каждый fix** — не пакетами
3. **Не ломать функциональность** — пользователи должны продолжать работать
4. **Backward compatible** — если это не critical vulnerability

### Remediation SLA

| Severity | Время на fix | Примеры |
|----------|-------------|---------|
| 🔴 P0 Critical | ≤ 24 часа | RCE, SQL injection в production, leaked secrets |
| 🟠 P1 High | ≤ 7 дней | Auth bypass, privilege escalation, XSS stored |
| 🟡 P2 Medium | ≤ 30 дней | CSRF, missing rate limiting, info disclosure |
| 🟢 P3 Low | ≤ 90 дней | Missing headers, verbose errors, outdated deps |

## Стратегии исправления

### Аутентификация и авторизация
- Хеширование: заменить MD5/SHA1 на bcrypt(12) / argon2id, миграция данных
- JWT: уменьшить TTL access token до 15min, добавить refresh rotation
- Brute force: добавить rate limiting на /login (5 req/min), account lockout
- RBAC: добавить middleware проверки ролей на каждый эндпоинт
- Session: установить httpOnly, Secure, SameSite=Strict на cookies
- **MFA support**: предложить TOTP/WebAuthn для критичных операций

### Защита данных
- HTTPS: добавить HSTS заголовок, redirect HTTP → HTTPS
- Секреты в коде: извлечь в env vars, добавить в .gitignore, ротировать
- Логи: маскировать PII (email → e***@***.com, телефон → ***-**-XX)
- Шифрование: AES-256 для sensitive data at rest
- **Output Encoding**: отдельно от input validation — encoding на выходе

### OWASP Top 10 (2021+)
- SQL Injection: заменить string concat на параметризованные запросы
- XSS: добавить output encoding, CSP заголовок
- IDOR: добавить проверку ownership (user_id = current_user.id) на каждый запрос
- Security headers: CSP, X-Frame-Options, X-Content-Type-Options
- Dependencies: обновить пакеты с known CVE (npm audit fix / pip audit)
- **SSRF**: валидировать внешние URL, whitelist хостов
- **Mass Assignment**: whitelist разрешённых полей при update

### OWASP Proactive Controls 2024
- **C1**: Define Security Requirements в начале проекта
- **C2**: Leverage Security Frameworks — не изобретать крипто
- **C3**: Secure Database Access — ORM, параметризованные запросы
- **C4**: Encode and Escape Data — context-aware output encoding
- **C5**: Validate All Inputs — whitelist, schema validation
- **C6**: Implement Digital Identity — secure auth, session management
- **C7**: Enforce Access Controls — deny by default, RBAC
- **C8**: Protect Data Everywhere — encryption at rest and in transit
- **C9**: Implement Security Logging & Monitoring
- **C10**: Handle All Errors & Exceptions — не leak sensitive info

### Software Integrity
- **Code signing**: подписывать releases
- **CI/CD pipeline integrity**: защита от supply chain attacks
- **Dependency pinning**: lock files, hash verification
- **SBOM**: Software Bill of Materials для прозрачности

### Секреты и конфигурация
- .env: убедиться что в .gitignore, проверить git history
- Хардкод: grep "password|secret|api_key" → вынести в env
- Debug mode: убедиться что выключен в production конфигурации
- CORS: ограничить конкретными доменами

## Logic Check (IN-FLIGHT)

После **каждого** изменённого файла — ответить на 3 вопроса:

1. **СВЯЗЬ**: Это изменение связано с конкретным требованием из RTM/аудита? Каким?
2. **БЕЗОПАСНОСТЬ**: Это изменение НЕ ЛОМАЕТ существующую функциональность?
3. **ПОЛНОТА**: Нет ли пропущенных требований, зависящих от этого шага?

> Если ответ «Нет» или «Не уверен» — **ОСТАНОВИТЬСЯ** и разобраться перед продолжением.

## Ограничения (НЕ делать)

- ❌ Не менять бизнес-логику приложения
- ❌ Не удалять функциональность ради безопасности без согласования
- ❌ Не менять схему БД (только добавлять шифрование/хеширование)
- ❌ Не обновлять major-версии зависимостей (только patch security fixes)
- ❌ Не коммитить секреты даже в примеры — использовать плейсхолдеры
- ❌ Не изобретать собственную криптографию

## Команды верификации

После каждого security fix запускать:
```bash
# Аудит зависимостей
npm audit 2>&1 || pip audit 2>&1

# Поиск секретов в коде
grep -rn "password\|secret\|api_key\|token" --include="*.{js,ts,py,go}" . | grep -v node_modules | grep -v ".env.example"
gitleaks detect --source . 2>&1 || echo "NO GITLEAKS"

# CSP и security headers (если есть сервер)
curl -sI http://localhost:PORT/ | grep -iE "security|csp|strict|frame|content-type"

# OWASP dependency check
npx better-npm-audit audit 2>&1 || echo "NO BETTER-NPM-AUDIT"

# Тесты не сломаны
npm test
git diff --stat
```
