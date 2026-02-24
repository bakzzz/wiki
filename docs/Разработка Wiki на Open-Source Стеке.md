# **Архитектурное проектирование многопользовательской базы знаний: техническое руководство по разработке Wiki-системы на стеке React, FastAPI и PostgreSQL**

Создание современной корпоративной системы управления знаниями требует не просто разработки веб\-приложения, а формирования сложной экосистемы, обеспечивающей высокую производительность, надежную изоляцию данных и интуитивно понятный пользовательский опыт. В данном техническом руководстве рассматривается проектирование системы типа Wiki/Help, базирующейся на принципах открытого исходного кода и свободного программного обеспечения. Основное внимание уделяется обеспечению мультиарендности, реализации глубокой иерархии страниц с использованием специализированных типов данных PostgreSQL, разработке расширенного редактора контента и внедрению гибкой системы контроля доступа на основе ролей.

## **Стратегический обзор технологического стека и системных компонентов**

Выбор технологического стека для Wiki-системы обусловлен необходимостью обеспечения асинхронности на уровне бэкенда и компонентного подхода на фронтенде. Использование React в сочетании с Ant Design позволяет построить интерфейс, отвечающий промышленным стандартам, в то время как FastAPI обеспечивает необходимую пропускную способность для обработки множественных запросов в условиях мультиарендности.

### **Фронтенд-архитектура: React и Ant Design**

Выбор React в качестве базового фреймворка для фронтенда продиктован его обширной экосистемой и эффективным механизмом обновления виртуального DOM, что критично для интерактивных редакторов контента.1 Ant Design (AntD) выступает в роли основной библиотеки компонентов, предоставляя разработчикам не только визуальные элементы, но и мощные инструменты для управления состоянием сложных компонентов, таких как иерархические деревья и формы.3

Ant Design версии 5.x привносит концепцию дизайн-токенов, которая позволяет динамически изменять визуальный стиль приложения для каждого арендатора без необходимости пересборки фронтенда.5 Это особенно важно в контексте мультиарендных систем, где организации могут требовать индивидуального брендинга своего пространства знаний.

### **Бэкенд-инфраструктура: FastAPI и Python**

FastAPI зарекомендовал себя как один из самых быстрых и эффективных фреймворков для создания API на языке Python.6 Его архитектура, построенная на базе Starlette и Pydantic, обеспечивает нативную поддержку асинхронности, что позволяет эффективно масштабировать систему при обработке тяжелых операций, таких как полнотекстовый поиск или генерация сложных иерархических структур.6

Система внедрения зависимостей (Dependency Injection) в FastAPI является ключевым механизмом для реализации мультиарендности. Она позволяет на уровне каждого эндпоинта автоматически определять контекст текущего арендатора и подключать соответствующую сессию базы данных или правила доступа.6

### **База данных и хранение: PostgreSQL и MinIO**

PostgreSQL является фундаментом системы, предоставляя расширенные возможности для работы с иерархическими данными и полнотекстовым поиском.9 В отличие от традиционных реляционных БД, PostgreSQL поддерживает специализированные расширения, такие как ltree, которые оптимизируют работу с глубоко вложенными структурами страниц.9

Для хранения медиафайлов, включая видео и изображения, интегрируемые в статьи Wiki, используется MinIO. Это S3-совместимое объектное хранилище с открытым исходным кодом, которое обеспечивает высокую доступность и производительность при работе с неструктурированными данными.12 Использование механизма подписанных URL (Presigned URLs) позволяет передавать файлы напрямую между клиентом и хранилищем, минимизируя нагрузку на бэкенд-сервер.14

## **Реализация мультиарендности и изоляции пространств**

Мультиарендность (Multi-tenancy) — это архитектурный подход, при котором один экземпляр приложения обслуживает несколько независимых групп пользователей (арендаторов). В системе Wiki изоляция данных является критическим требованием безопасности.8

### **Выбор стратегии изоляции данных**

Существует три основных подхода к реализации мультиарендности в PostgreSQL, каждый из которых обладает своими характеристиками производительности и сложности управления.16

| Стратегия | Механизм изоляции | Преимущества | Недостатки |
| :---- | :---- | :---- | :---- |
| **Shared Schema** | Поле tenant\_id в каждой таблице | Максимальная плотность арендаторов, простота миграций | Риск утечки данных при ошибке в запросе 8 |
| **Isolated Schema** | Отдельная схема PostgreSQL для каждого арендатора | Высокий уровень безопасности, простота резервного копирования отдельных клиентов | Сложность управления множеством схем при миграциях 16 |
| **Isolated Database** | Отдельная БД для каждого арендатора | Абсолютная изоляция, возможность размещения на разных серверах | Высокие накладные расходы на ресурсы и управление подключениями 16 |

Для системы Wiki наиболее целесообразным является использование **Isolated Schema (одна база, много схем)**. Этот подход обеспечивает баланс между безопасностью и эффективностью использования ресурсов.16 PostgreSQL позволяет быстро переключать контекст запроса с помощью команды SET search\_path TO tenant\_schema, что минимизирует изменения в прикладном коде.18

### **Динамическое определение арендатора**

В FastAPI идентификация арендатора обычно происходит на уровне Middleware или через зависимости. Наиболее распространенными методами являются определение по поддомену (например, org1.wiki.com) или по специальному HTTP-заголовку X-Tenant-ID.8

Пример логики извлечения арендатора из поддомена 20:

1. Перехват входящего запроса в Middleware.  
2. Парсинг заголовка Host.  
3. Сопоставление поддомена с идентификатором арендатора в кэше (например, Redis).  
4. Установка идентификатора арендатора в request.state.tenant.

## **Проектирование иерархической структуры страниц**

Wiki-система требует поддержки вложенности страниц до 4 уровней и более. Эффективная работа с деревьями в реляционных базах данных является классической проблемой системного проектирования.21

### **Модель данных на базе ltree**

Расширение ltree для PostgreSQL реализует концепцию материализованного пути (Materialized Path). Вместо хранения только ссылки на родителя, каждый узел дерева хранит полный путь от корня в текстовом виде, разделенном точками (например, Main.Engineering.React.Architecture).9

Преимущества использования ltree перед рекурсивными запросами:

* **Производительность**: Выборка всего поддерева или поиск всех предков выполняется за один индексный скан.11  
* **Простота запросов**: Использование специализированных операторов, таких как @\> (является предком) и \<@ (является потомком), делает SQL-код читаемым и лаконичным.9  
* **Индексация**: Поддержка GIN и GiST индексов обеспечивает стабильную скорость запросов даже при значительном росте количества страниц.9

### **Математическая оценка сложности операций**

При анализе иерархических структур важно учитывать вычислительную сложность основных операций. В таблице ниже приведено сравнение ltree с классическим списком смежности (Adjacency List).21

| Операция | Adjacency List (Recursive CTE) | PostgreSQL ltree (GiST Index) |
| :---- | :---- | :---- |
| Выборка детей (1 уровень) | ![][image1] при наличии индекса | ![][image1] при наличии индекса |
| Выборка всех потомков | ![][image2] (зависит от глубины ![][image3]) | ![][image4] (индексный поиск) |
| Поиск всех предков | ![][image5] (рекурсия) | ![][image4] (индексный поиск) |
| Перемещение поддерева | ![][image1] (смена parent\_id) | ![][image6] (обновление путей ![][image7] узлов) |

Для Wiki, где операции чтения (построение дерева навигации) превалируют над операциями изменения структуры, ltree является оптимальным выбором.11

## **Разработка продвинутого редактора контента**

Редактор — это сердце Wiki-системы. Он должен сочетать в себе простоту использования Markdown с мощностью визуального редактирования (WYSIWYG), поддерживать вставку диаграмм и мультимедиа.1

### **Выбор фреймворка редактора: Tiptap**

После анализа современных решений, таких как Lexical (от Meta), Slate и Quill, наиболее подходящим инструментом для React-приложения является Tiptap.1 Tiptap представляет собой headless-фреймворк, построенный на базе ProseMirror. Это означает, что он берет на себя всю сложную логику обработки текста и манипуляции с документом, позволяя разработчику полностью контролировать UI с помощью Ant Design.24

Ключевые особенности Tiptap:

* **Расширяемость**: Система плагинов позволяет добавлять поддержку любых типов контента, от простых списков до сложных интерактивных компонентов.25  
* **Поддержка Markdown**: Возможность двусторонней конвертации между JSON-структурой редактора и Markdown-текстом.29  
* **Совместное редактирование**: Интеграция с Yjs обеспечивает поддержку редактирования в реальном времени (аналог Google Docs).24

### **Интеграция диаграмм Mermaid.js**

Для реализации требований по созданию схем внутри Wiki-страниц используется Mermaid.js. Это библиотека, которая превращает текстовые описания в элегантные SVG-диаграммы.31

Механизм интеграции в Tiptap:

1. Создание кастомного узла (Custom Node) MermaidBlock.  
2. Узел хранит текстовый код диаграммы в своих атрибутах.33  
3. Для визуализации используется NodeView, который рендерит компонент React.  
4. Внутри компонента вызывается метод mermaid.render(), преобразующий текст в SVG.32

Такой подход позволяет хранить диаграммы как часть текстового документа, обеспечивая их индексацию и версионность, в отличие от хранения диаграмм в виде растровых изображений.31

### **Работа с видео и медиаконтентом**

Поддержка видео в редакторе реализуется через расширения для вставки iframe (для внешних сервисов типа YouTube) или нативных HTML5-тегов \<video\> для файлов, загруженных пользователем.29

Безопасная загрузка медиафайлов осуществляется по следующему алгоритму 12:

1. Клиент инициирует загрузку и запрашивает у FastAPI временную ссылку (Presigned PUT URL).  
2. FastAPI проверяет права доступа пользователя в рамках текущего арендатора и запрашивает ссылку у MinIO.14  
3. Фронтенд выполняет HTTP PUT запрос напрямую в MinIO.  
4. После завершения загрузки бэкенд фиксирует метаданные файла в базе данных.

## **Система ролей (RBAC) и управление доступом**

В многопользовательской системе Wiki необходима гранулярная настройка прав доступа. Система управления доступом на основе ролей (RBAC) позволяет гибко распределять полномочия между администраторами, редакторами и читателями.35

### **Моделирование доступа с помощью Casbin**

Для реализации сложной логики авторизации в FastAPI рекомендуется использовать Casbin (библиотека pycasbin). Casbin отделяет логику проверки прав от кода приложения, используя декларативный подход.38

В контексте мультиарендности Casbin поддерживает концепцию доменов (domains). Это позволяет пользователю иметь разные роли в разных пространствах арендаторов.40 Например, пользователь может быть администратором в Space\_A и обычным читателем в Space\_B.

Пример структуры политики Casbin для Wiki 40:

* p, role:admin, tenant1, page:\*, act:write — Администраторы в tenant1 могут редактировать все страницы.  
* p, role:editor, tenant1, page:123, act:write — Редактор в tenant1 может изменять конкретную страницу 123\.  
* g, alice, role:admin, tenant1 — Алиса является администратором в tenant1.

### **Иерархия ролей и наследование**

Casbin позволяет выстраивать иерархию ролей, что упрощает управление правами. Если роль SuperAdmin наследует права роли Editor, то нет необходимости дублировать правила доступа для каждой роли в отдельности.39

| Роль | Базовые права | Наследование |
| :---- | :---- | :---- |
| **Viewer** | Просмотр страниц, поиск | \- |
| **Editor** | Создание/редактирование страниц, загрузка медиа | Viewer |
| **Admin** | Управление пользователями, настройка арендатора, удаление страниц | Editor |
| **Owner** | Управление подпиской, полное удаление пространства | Admin |

## **Информационный поиск и обнаружение данных**

Эффективный поиск является критически важным для Wiki-систем. Пользователи должны иметь возможность быстро находить информацию не только по заголовкам, но и по содержимому статей, включая теги и метаданные.10

### **Полнотекстовый поиск в PostgreSQL (FTS)**

Для реализации поиска без использования внешних тяжелых систем (таких как Elasticsearch) возможностей PostgreSQL FTS более чем достаточно для большинства Wiki-систем.43

Архитектура поискового движка:

1. **Нормализация**: Текст очищается от HTML-тегов и преобразуется в лексемы с использованием стемминга (приведение слов к основе).10  
2. **Тип данных tsvector**: PostgreSQL хранит предобработанные лексемы в специальном столбце search\_vector, что позволяет мгновенно выполнять поиск без сканирования всего текста статьи.10  
3. **Ранжирование**: Функция ts\_rank оценивает релевантность документа запросу на основе частоты появления и близости искомых слов.44  
4. **Подсветка фрагментов**: Функция ts\_headline позволяет генерировать сниппеты текста с выделенными поисковыми словами для отображения в результатах поиска.10

### **Гибридный поиск: Текст \+ Теги**

Для повышения точности поискаWiki-система должна поддерживать фильтрацию по тегам. PostgreSQL позволяет комбинировать полнотекстовый поиск с поиском по массивам (тип данных text). Это реализуется через объединение условий в одном SQL-запросе, где поиск по tsvector ускоряется GIN-индексом, а фильтрация по тегам — отдельным индексом на массив.10

## **Публичные ссылки и анонимный доступ**

Wiki-системы часто требуют возможности делиться отдельными страницами с внешними пользователями без необходимости их регистрации в системе.

### **Механизм генерации публичных ссылок**

Публичный доступ реализуется через создание уникальных токенов (UUID), которые привязываются к конкретной версии страницы. В отличие от внутренних ссылок, которые используют инкрементальные ID или slug в рамках арендатора, публичные ссылки должны быть криптографически стойкими к перебору.48

Технические параметры реализации:

* **Уникальный идентификатор**: Использование UUID v4 для формирования URL вида wiki.com/shared/.  
* **Срок действия**: Поле expires\_at в таблице публичных ссылок позволяет создавать временные доступы.48  
* **Изоляция контента**: При доступе по публичной ссылке система должна ограничивать навигацию пользователя только разрешенным поддеревом страниц. Это достигается путем фильтрации дерева ltree в контексте публичного токена.

### **Slug-навигация и SEO**

Для внутренних пользователей и публичных разделов важно поддерживать человекопонятные URL (Slugs). Slug генерируется на основе заголовка страницы и должен быть уникальным в рамках одного арендатора.7 При изменении заголовка старые slug рекомендуется сохранять в таблице перенаправлений (Redirects), чтобы избежать появления "битых" ссылок.

## **Системное проектирование API и взаимодействие компонентов**

Взаимодействие между React-фронтендом и FastAPI-бэкендом строится на принципах RESTful API с использованием JSON в качестве формата обмена данными.6

### **Жизненный цикл запроса**

Рассмотрим путь запроса на получение иерархии страниц в мультиарендной среде:

1. **Frontend**: Компонент Tree от Ant Design инициирует запрос к /api/v1/pages.  
2. **FastAPI Middleware**: Извлекает идентификатор арендатора из поддомена, проверяет JWT-токен пользователя и его принадлежность к данному арендатору.8  
3. **Dependency Injection**: Предоставляет эндпоинту сессию базы данных, предварительно настроенную на схему текущего арендатора через SET search\_path.16  
4. **Service Layer**: Выполняет запрос к таблице страниц, используя операторы ltree для получения структуры до 4 уровня вложенности.9  
5. **Data Mapper**: Преобразует плоский список результатов из БД в вложенный JSON-объект, совместимый с форматом treeData библиотеки Ant Design.52  
6. **Response**: FastAPI сериализует данные и возвращает их клиенту с соответствующими HTTP-заголовками кэширования.

### **Валидация и схемы данных**

Все входные данные строго валидируются с помощью моделей Pydantic. Это предотвращает атаки типа SQL-инъекция (через автоматическую параметризацию запросов в ORM) и гарантирует целостность данных.6 Для сложных структур страниц используются вложенные модели Pydantic (Recursive Models), которые позволяют описывать деревья неограниченной глубины.55

## **Резюме архитектурных решений**

Построение Wiki-системы на стеке React, FastAPI и PostgreSQL представляет собой задачу интеграции множества специализированных инструментов в единую, слаженно работающую структуру. Использование исключительно решений с открытым исходным кодом обеспечивает независимость от вендоров и возможность глубокой кастомизации под нужды конкретных пользователей.

Ключевые выводы технического проектирования:

1. **Мультиарендность**: Использование схем PostgreSQL обеспечивает оптимальный уровень изоляции при сохранении высокой производительности системы миграций.16  
2. **Иерархия страниц**: Расширение ltree является безальтернативным лидером для реализации древовидных структур в реляционных базах данных, обеспечивая мгновенный доступ к поддеревьям.11  
3. **Редактор контента**: Tiptap предоставляет идеальный баланс между мощностью ProseMirror и удобством разработки на React, позволяя бесшовно интегрировать Mermaid диаграммы и видео.24  
4. **Безопасность**: Комбинация JWT для аутентификации и Casbin для авторизации позволяет реализовать гибкую систему RBAC, поддерживающую как глобальные правила, так и специфические настройки для каждого пространства.38  
5. **Инфраструктура медиа**: Использование MinIO и механизма Presigned URLs разгружает бэкенд и обеспечивает безопасное хранение тяжелого контента.13

Данный технический документ служит корневым руководством для команды разработки, определяя ключевые компоненты и методы их взаимодействия. Следование описанным принципам позволит создать надежную, масштабируемую и современную систему управления знаниями.

#### **Источники**

1. Best Rich Text Editor for react in 2025 \- DEV Community, дата последнего обращения: февраля 24, 2026, [https://dev.to/codeideal/best-rich-text-editor-for-react-in-2025-3cdb](https://dev.to/codeideal/best-rich-text-editor-for-react-in-2025-3cdb)  
2. React | Tiptap Editor Docs, дата последнего обращения: февраля 24, 2026, [https://tiptap.dev/docs/editor/getting-started/install/react](https://tiptap.dev/docs/editor/getting-started/install/react)  
3. Tree \- Ant Design, дата последнего обращения: февраля 24, 2026, [https://4x.ant.design/components/tree/](https://4x.ant.design/components/tree/)  
4. Tree \- Ant Design, дата последнего обращения: февраля 24, 2026, [https://ant.design/components/tree/](https://ant.design/components/tree/)  
5. Discover the Delicate Beauty of Components with Semantic Design \- Ant Design, дата последнего обращения: февраля 24, 2026, [https://ant.design/docs/blog/semantic-beauty/](https://ant.design/docs/blog/semantic-beauty/)  
6. FastAPI \- Wikipedia, дата последнего обращения: февраля 24, 2026, [https://en.wikipedia.org/wiki/FastAPI](https://en.wikipedia.org/wiki/FastAPI)  
7. How to secure APIs built with FastAPI: A complete guide \- Escape, дата последнего обращения: февраля 24, 2026, [https://escape.tech/blog/how-to-secure-fastapi-api/](https://escape.tech/blog/how-to-secure-fastapi-api/)  
8. Building Scalable Multi-Tenant Architectures in FastAPI \- Python in Plain English, дата последнего обращения: февраля 24, 2026, [https://python.plainenglish.io/building-scalable-multi-tenant-architectures-in-fastapi-9b5457543e65](https://python.plainenglish.io/building-scalable-multi-tenant-architectures-in-fastapi-9b5457543e65)  
9. Documentation: 18: F.22. ltree — hierarchical tree-like data type \- PostgreSQL, дата последнего обращения: февраля 24, 2026, [https://www.postgresql.org/docs/current/ltree.html](https://www.postgresql.org/docs/current/ltree.html)  
10. Full-Text Search in PostgreSQL \- ParadeDB, дата последнего обращения: февраля 24, 2026, [https://www.paradedb.com/learn/search-in-postgresql/full-text-search](https://www.paradedb.com/learn/search-in-postgresql/full-text-search)  
11. ltree \- Nile Documentation \- TheNile.DEV, дата последнего обращения: февраля 24, 2026, [https://www.thenile.dev/docs/extensions/ltree](https://www.thenile.dev/docs/extensions/ltree)  
12. Guide to S3 File Management: FastAPI and S3 Service in Docker Compose \- Medium, дата последнего обращения: февраля 24, 2026, [https://medium.com/@gnetkov/guide-to-s3-file-management-fastapi-and-s3-service-in-docker-compose-1d26900f67cc](https://medium.com/@gnetkov/guide-to-s3-file-management-fastapi-and-s3-service-in-docker-compose-1d26900f67cc)  
13. FastAPI MinIO Integration. Storing and retrieving files in modern… | by Mojtaba (MJ) Michael, дата последнего обращения: февраля 24, 2026, [https://medium.com/@mojimich2015/fastapi-minio-integration-31b35076afcb](https://medium.com/@mojimich2015/fastapi-minio-integration-31b35076afcb)  
14. How I Built a Secure File Upload API Using FastAPI and AWS S3 Presigned URLs, дата последнего обращения: февраля 24, 2026, [https://dev.to/copubah/how-i-built-a-secure-file-upload-api-using-fastapi-and-aws-s3-presigned-urls-7eg](https://dev.to/copubah/how-i-built-a-secure-file-upload-api-using-fastapi-and-aws-s3-presigned-urls-7eg)  
15. How to upload from request.stream to MinIO · fastapi fastapi · Discussion \#8403 \- GitHub, дата последнего обращения: февраля 24, 2026, [https://github.com/fastapi/fastapi/discussions/8403](https://github.com/fastapi/fastapi/discussions/8403)  
16. Multitenancy with FastAPI \- A practical guide — Documentation \- App Generator, дата последнего обращения: февраля 24, 2026, [https://app-generator.dev/docs/technologies/fastapi/multitenancy.html](https://app-generator.dev/docs/technologies/fastapi/multitenancy.html)  
17. How to Build Multi-Tenant APIs in Python \- OneUptime, дата последнего обращения: февраля 24, 2026, [https://oneuptime.com/blog/post/2026-01-23-build-multi-tenant-apis-python/view](https://oneuptime.com/blog/post/2026-01-23-build-multi-tenant-apis-python/view)  
18. app-generator/docs/source/technologies/fastapi/multitenancy.rst at main \- GitHub, дата последнего обращения: февраля 24, 2026, [https://github.com/app-generator/app-generator/blob/main/docs/source/technologies/fastapi/multitenancy.rst?plain=1](https://github.com/app-generator/app-generator/blob/main/docs/source/technologies/fastapi/multitenancy.rst?plain=1)  
19. Multi-Tenant Architecture: A Complete Guide (Basic to Advanced) \- DEV Community, дата последнего обращения: февраля 24, 2026, [https://dev.to/tak089/multi-tenant-architecture-a-complete-guide-basic-to-advanced-119o](https://dev.to/tak089/multi-tenant-architecture-a-complete-guide-basic-to-advanced-119o)  
20. Building Multi-Tenant APIs with FastAPI and Subdomain Routing: A Complete Guide, дата последнего обращения: февраля 24, 2026, [https://medium.com/@diwasb54/building-multi-tenant-apis-with-fastapi-and-subdomain-routing-a-complete-guide-cc076cb02513](https://medium.com/@diwasb54/building-multi-tenant-apis-with-fastapi-and-subdomain-routing-a-complete-guide-cc076cb02513)  
21. Implementing Hierarchical Data Structures in PostgreSQL: LTREE ..., дата последнего обращения: февраля 24, 2026, [https://dev.to/dowerdev/implementing-hierarchical-data-structures-in-postgresql-ltree-vs-adjacency-list-vs-closure-table-2jpb](https://dev.to/dowerdev/implementing-hierarchical-data-structures-in-postgresql-ltree-vs-adjacency-list-vs-closure-table-2jpb)  
22. Hierarchical models in PostgreSQL | Ackee blog, дата последнего обращения: февраля 24, 2026, [https://www.ackee.agency/blog/hierarchical-models-in-postgresql](https://www.ackee.agency/blog/hierarchical-models-in-postgresql)  
23. Closure Table \- Fueled, дата последнего обращения: февраля 24, 2026, [https://fueled.com/blog/closure-table/](https://fueled.com/blog/closure-table/)  
24. Which rich text editor framework should you choose in 2025 ..., дата последнего обращения: февраля 24, 2026, [https://liveblocks.io/blog/which-rich-text-editor-framework-should-you-choose-in-2025](https://liveblocks.io/blog/which-rich-text-editor-framework-should-you-choose-in-2025)  
25. Tiptap Rich Text Editor \- the Headless WYSIWYG Editor, дата последнего обращения: февраля 24, 2026, [https://tiptap.dev/product/editor](https://tiptap.dev/product/editor)  
26. Open Source Text Editor Framework for Developers \- Tiptap, дата последнего обращения: февраля 24, 2026, [https://tiptap.dev/open-source-to-platform](https://tiptap.dev/open-source-to-platform)  
27. ueberdosis/tiptap: The headless rich text editor framework for web artisans. \- GitHub, дата последнего обращения: февраля 24, 2026, [https://github.com/ueberdosis/tiptap](https://github.com/ueberdosis/tiptap)  
28. Extensions | Tiptap Editor Docs, дата последнего обращения: февраля 24, 2026, [https://tiptap.dev/docs/editor/core-concepts/extensions](https://tiptap.dev/docs/editor/core-concepts/extensions)  
29. Markdown Introduction | Tiptap Editor Docs, дата последнего обращения: февраля 24, 2026, [https://tiptap.dev/docs/editor/markdown](https://tiptap.dev/docs/editor/markdown)  
30. BlockNote \- Javascript Block-Based React rich text editor, дата последнего обращения: февраля 24, 2026, [https://www.blocknotejs.org/](https://www.blocknotejs.org/)  
31. mermaid-js/mermaid: Generation of diagrams like flowcharts or sequence diagrams from text in a similar manner as markdown \- GitHub, дата последнего обращения: февраля 24, 2026, [https://github.com/mermaid-js/mermaid](https://github.com/mermaid-js/mermaid)  
32. Mastering Mermaid JS: The Visual Superpower Every Developer Should Know, дата последнего обращения: февраля 24, 2026, [https://levelup.gitconnected.com/mastering-mermaid-js-the-visual-superpower-every-developer-should-know-186e352b7631](https://levelup.gitconnected.com/mastering-mermaid-js-the-visual-superpower-every-developer-should-know-186e352b7631)  
33. Node views with JavaScript \- Tiptap Editor Docs, дата последнего обращения: февраля 24, 2026, [https://tiptap.dev/docs/editor/extensions/custom-extensions/node-views/javascript](https://tiptap.dev/docs/editor/extensions/custom-extensions/node-views/javascript)  
34. React node views | Tiptap Editor Docs, дата последнего обращения: февраля 24, 2026, [https://tiptap.dev/docs/editor/extensions/custom-extensions/node-views/react](https://tiptap.dev/docs/editor/extensions/custom-extensions/node-views/react)  
35. FastAPI RBAC \- Full Implementation Tutorial \- Permit.io, дата последнего обращения: февраля 24, 2026, [https://www.permit.io/blog/fastapi-rbac-full-implementation-tutorial](https://www.permit.io/blog/fastapi-rbac-full-implementation-tutorial)  
36. Role-Based Access Control (RBAC) in FastAPI \- App Generator, дата последнего обращения: февраля 24, 2026, [https://app-generator.dev/docs/technologies/fastapi/rbac.html](https://app-generator.dev/docs/technologies/fastapi/rbac.html)  
37. How do you handle ReBAC, ABAC, and RBAC in FastAPI without overcomplicating it?, дата последнего обращения: февраля 24, 2026, [https://www.reddit.com/r/FastAPI/comments/1jn1203/how\_do\_you\_handle\_rebac\_abac\_and\_rbac\_in\_fastapi/](https://www.reddit.com/r/FastAPI/comments/1jn1203/how_do_you_handle_rebac_abac_and_rbac_in_fastapi/)  
38. How we can manage roles and permissions using fast-API ... \- GitHub, дата последнего обращения: февраля 24, 2026, [https://github.com/fastapi/fastapi/discussions/8413](https://github.com/fastapi/fastapi/discussions/8413)  
39. RBAC Overview \- Casbin, дата последнего обращения: февраля 24, 2026, [https://casbin.org/uk/docs/rbac-overview/](https://casbin.org/uk/docs/rbac-overview/)  
40. RBAC with Domains | Apache Casbin, дата последнего обращения: февраля 24, 2026, [https://casbin.org/docs/rbac-with-domains/](https://casbin.org/docs/rbac-with-domains/)  
41. RBAC with Domains \- Casbin, дата последнего обращения: февраля 24, 2026, [https://v1.casbin.org/docs/en/rbac-with-domains](https://v1.casbin.org/docs/en/rbac-with-domains)  
42. RBAC | Apache Casbin, дата последнего обращения: февраля 24, 2026, [https://casbin.org/docs/rbac/](https://casbin.org/docs/rbac/)  
43. Comparing Native Postgres, ElasticSearch, and pg\_search for Full-Text Search \- Neon, дата последнего обращения: февраля 24, 2026, [https://neon.com/blog/postgres-full-text-search-vs-elasticsearch](https://neon.com/blog/postgres-full-text-search-vs-elasticsearch)  
44. Postgres Full Text Search | The Gnar Company, дата последнего обращения: февраля 24, 2026, [https://www.thegnar.com/blog/postgres-full-text-search](https://www.thegnar.com/blog/postgres-full-text-search)  
45. Full Text Search over Postgres: Elasticsearch vs. Alternatives \- ParadeDB, дата последнего обращения: февраля 24, 2026, [https://www.paradedb.com/blog/elasticsearch-vs-postgres](https://www.paradedb.com/blog/elasticsearch-vs-postgres)  
46. PostgreSQL Full Text Search: The Definitive Guide \- DbVisualizer, дата последнего обращения: февраля 24, 2026, [https://www.dbvis.com/thetable/postgresql-full-text-search-the-definitive-guide/](https://www.dbvis.com/thetable/postgresql-full-text-search-the-definitive-guide/)  
47. Documentation: 18: 12.3. Controlling Text Search \- PostgreSQL, дата последнего обращения: февраля 24, 2026, [https://www.postgresql.org/docs/current/textsearch-controls.html](https://www.postgresql.org/docs/current/textsearch-controls.html)  
48. Schemas \- FastAPI Users, дата последнего обращения: февраля 24, 2026, [https://fastapi-users.github.io/fastapi-users/latest/configuration/schemas/](https://fastapi-users.github.io/fastapi-users/latest/configuration/schemas/)  
49. Metadata and Docs URLs \- FastAPI, дата последнего обращения: февраля 24, 2026, [https://fastapi.tiangolo.com/tutorial/metadata/](https://fastapi.tiangolo.com/tutorial/metadata/)  
50. Build a Perfect Blog with FastAPI: Add Authorization \- DEV Community, дата последнего обращения: февраля 24, 2026, [https://dev.to/leapcell/build-a-perfect-blog-with-fastapi-add-authorization-10hk](https://dev.to/leapcell/build-a-perfect-blog-with-fastapi-add-authorization-10hk)  
51. A Practical Guide to FastAPI Security \- David Muraya, дата последнего обращения: февраля 24, 2026, [https://davidmuraya.com/blog/fastapi-security-guide/](https://davidmuraya.com/blog/fastapi-security-guide/)  
52. PostgreSQL Materialized Path / Ltree to hierarchical JSON-object \- Stack Overflow, дата последнего обращения: февраля 24, 2026, [https://stackoverflow.com/questions/26995326/postgresql-materialized-path-ltree-to-hierarchical-json-object](https://stackoverflow.com/questions/26995326/postgresql-materialized-path-ltree-to-hierarchical-json-object)  
53. Dynamically creation of Json for antd Tree select \- Stack Overflow, дата последнего обращения: февраля 24, 2026, [https://stackoverflow.com/questions/59781429/dynamically-creation-of-json-for-antd-tree-select](https://stackoverflow.com/questions/59781429/dynamically-creation-of-json-for-antd-tree-select)  
54. How to Secure FastAPI Applications Against OWASP Top 10 \- OneUptime, дата последнего обращения: февраля 24, 2026, [https://oneuptime.com/blog/post/2025-01-06-fastapi-owasp-security/view](https://oneuptime.com/blog/post/2025-01-06-fastapi-owasp-security/view)  
55. Body \- Nested Models \- FastAPI, дата последнего обращения: февраля 24, 2026, [https://fastapi.tiangolo.com/tutorial/body-nested-models/](https://fastapi.tiangolo.com/tutorial/body-nested-models/)  
56. Understanding Nested Models in FastAPI: A Detailed Tutorial \- Orchestra, дата последнего обращения: февраля 24, 2026, [https://www.getorchestra.io/guides/understanding-nested-models-in-fastapi-a-detailed-tutorial](https://www.getorchestra.io/guides/understanding-nested-models-in-fastapi-a-detailed-tutorial)  
57. Python FastAPI Tutorial \#16 FastAPI \- Nested Models \- YouTube, дата последнего обращения: февраля 24, 2026, [https://www.youtube.com/watch?v=iNh\_8A\_\_d\_c](https://www.youtube.com/watch?v=iNh_8A__d_c)

[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACMAAAAVCAYAAADM+lfpAAABZklEQVR4Xu2Wvy4EURjFj6AQRCGhXCQkQq8XT0AUEg/gCbyAeAmReABaiUIhNDqNSjRENCIqSnzHN5O9jnvN50+yBb/kNOd8d++Z2bmzC/zzR7k2Dan5CV2mZ1OvBjXzphfTmWmy0lPljbXH3sECzPnhJS7VSLhVg/DK+KF9GhjH8CzHnWlVTWPWtAlfV1pLhtVYhC/o1qCCBZmPa4DyRlumZdMjyjMfaMGHZzQQOLMn3qjpQDwlXGYAzbexhjNX4p2YJsRTwmX24YOnGmTIleFp6BFPCZep78qCBsI0fG5b/MgmoTL9aJcZlEzZgc/pV9K4CYJlvvq85OZynhIqQ0qbpJzDZ9Y0QPNaEi5zAx/kCyrHEjw/1KAiskm4TAs+mHsl8/XObFeDhHs0P2/hMqT+PVpJvPXKm0q8HDxdpZNYPwKqo2TmV+Hde1Czk/BqR9TsFBvwE/ddcqf0R1yY5tQM8PZv4BURimVXPzNuGAAAAABJRU5ErkJggg==>

[image2]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADoAAAAVCAYAAAAXQf3LAAABqklEQVR4Xu2WwStFQRTGj6QISRY26kVRYqesrGRjwcJbSFnY2dgp/gD/gbV6WbNVFlZWysJGWZNs7BQlhfN1Zpi+5t6H3rtvvO6vTrf7fee+O+fNmZkrUlJS4rhkIWXmNT40rjS6NMY1XpyWBfLg4/ovuBMbcA8byrnGNYsO6HsspsqKWJGdbDhQPPxR0oed3kF6klTEBjvFBoGcY9JONW5IS5I+sQLy1qAHObcRbY40z4LGRHA/pLEv1gWFcyI22As2ImQVOkga2NbYEPOxLLD+d8RaH9ruV2ZB+NnEv5/HpFjeAelZnfDmrv73BwIPu/hTcN90euV7IP3kMTWxvDHSY4UiB/kgNnvQuDMYP7aGbHK/XZ+vLEr9Z+GHre13aS6eORTLW2Ljr/ykUJyTWTlZOljUeCYNO3TeM03jXuzF02w4qmL+GRsOeGizGHimRhrycSSBerPaUCpiL39gQ1kW847YCIA/wqID3kyO9h4aReC/b9cCDUcBtPAcjIGcTRaVbom3qO8efEvPkpc0W9KCmWkF2P4xS/U+H9uCdY1HFtsV7LCrLKbAJy0zZwGEwT4bAAAAAElFTkSuQmCC>

[image3]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAkAAAAVCAYAAACUhcTwAAAAmUlEQVR4XmNgGFrABoj/QzFB8A9dAB1wMBBhkgsDDkXiQNwIxIxA/IQBTRErVGAdECtC2SB8F13BHpgAEORAxcphAlegApwwASCogopJgzj8UM5bJAUg8AAqDgatUE4QTIAB4fU1MAGYsZIwAQaE10GhDgY6UAEZmAAQ/IWKgUw0hgneAuJHQCwIxBuB2AqqSB+Iv8IUDSYAAEOVJozWrGntAAAAAElFTkSuQmCC>

[image4]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAD0AAAAVCAYAAAD1neayAAACkklEQVR4Xu2WP2hUQRDGR4ygGJGgGEMihyERRMVGCEJIEZJSC60EsRVCqhRJYyOS1kIsBbFWBItACotgIQkp0gQCSSwiYmNhpSDin/myM5e57/bd5U7hLnA/GO72m337dvbPvBHp0KFDA2yycFAYV/ujtqZ2RG1Y7btpRaBf9HdbG7YU9Lbko6SJHmOH8k5tnUUD+iMW5QAEfUvSJA+zw8BCwH+e9F7TD5EO2jrokqQJXmIHgT6vSFtU2yDNadug4/2rB/rshDZ2F9po0CJFQeM0PZZ0nUbIF7mm9lDtqLUX1N7vuatAX+QXZ0xtSjKnFwNhcsvsyMBBXzStJ2iRXNDTpp+y9mu1X1J5PTwxvlE7aX60/Yrl+Kp2QvbGxu8VSbkG/7G5ZXyXJ6KYwQN8FrQbphXBQWNXoXFe+CRp0s6WVI571drIOzkwt3n7j35xLF+IGReOmwCDsxbPJfUbDNqcaUVw0D9NY3yc69b2OTl91l4KWgR5pl+tS1K/uKu+WdigXRq9zz9IazToonf5iXlhbbwn9huwNt5XC+QWLGzkqVQvROFEIvgO5/rgyOR0p9mgh9R+m7Ziv/fMV4sPUr0weLYqX+E+wXGZHcZtSf637JC0svDhmuTgoHkHnSdSOQckVxzpRsEYOOas+bjfXCyZ47MLgZuSfC/ZYZyW5Mfxy8FBow6ANhk0gF3FLjkIGt/+M0GrhxdJEZ8fOCeppijj9fadoM2adiFoOdDnPmkxV7j5zvm7cJSx4PgcbZvPwWeKn3crAnNgv9cRZyUtbK5qbAp8dzHg/8JPQ67+x1VbZbEV+GrWK2H3S63kiMosFkct5a7aFxabxL+1KFMZ3HvOBy0ll93/BZSnfJ8fVPRogr9xTcdIBatlKgAAAABJRU5ErkJggg==>

[image5]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACMAAAAVCAYAAADM+lfpAAABrElEQVR4Xu2VvyuFYRTHj1iELGLSRSgxEXaZDSyUnV35B2QzYZLyB7BJGQxikcXCogwkBsnE5sf59rzPvef9Os+9lLqKT33r3u/3vOd93vd5zr0i//xRblTNbFZgQbXCZmRM9a46U/Vkesm8jlJZDiwAeQ0HDqiLinSbz0XwZCiq50A5knwDy4Nqls0yzKlu2bRMSrhZLQcZWCDyTg4kvcgUF6plNiMFCQ37OSBQs0Nem2qfvEqgTxeboFE+72EK1FyTdyyJxoYO1YaqXTUsZe61JyE84cDBW8ybqo48y5ZqTcLhxlA8S5nFxLcyzgHRJ6Fuk/xkY+VA8jkWlNyFBimFTZQxeELU8Za4jSWcP2TrxouLOTReke+eF6/O8wBGF1mL8YYyb8J4OVI3sZxLqJnnQPxrcYbg48fSgpH26ovEJxjgIGNKQo799/Cap7YD3n32+coGkYKEojsOpNR0mwPDo/jnDVOGsY8sSui1mn2fNlmO+H80Y7x4ca/xPDBd3iSOSLh+UHUq4c/wVcICve3+EfD2ntisJngDrWxWiyUJE/druFSNsvlFdj8A3EFtzDH6NtkAAAAASUVORK5CYII=>

[image6]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACkAAAAVCAYAAADb2McgAAAB00lEQVR4Xu2VzytEURTHj6QISSkbmihK7KyUhWTBAsVCSrY2VhRl63+wkJosrNgqCwtZKYvZKGuSjYUVZeHH+c65x5w5786geZNZzKdO0/uc8949c9999xLVqVMR115UyI0XyiTHJ0eOo4ljgOM1uFKgDnn8Vp17ksFafIK5pNL/DH7Xy2qwQNJgo08E0Djyfc53B9/gfOpkSAYa9gkHak6cO+O4dS512kgGL7fmFNTcmWvMHty4cZYpjkFz3cGxx9Fr3BDHPseEcQlOSQa68okIvkkMANdpnLLJsUSSx1J64tgiWS5wyON6nmSJvXE85++MoLOIf10ObejAuNngYnyEX30+ZlHR3QJNKofBJWilwkPaXc6TJanrN247OA9qUA+QR50Fzs/aefAJ/roe8UospZq0IG+XQ1dwO8aBWOPf/KZJ7IOxmg2Ke2WG48W5I5J78BaV6eDGjCvigaRgxCcCiyR5vA4Pvmo/oAX3ZJ2LnV7aA7ig4vWbJ0NS8OgTzBxJ7tgnAvrqenwigNxoxGFH8Q77LcAuEEXP62Xj8OXB2X0uBmrWvGSaKTljAM7vq+8kh8QqRWYxDdapsN3ULHrq/HSk/jsrVGYt1RL4knEMpsoXgTx3r/3ZOncAAAAASUVORK5CYII=>

[image7]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAVCAYAAACZm7S3AAAAwklEQVR4Xu3RsQpBYQDF8U8Gg0kpk4FBmQwmZTAyKavyEgZl9wIGg0UGm1UZPI4yykBJ4hzO1enzCJz6R797+bqE8N8vLY2mqGLWQTNUNKuiOWqZhRvKoAfqoRMqoJJsqNdueB90RUd+sI/afKMbmO8iS5ktZeGgC2XByG7iaK9TbDv5ZxNBziwvG5txX19IODtgK3nWjI9IayTAi4RFAlryvL59bPxbCHUz/g60jRlH2zrwhviEmqwZ+R2t0SDyn9gTJ+ExAhkQe7kAAAAASUVORK5CYII=>