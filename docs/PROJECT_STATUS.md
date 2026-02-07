# Календарь Отпусков - Контекст Проекта

**Дата:** 7 февраля 2026
**Статус:** ✅ Разработка завершена, остаётся настройка webhook в Пачке

---

## Описание задачи

Система для автоматического сбора дат отпусков из рабочего чата Пачка и отображения в веб-календаре.

**Как работает:**
- Сотрудники пишут даты отпуска в чат в произвольной форме
- Webhook от Пачки отправляет сообщения на наш сервер
- DeepSeek AI распознаёт даты из естественного языка
- Данные сохраняются в Supabase
- Календарь отображается на сайте

---

## Что已完成 (Готово)

✅ **Next.js 15 приложение** - полностью работает
✅ **DeepSeek AI парсер** - распознаёт даты из текста
✅ **Supabase база данных** - таблица `vacations` создана
✅ **Веб-интерфейс:**
  - Календарь (месячный вид)
  - Список отпусков (таблица)
  - Переключение между видами
✅ **Webhook API** - принимает сообщения от Пачки
✅ **Автозамена** - повторное сообщение перезаписывает старый отпуск
✅ **Деплой на Vercel** - https://calendar-vacations.vercel.app

---

## Текущее состояние

**Сайт:** https://calendar-vacations.vercel.app
**Репозиторий:** https://github.com/MarinaLagarnikova/calendar-vacations

**Supabase:**
- Проект создан
- Таблица `vacations` существует
- Данные сохраняются корректно
- Тестовый отпуск: Иван Иванов, 15-25 июля 2026

**Webhook URL:**
```
https://calendar-vacations.vercel.app/api/webhook
```

---

## Что осталось сделать

### ⏳ Настройка Webhook в Пачке

**Блокировка:** У пользователя нет прав администратора в Пачке

**Решение:** В понедельник попросить администратора Пачки создать интеграцию

**Инструкция для администратора:**

1. Открыть Пачку → перейти в чат с отпусками
2. Меню **"Автоматизации"** (левая панель)
3. Выбрать **"Интеграции"**
4. Найти **"Webhook"** и нажать **"+"**
5. Настроить:
   - Название: `Календарь отпусков`
   - Аватарка: (опционально)
   - Для кого: выбрать "для одного чата" или "для нескольких"
6. **Исходящий webhook:**
   - URL: `https://calendar-vacations.vercel.app/api/webhook`
   - Выбрать: **"Любые сообщения"**
   - Команды: оставить пустым
7. Добавить бота в чат:
   - Настройки чата → Добавить участников
   - Вкладка "Интеграции"
   - Добавить "Календарь отпусков"
8. Закрепить ссылку на календарь в чате:
   - Отправить: `https://calendar-vacations.vercel.app`
   - Закрепить сообщение

---

## Ключевые данные

### Environment Variables (`.env.local`)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://emfynzrqgjlizachpyel.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtZnluenJxZ2psaXphY2hweWVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NjU4NjMsImV4cCI6MjA4NjA0MTg2M30.U64u09pExb7R-F9r4BPCi7v2Mh_MkF_dccHkFxR3mhg
DEEPSEEK_API_KEY=sk-3387adaa83444b26a4bf3ef5920e62d1
```

### Supabase

**Project URL:** `https://emfynzrqgjlizachpyel.supabase.co`
**Table:** `vacations`

```sql
CREATE TABLE IF NOT EXISTS vacations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_name TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  message_text TEXT
);
```

### Файлы проекта

```
calendar/
├── app/
│   ├── api/
│   │   ├── webhook/route.ts       # Webhook от Пачки
│   │   └── vacations/route.ts     # GET все отпуска
│   ├── page.tsx                    # Главная страница
│   └── globals.css
├── components/
│   ├── calendar.tsx                # Компонент календаря
│   ├── vacation-list.tsx           # Компонент списка
│   └── ui/                         # shadcn/ui компоненты
├── lib/
│   ├── ai-parser.ts                # DeepSeek парсер
│   ├── db.ts                       # Supabase клиент
│   └── types.ts                    # TypeScript типы
├── supabase/migrations/
│   └── 001_create_vacations.sql    # SQL миграция
└── docs/
    ├── plans/                      # Планы имплементации
    └── PROJECT_STATUS.md           # Этот файл
```

---

## Тестирование

### Тестовый запрос (работает):

```bash
curl -X POST https://calendar-vacations.vercel.app/api/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "text": "Отпуск 15-25 июля",
      "created_at": "2026-02-07T10:00:00Z"
    },
    "author": {
      "id": "12345",
      "name": "Иван Иванов"
    }
  }'
```

**Результат:** Отпуск создан в базе данных ✅

### Проверить отпуска:

```bash
curl https://calendar-vacations.vercel.app/api/vacations
```

---

## Примеры использования

После настройки webhook, сотрудники могут писать:

```
Отпуск 15-25 июля
Уезжаю 1-10 сентября
С 5 августа на 2 недели
```

И всё автоматически появится в календаре!

---

## AI Парсер (DeepSeek)

**Промпт:** Распознаёт даты из русского текста
**Модель:** deepseek-chat
**Формат ответа:** JSON с полями `employee_name`, `start_date`, `end_date`

---

## Важные ссылки

- **Календарь:** https://calendar-vacations.vercel.app
- **GitHub:** https://github.com/MarinaLagarnikova/calendar-vacations
- **Vercel Dashboard:** https://vercel.com (залогинена)
- **Supabase Dashboard:** https://supabase.com (залогинена)
- **Дизайн системы:** `docs/plans/2026-02-07-vacation-calendar-design.md`
- **План имплементации:** `docs/plans/2026-02-07-vacation-calendar-implementation.md`

---

## Следующие шаги в понедельник

1. ✅ Администратор настраивает webhook в Пачке
2. ✅ Добавить бота "Календарь отпусков" в чат
3. ✅ Закрепить ссылку на календарь в чате
4. ✅ Написать тестовое сообщение: `Отпуск 1-10 марта`
5. ✅ Проверить что отпуск появился на сайте
6. ✅ Сообщить сотрудникам как пользоваться

---

## Возможные проблемы

### Если webhook не работает:
- Проверить logs в Vercel Dashboard
- Проверить что URL webhook правильный
- Проверить что бот добавлен в чат

### Если AI не распознаёт даты:
- Попробуйте более простой формат: `Отпуск 15-25 июля`
- Проверить logs в Vercel

### Если календарь пустой:
- Проверить Supabase Table Editor → таблица `vacations`
- Проверить что webhook настроен правильно

---

## Контакты и ресурсы

- **Пачка документация webhook:** https://pachca.com/help-center/integrations/webhook
- **DeepSeek API:** https://api.deepseek.com
- **Supabase:** https://supabase.com

---

**Последнее обновление:** 7 февраля 2026, 15:49
**Статус:** Ждёт настройки webhook в Пачке
