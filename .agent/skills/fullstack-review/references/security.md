# Security Review Checklist

## Содержание
- [Аутентификация и авторизация](#аутентификация-и-авторизация)
- [Защита данных](#защита-данных)
- [OWASP Top 10](#owasp-top-10)
- [Инфраструктурная безопасность](#инфраструктурная-безопасность)
- [Секреты и конфигурация](#секреты-и-конфигурация)

## Аутентификация и авторизация

- [ ] Пароли хешируются (bcrypt/argon2, не MD5/SHA1)
- [ ] JWT: короткий срок жизни access token (<15 мин), refresh token с ротацией
- [ ] Защита от brute force (rate limiting на login, account lockout)
- [ ] RBAC или ABAC модель авторизации
- [ ] Проверка авторизации на каждом эндпоинте (не только на роутере)
- [ ] Session management: httpOnly, secure, SameSite cookies
- [ ] OAuth2/OIDC для social login реализован через проверенные библиотеки
- [ ] MFA/2FA доступно для критичных операций

## Защита данных

- [ ] HTTPS everywhere (HSTS заголовок)
- [ ] Sensitive data зашифрованы at rest (AES-256)
- [ ] PII данные маскируются в логах
- [ ] Нет секретов в коде/репозитории (проверить git history)
- [ ] Database credentials не в plaintext
- [ ] Backup данных зашифрованы
- [ ] GDPR/data retention policy: удаление персональных данных

## Антипаттерны (конкретные примеры)

```javascript
// ❌ ПЛОХО: XSS уязвимость
element.innerHTML = userInput;

// ✅ ХОРОШО: Безопасная вставка
element.textContent = userInput;
```

```python
# ❌ ПЛОХО: Хардкод секретов
DB_PASSWORD = "super_secret_123"
API_KEY = "sk-1234567890abcdef"

# ✅ ХОРОШО: Environment variables
DB_PASSWORD = os.environ.get("DB_PASSWORD")
API_KEY = os.environ.get("API_KEY")
```

```python
# ❌ ПЛОХО: Слабое хеширование
import hashlib
password_hash = hashlib.md5(password.encode()).hexdigest()

# ✅ ХОРОШО: bcrypt с солью
import bcrypt
password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt(12))
```

## OWASP Top 10

- [ ] **Injection** — параметризованные запросы, ORM, нет string concatenation в SQL
- [ ] **Broken Auth** — см. раздел аутентификации выше
- [ ] **Sensitive Data Exposure** — нет PII в URL/логах/ответах ошибок
- [ ] **XXE** — XML парсеры сконфигурированы безопасно (disable external entities)
- [ ] **Broken Access Control** — IDOR проверки, горизонтальная авторизация
- [ ] **Security Misconfiguration** — debug mode выключен в prod, дефолтные пароли убраны
- [ ] **XSS** — output encoding, Content-Security-Policy заголовок
- [ ] **Insecure Deserialization** — нет `eval()`, `pickle.loads()` от пользователя
- [ ] **Known Vulnerabilities** — зависимости без critical CVE (`npm audit`, `pip audit`)
- [ ] **Insufficient Logging** — security-события логируются (login, failed auth, privilege changes)

## Инфраструктурная безопасность

- [ ] Security headers настроены (CSP, X-Frame-Options, X-Content-Type-Options)
- [ ] CORS ограничен конкретными доменами (не `*` в prod)
- [ ] File upload: валидация типа/размера, изоляция хранения, антивирус
- [ ] Rate limiting на все публичные эндпоинты
- [ ] DDoS защита (CDN/WAF)
- [ ] Минимальные привилегии: сервис-аккаунты с read-only где возможно

## Секреты и конфигурация

- [ ] `.env` файлы в `.gitignore`
- [ ] Секреты через vault/secret manager (не env vars напрямую в CI)
- [ ] API ключи ротируются
- [ ] Нет hardcoded credentials в коде (проверить grep -r "password\|secret\|api_key")
- [ ] Prod и dev конфигурации разделены
