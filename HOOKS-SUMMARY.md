# Git Hooks - Краткая справка

## ✅ Что настроено

### Pre-commit Hook

- **Когда:** При каждом `git commit`
- **Что делает:**
  - Проверяет только staged файлы (lint-staged)
  - ESLint --fix (автоисправление)
  - Prettier --write (форматирование)
- **Результат:** Коммит блокируется если есть неисправимые ошибки ESLint

### Pre-push Hook

- **Когда:** При `git push origin master`
- **Что делает:**
  - ESLint полная проверка (`npm run lint`)
  - Все тесты с coverage (`npm run test:coverage`)
  - TypeScript build (`npm run build`)
- **Результат:** Push в master блокируется если что-то фейлится
- **Примечание:** Для других веток (dev, feature/\*) hook НЕ запускается

---

## 🎯 ESLint правила (Google Style)

```javascript
{
  indent: 2 spaces,
  maxLineLength: 100,
  quotes: 'single',
  semi: true,
  trailingComma: 'es5',
  objectCurlySpacing: true,
}
```

**Проверка:** `npm run lint`
**Автофикс:** `npm run lint -- --fix`

---

## 🎨 Prettier конфигурация

```json
{
  "semi": true,
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "trailingComma": "es5"
}
```

**Форматирование:** `npm run format`

---

## 📝 Быстрые команды

```bash
# Проверить код перед коммитом
npm run lint && npm run format

# Полная проверка (как для master)
npm run lint && npm run test:coverage && npm run build

# Исправить все автоматически
npm run lint -- --fix && npm run format

# Пропустить хук (НЕ РЕКОМЕНДУЕТСЯ!)
git commit --no-verify
git push --no-verify
```

---

## 🚫 Обход хуков

**Только в исключительных случаях!**

```bash
# WIP коммит без проверки
git commit -m "WIP: in progress" --no-verify

# Emergency push
git push --no-verify
```

⚠️ Используйте с осторожностью!

---

## 📚 Полная документация

См. [HOOKS.md](./HOOKS.md) для подробной информации.
