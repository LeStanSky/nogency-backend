# Git Hooks Configuration

Проект использует **Husky** для автоматической проверки качества кода перед коммитами и пушами.

## Установленные хуки

### 1. pre-commit - Проверка перед коммитом

**Что проверяется:**

- ✅ ESLint (Google Style Guide)
- ✅ Prettier форматирование
- ✅ Только для staged файлов (через lint-staged)

**Как работает:**

```bash
git add .
git commit -m "feat: add new feature"
# Автоматически запускается:
# 1. ESLint проверка и автофикс
# 2. Prettier форматирование
# 3. Если есть ошибки - коммит блокируется
```

**Файлы, которые проверяются:**

- `*.ts` - ESLint + Prettier
- `*.json, *.md` - Prettier

**Конфигурация в package.json:**

```json
"lint-staged": {
  "*.ts": [
    "eslint --fix",
    "prettier --write"
  ],
  "*.{json,md}": [
    "prettier --write"
  ]
}
```

---

### 2. pre-push - Проверка перед push в master

**Что проверяется (только для ветки master):**

- ✅ ESLint (полная проверка всего кода)
- ✅ Тесты (с coverage)
- ✅ Build (TypeScript компиляция)

**Как работает:**

```bash
git checkout master
git merge dev
git push origin master
# Автоматически запускается:
# 1. npm run lint (весь проект)
# 2. npm run test:coverage (все тесты)
# 3. npm run build (проверка сборки)
# 4. Если что-то фейлится - push блокируется
```

**Для других веток (dev, feature/\*):**

- Pre-push hook НЕ запускается
- Можно пушить без проверок (для быстрой разработки)

---

## ESLint правила (Google Style Guide)

### Основные правила:

- **Indent:** 2 spaces
- **Max line length:** 100 символов
- **Object spacing:** `{ foo: 'bar' }` (с пробелами)
- **Trailing commas:** Да (для массивов/объектов)
- **Single quotes:** Да
- **Semi:** Да

### TypeScript правила:

- `@typescript-eslint/no-explicit-any` - warning (можно использовать, но с осторожностью)
- `@typescript-eslint/no-unused-vars` - error (неиспользуемые переменные запрещены)
- Можно использовать `_` для игнорируемых параметров

### Примеры:

✅ **Правильно:**

```typescript
const myFunction = (arg1: string, arg2: number) => {
  const result = {
    name: 'test',
    value: 123,
  };
  return result;
};
```

❌ **Неправильно:**

```typescript
const myFunction = (arg1: string, arg2: number) => {
  // Неправильный отступ
  const result = { name: 'test', value: 123 }; // Нет пробелов, нет trailing comma
  return result;
}; // Нет точки с запятой
```

---

## Prettier конфигурация

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always"
}
```

---

## Как работать с хуками

### Обычный workflow:

```bash
# 1. Пишем код
# ...

# 2. Коммитим (автоматически проверяется lint + format)
git add .
git commit -m "feat: add new feature"
# ✅ Если всё ок - коммит создастся
# ❌ Если есть ошибки - коммит заблокируется

# 3. Пушим в dev (без проверок)
git push origin dev

# 4. Когда готовы к релизу - merge в master
git checkout master
git merge dev
git push origin master
# ✅ Запустятся все проверки (lint + tests + build)
# ❌ Если что-то не пройдет - push заблокируется
```

### Если нужно пропустить хуки (НЕ РЕКОМЕНДУЕТСЯ):

```bash
# Пропустить pre-commit
git commit -m "WIP" --no-verify

# Пропустить pre-push
git push --no-verify
```

⚠️ **Внимание:** Используйте `--no-verify` только в исключительных случаях!

---

## Исправление ошибок линтинга

### Автоматическое исправление:

```bash
# Исправить все файлы
npm run lint -- --fix
npm run format

# Исправить конкретный файл
npx eslint src/app.ts --fix
npx prettier --write src/app.ts
```

### Проверка без исправления:

```bash
npm run lint
```

---

## Проверка перед коммитом вручную

Если хотите проверить код ДО коммита:

```bash
# Lint
npm run lint

# Format
npm run format

# Tests
npm test

# Coverage
npm run test:coverage

# Build
npm run build

# Всё сразу
npm run lint && npm run test:coverage && npm run build
```

---

## Отладка хуков

### Проверить что хуки установлены:

```bash
ls -la .husky/
# Должны быть файлы: pre-commit, pre-push
```

### Запустить хуки вручную:

```bash
# pre-commit
npx lint-staged

# pre-push (для master)
npm run lint && npm run test:coverage && npm run build
```

### Переустановить хуки:

```bash
rm -rf .husky
npm run prepare
```

---

## Что делать если коммит блокируется?

### Сценарий 1: ESLint ошибки

```bash
git commit -m "feat: add new feature"
# ❌ Error: ESLint found errors

# Исправить автоматически
npm run lint -- --fix

# Проверить что исправилось
npm run lint

# Коммитить снова
git add .
git commit -m "feat: add new feature"
```

### Сценарий 2: Prettier ошибки

```bash
git commit -m "feat: add new feature"
# ❌ Error: Prettier formatting issues

# Исправить
npm run format

# Коммитить снова
git add .
git commit -m "feat: add new feature"
```

### Сценарий 3: Push в master блокируется

```bash
git push origin master
# ❌ Error: Tests failed

# Исправить тесты
npm test

# Проверить coverage
npm run test:coverage

# Проверить build
npm run build

# Пушить снова
git push origin master
```

---

## Интеграция с IDE

### VS Code

Установите расширения:

- ESLint
- Prettier

Настройте `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "eslint.validate": ["typescript"],
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

### WebStorm / IntelliJ

Settings → Languages & Frameworks → JavaScript → Code Quality Tools → ESLint

- ✅ Automatic ESLint configuration
- ✅ Run eslint --fix on save

---

## FAQ

**Q: Можно ли отключить хуки?**
A: Да, но не рекомендуется. Используйте `--no-verify` только для WIP коммитов.

**Q: Почему pre-push только для master?**
A: Чтобы не замедлять разработку в dev ветке. Master = production, нужны все проверки.

**Q: Что если хук ошибочно блокирует коммит?**
A: Проверьте конфигурацию ESLint/Prettier. Если правило некорректно - отредактируйте `.eslintrc.cjs`

**Q: Хуки не работают после git clone**
A: Запустите `npm install` - это выполнит `npm run prepare` и установит хуки.

---

## Полезные команды

```bash
# Проверить статус хуков
git config core.hooksPath

# Посмотреть какие файлы будут проверены
npx lint-staged --dry-run

# Обновить зависимости линтинга
npm update eslint prettier husky lint-staged

# Очистить кеш ESLint
rm -rf node_modules/.cache/eslint
```

---

**Настроено:** ✅
**Последнее обновление:** 2025-12-10
