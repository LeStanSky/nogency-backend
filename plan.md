# NoGency AI — План на 6 недель
**Документ для обсуждения со Стасом**

## 1. Контекст и цель

### Что строим
NoGency AI — платформа для сдачи недвижимости в аренду без агентства.

**Целевой сегмент:** Tech-savvy владельцы 35-45 лет, 1-2 квартиры в Валенсии (Ruzafa/El Mercat), €1000+/месяц. Часто живут не в том городе, где квартира.

### Цель на 6 недель
Доказать, что модель работает:
- Платформа функционирует
- Владельцы регистрируются и платят
- Сделки закрываются

### Бизнес-модель (Tier 2 — фокус на MVP)
**Цена:** €149-299 за сделку ("founding member price" €149)

**Что включено:**
- Верификация владельца и квартиры
- Профессиональные фото (наш агент)
- Публикация на Idealista/Fotocasa
- AI-скоринг арендаторов
- Генерация договора
- Booking показов через календарь

**Не включено в MVP:**
- Escrow (упрощаем: арендатор платит на Stripe → мы переводим владельцу)
- Страховка от неуплаты (referral к партнёрам)
- Property management

## 2. Разделение ролей

| Яша (Product/Design/Growth) | Стас (CTO/Backend) |
|---|---|
| UX/UI дизайн | Backend architecture |
| Frontend (React/Next + Cursor) | API endpoints |
| Landing page | Database schema |
| Growth experiments | AI integrations (Claude API) |
| Customer development | DevOps, deploy |
| Warm leads activation | Security, data storage |
| Контент, копирайтинг | Third-party integrations |

**Языки:** Яша — EN segment, Стас — ES segment (+ техническая часть)

## 3. Tech Stack (для обсуждения)

### Предлагаемый вариант:

| Компонент | Технология | Почему |
|---|---|---|
| Database | Supabase (Postgres) | Быстрый старт, Auth + Storage включены |
| Auth | Supabase Auth | Из коробки |
| File Storage | Supabase Storage | Encrypted, GDPR-ready |
| Backend API | Supabase Edge Functions или FastAPI | Зависит от preference Стаса |
| Frontend | Next.js + Tailwind | Яша может помочь через Cursor |
| AI | Claude API | Верификация документов, скоринг |
| Payments | Stripe | Уже подключён к autonomo |
| Hosting | Vercel или Cloudflare | Free tier достаточен |

**Вопрос Стасу:** На чём сделаешь рабочий MVP быстрее — Next.js или что-то ближе к Java/Kotlin? Главное — скорость, не "правильность".

## 4. Недельный план (6 спринтов)

### WEEK 1-2: Foundation

#### Стас — Backend Core

| День | Задача | Deliverable |
|---|---|---|
| 1-2 | Supabase setup + Auth | Работающая регистрация/логин |
| 3-4 | Document upload + Storage | Владелец может загрузить PDF |
| 5-7 | API: documents endpoints | GET/POST /documents работает |
| 8-10 | AI Document Verification | Upload DNI → получить extracted data |
| 11-14 | Owner data API | GET /owner/listing, GET /owner/applications |

**Checkpoint Week 2:** Working URL где можно зарегистрироваться и загрузить документ.

#### Яша — Product + Growth

| День | Задача | Deliverable |
|---|---|---|
| 1-3 | Landing redesign | Новый landing с trust elements |
| 4-5 | Owner onboarding flow | Figma + начало кода |
| 6-7 | Tenant application form | Дизайн формы |
| 8-10 | Warm leads outreach | 3 владельца согласились на beta |
| 11-14 | Frontend: auth + upload | Подключение к API Стаса |

**Checkpoint Week 2:** 2-3 владельца готовы к beta, базовый UI работает.

### WEEK 3-4: MVP Launch

#### Стас

| Задача | Deliverable |
|---|---|
| Tenant application form API | Арендатор заполняет → данные в DB |
| AI Scoring endpoint | Заявка → score 1-100 + reasoning |
| Contract generator | Input data → PDF договора |
| Calendar integration | Cal.com или Calendly embed |
| Bug fixes | Стабильная платформа |

**Checkpoint Week 4:** Полный flow работает end-to-end.

#### Яша

| Задача | Deliverable |
|---|---|
| Beta onboarding 3-5 owners | Реальные пользователи на платформе |
| Listing page UI | Страница квартиры для арендаторов |
| Applications dashboard UI | Владелец видит заявки + scores |
| Daily support для beta | Сбор feedback |
| Idealista manual posting | Первые листинги опубликованы |

**Checkpoint Week 4:** 3-5 квартир на платформе, первые заявки от арендаторов.

### WEEK 5-6: Growth + Iteration

#### Стас

| Задача | Deliverable |
|---|---|
| Stripe payment flow | Арендатор может заплатить |
| Fixes из beta feedback | Улучшения по результатам |
| Email notifications | Alerts о новых заявках |
| Performance optimization | Если нужно |

#### Яша

| Задача | Deliverable |
|---|---|
| Cold outreach (Idealista scraping) | 100 писем владельцам |
| Facebook groups | Посты в Valencia Expats и др. |
| Referral от beta users | "Приведи друга" |
| Testimonials collection | Материал для marketing |
| Закрытие первых сделок | Договоры подписаны |

**Checkpoint Week 6:** 2-3 закрытые сделки, €300-600 выручки.

## 5. Метрики успеха (6 недель)

| Метрика | Target | Stretch |
|---|---|---|
| Владельцев на платформе | 10 | 20 |
| Активных листингов | 5 | 10 |
| Заявок от арендаторов | 20 | 40 |
| Закрытых сделок | 2-3 | 5 |
| Выручка | €300-450 | €750 |
| NPS от beta users | 8+ | 9+ |

## 6. Sync ритуал

### Weekly Sync (каждое воскресенье, 60 мин)
- **Review (15 мин):** Что сделано за неделю
- **Demo (15 мин):** Показать работающий результат
- **Blockers (10 мин):** Что мешает двигаться
- **Planning (15 мин):** Приоритеты на следующую неделю
- **Метрики (5 мин):** Где мы относительно целей

### Daily async (по необходимости)
- Telegram/Slack для быстрых вопросов
- Не ждать sync если что-то блокирует

### Task tracking
- Notion или Linear (простой kanban)
- Колонки: Backlog → This Week → In Progress → Done
- Каждая задача = конкретный deliverable

## 7. Критерии успеха партнёрства

### Что оцениваем через 6 недель:

| Критерий | Хорошо | Red flag |
|---|---|---|
| Delivery | Делает что обещал, в срок | Постоянные задержки без предупреждения |
| Communication | Отвечает в течение дня, предупреждает о проблемах | Пропадает на 2-3 дня, молчит о blockers |
| Problem-solving | Предлагает решения, не только проблемы | Blame game, "это не моя часть" |
| Commitment | Реально вкладывает обещанные часы | Меньше 50% от обещанного |
| Quality | Работает стабильно, можно показать клиентам | Постоянные баги, "у меня работает" |
| Chemistry | Комфортно работать, конструктивные дискуссии | Конфликты, раздражение, defensive |

### Red flags (немедленное обсуждение):
- 2 недели подряд нет working demo
- Не отвечает более 48 часов без предупреждения
- Переписывает уже готовое "потому что нашёл лучший способ"
- Не может объяснить как работает его код
- Scope creep без обсуждения

### Честный разговор в конце:
Через 6 недель открыто обсуждаем:
1. Что получилось хорошо?
2. Что было сложно?
3. Хотим ли продолжать?
4. Если да — на каких условиях?

## 8. Scope: что делаем и что НЕ делаем

### В SCOPE (MVP Beta):
- ✅ Owner registration + verification
- ✅ Document upload + AI verification
- ✅ Listing creation (фото, описание, цена)
- ✅ Manual posting на Idealista (вами)
- ✅ Tenant application form + AI scoring
- ✅ Applications dashboard для owner
- ✅ Contract generation (PDF)
- ✅ Calendar для показов (embed)
- ✅ Stripe payment (простой flow)

### НЕ в SCOPE (Phase 2+):
- ❌ Автоматическая синдикация Idealista API
- ❌ Escrow с hold периодом
- ❌ Внутренний чат owner ↔ tenant
- ❌ Страховка от неуплаты (только referral)
- ❌ Property management (Tier 3)
- ❌ Tenant-side monetization
- ❌ Mobile app

**Правило:** Если кто-то хочет добавить фичу — обсуждаем на sync, не делаем молча.

## 9. Вопросы для обсуждения со Стасом

### Commitment
- [ ] Сколько часов в неделю реально можешь вкладывать? (15? 20?)
- [ ] Есть ли периоды когда будешь недоступен?

### Tech
- [ ] На чём сделаешь быстрее — Next.js или ближе к Java stack?
- [ ] Supabase подходит или предпочитаешь другое?
- [ ] Что будет готово через 7 дней? (конкретно)

### Process
- [ ] Воскресенье вечер для sync подходит?
- [ ] Notion или Linear для задач?
- [ ] Как предпочитаешь коммуницировать (Telegram, Slack)?

### Partnership
- [ ] Что для тебя важно в этом проекте?
- [ ] Какие у тебя ожидания от сотрудничества?
- [ ] Equity/compensation — обсуждаем сейчас или после validation?
- [ ] Что будет red flag для тебя?

## 10. Следующие шаги после встречи
- **Сегодня:** Зафиксировать договорённости письменно
- **Завтра:** Создать Notion/Linear board, добавить задачи Week 1
- **Эта неделя:** Первые deliverables от каждого
- **Воскресенье:** Первый weekly sync

## Приложение: Warm leads для beta

| Владелец | Контакт | Статус | Notes |
|---|---|---|---|
| Pablo 2 | [контакт] | Из CustDev, DIY-oriented | Готов попробовать |
| Fer | [контакт] | Из CustDev, удалённый владелец | Идеальный ICP |
| [Другие] |  |  |  |

---
**Документ подготовлен:** [дата]
**Версия:** 1.0
