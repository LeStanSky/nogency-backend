# Git Workflow для NoGency Backend

## Структура веток

### `master` - Production ветка
- **Назначение:** Только рабочие, протестированные версии
- **Правила:**
  - Никогда не коммитить напрямую в master
  - Только merge из `dev` после полного тестирования
  - Каждый merge в master = новая версия (release)
  - Только stable, production-ready код

### `dev` - Development ветка
- **Назначение:** Основная разработка
- **Правила:**
  - Вся разработка ведется здесь
  - Можно коммитить напрямую (для solo разработки)
  - Или создавать feature ветки и мерджить в dev
  - После завершения фичи и тестов → merge в master

### Feature ветки (опционально)
- **Формат:** `feature/название-фичи`
- **Примеры:**
  - `feature/auth-api`
  - `feature/document-upload`
  - `feature/ai-verification`
- **Workflow:**
  - Создать из dev: `git checkout -b feature/auth-api`
  - Разработка в feature ветке
  - После завершения: merge в dev
  - Удалить feature ветку

## Текущее состояние

```
* dev (текущая ветка)
  master
```

## Основной Workflow

### 1. Разработка новой функции

```bash
# Убедиться что в dev ветке
git checkout dev

# Создать feature ветку (опционально)
git checkout -b feature/auth-api

# Работать, коммитить часто
git add .
git commit -m "feat: implement user registration"

# Merge в dev когда готово
git checkout dev
git merge feature/auth-api

# Удалить feature ветку
git branch -d feature/auth-api
```

### 2. Релиз в master

```bash
# Убедиться что dev stable
npm test                  # Все тесты проходят
npm run build             # Проект собирается
npm run test:coverage     # Coverage > 80%

# Переключиться на master
git checkout master

# Merge из dev
git merge dev

# Создать версию
npm run release:minor     # или :patch / :major

# Push в remote (когда будет)
git push origin master --tags
```

### 3. Ежедневная работа (простой вариант)

```bash
# Работаем напрямую в dev
git checkout dev

# Пишем код, тесты
# ...

# Commit часто
git add .
git commit -m "feat: add login endpoint"

# Когда feature готова и протестирована
git checkout master
git merge dev
npm run release:patch
git checkout dev
```

## Соглашения о коммитах

### Формат:
```
<type>: <subject>

<body> (опционально)
```

### Types:
- `feat:` - новая функциональность
- `fix:` - исправление бага
- `test:` - добавление тестов
- `refactor:` - рефакторинг кода
- `docs:` - обновление документации
- `chore:` - обновление зависимостей, конфигов
- `style:` - форматирование кода
- `perf:` - улучшение производительности

### Примеры:
```bash
git commit -m "feat: implement user registration endpoint"
git commit -m "test: add auth middleware tests"
git commit -m "fix: handle duplicate email error in registration"
git commit -m "refactor: extract JWT logic to auth service"
git commit -m "docs: update API endpoints in README"
```

## Версионирование

### Semantic Versioning (semver): MAJOR.MINOR.PATCH

- **PATCH** (1.0.0 → 1.0.1): Bug fixes, мелкие изменения
  ```bash
  npm run release:patch
  ```

- **MINOR** (1.0.0 → 1.1.0): Новая функциональность (backwards-compatible)
  ```bash
  npm run release:minor
  ```

- **MAJOR** (1.0.0 → 2.0.0): Breaking changes
  ```bash
  npm run release:major
  ```

## Когда merge dev → master?

✅ **Merge когда:**
- Все тесты проходят
- Coverage > 80%
- Фича полностью реализована
- Код отрефакторен
- Документация обновлена
- Готово к использованию

❌ **НЕ merge когда:**
- Есть failing тесты
- Незавершенная фича
- Экспериментальный код
- Нет тестов для новой фичи

## Пример полного цикла разработки

### Day 1-2: Authentication API

```bash
# Работаем в dev
git checkout dev

# Пишем тест (Red)
git add tests/auth.test.ts
git commit -m "test: add registration endpoint test"

# Реализация (Green)
git add src/routes/auth.routes.ts src/controllers/auth.controller.ts
git commit -m "feat: implement user registration"

# Refactor
git add .
git commit -m "refactor: extract validation to separate schema"

# Все тесты проходят, готово к релизу
npm test
npm run test:coverage

# Merge в master
git checkout master
git merge dev
npm run release:minor  # 1.0.0 → 1.1.0
git tag -a v1.1.0 -m "Release 1.1.0 - Authentication API"

# Вернуться в dev для дальнейшей работы
git checkout dev
```

## Полезные команды

```bash
# Посмотреть текущую ветку
git branch

# Посмотреть все ветки
git branch -a

# История коммитов
git log --oneline --graph --all -10

# Статус изменений
git status

# Разница между ветками
git diff master dev

# Отменить последний commit (до push)
git reset --soft HEAD~1

# Посмотреть историю одного файла
git log --oneline -- src/app.ts
```

## Текущее состояние проекта

- **Версия:** 1.0.0
- **Текущая ветка:** dev
- **Последние коммиты:**
  ```
  7c26530 feat: add root endpoint with API info
  173638c update ignore
  a697391 docs: add detailed development roadmap
  28600b1 Initial project setup
  ```

## Следующие шаги

1. Разработка в ветке `dev`
2. После завершения Day 1-2 (Authentication API):
   - Все тесты проходят
   - Merge в master
   - `npm run release:minor` → 1.1.0
3. Вернуться в `dev` для Day 3-4
4. Повторить цикл

---

**Текущая ветка:** `dev` ✅
**Готово к разработке!** 🚀
