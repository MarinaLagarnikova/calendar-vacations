# Vacation Calendar Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a vacation calendar system that automatically extracts vacation dates from Pachca chat messages using DeepSeek AI and displays them in a web calendar.

**Architecture:** Pachca sends webhooks to Next.js API route → DeepSeek API parses dates from natural language → Supabase stores vacation data → Frontend displays calendar and list views.

**Tech Stack:** Next.js 15, DeepSeek API, Supabase PostgreSQL, React Big Calendar, shadcn/ui, Tailwind CSS, Vercel

---

## Task 1: Initialize Next.js Project

**Files:**
- Create: `package.json`, `next.config.js`, `tsconfig.json`, `tailwind.config.ts`
- Create: `app/layout.tsx`, `app/page.tsx`, `app/globals.css`

**Step 1: Create Next.js project**

Run:
```bash
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*" --use-npm
```

Expected: Project created with Next.js 15, TypeScript, Tailwind CSS

**Step 2: Install additional dependencies**

Run:
```bash
npm install date-fns react-big-calendar supabase openai
npm install -D @types/date-fns @types/react-big-calendar
```

Expected: All packages installed successfully

**Step 3: Initialize shadcn/ui**

Run:
```bash
npx shadcn@latest init -y
npx shadcn@latest add button tabs --yes
```

Expected: shadcn configured, button and tabs components added

**Step 4: Create environment file template**

Create: `.env.local.example`
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# DeepSeek API
DEEPSEEK_API_KEY=your_deepseek_api_key
```

**Step 5: Copy environment file**

Run:
```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
DEEPSEEK_API_KEY=sk-3387adaa83444b26a4bf3ef5920e62d1
```

**Step 6: Commit**

Run:
```bash
git add .
git commit -m "feat: initialize Next.js project with dependencies"
```

---

## Task 2: Setup Supabase

**Files:**
- Create: `supabase/migrations/001_create_vacations.sql`
- Create: `lib/db.ts`

**Step 1: Create migrations directory**

Run:
```bash
mkdir -p supabase/migrations
```

**Step 2: Create database migration**

Create: `supabase/migrations/001_create_vacations.sql`
```sql
-- Vacations table
CREATE TABLE IF NOT EXISTS vacations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_name TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  message_text TEXT
);

-- Index for faster queries by employee
CREATE INDEX IF NOT EXISTS idx_vacations_employee_id ON vacations(employee_id);

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_vacations_dates ON vacations(start_date, end_date);
```

**Step 3: Create Supabase client**

Create: `lib/db.ts`
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Vacation = {
  id: string
  employee_name: string
  employee_id: string
  start_date: string
  end_date: string
  created_at: string
  message_text?: string
}
```

**Step 4: Commit**

Run:
```bash
git add supabase/migrations lib/db.ts
git commit -m "feat: setup Supabase database schema"
```

---

## Task 3: Create AI Parser with DeepSeek

**Files:**
- Create: `lib/ai-parser.ts`
- Create: `lib/types.ts`

**Step 1: Create types**

Create: `lib/types.ts`
```typescript
export interface PachcaMessage {
  message: {
    text: string
    created_at: string
  }
  author: {
    id: string
    name: string
  }
}

export interface ParsedVacation {
  employee_name: string
  start_date: string  // YYYY-MM-DD
  end_date: string    // YYYY-MM-DD
}

export interface AIResponse {
  employee_name?: string
  start_date?: string
  end_date?: string
  vacation?: null
}
```

**Step 2: Create AI parser**

Create: `lib/ai-parser.ts`
```typescript
import OpenAI from 'openai'
import { PachcaMessage, ParsedVacation, AIResponse } from './types'

const deepseek = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY,
})

const SYSTEM_PROMPT = `Ты - парсер отпусков. Извлеки из сообщения информацию об отпуске.

ПРАВИЛА:
- Извлеки имя сотрудника и даты начала/конца отпуска
- Если год не указан - используй текущий 2026
- Отвечай ТОЛЬКО валидным JSON
- Если в сообщении нет информации об отпуске - верни {"vacation": null}

ФОРМАТ ОТВЕТА (JSON):
{
  "employee_name": "имя",
  "start_date": "YYYY-MM-DD",
  "end_date": "YYYY-MM-DD"
}

ПРИМЕРЫ:
ВХОД: "Уезжаю 15-25 июля"
ВЫХОД: {"employee_name": "Иван", "start_date": "2026-07-15", "end_date": "2026-07-25"}

ВХОД: "С 1 по 10 сентября буду в отпуске"
ВЫХОД: {"employee_name": "Мария", "start_date": "2026-09-01", "end_date": "2026-09-10"}

ВХОД: "Привет всем!"
ВЫХОД: {"vacation": null}`

export async function parseVacation(message: PachcaMessage): Promise<ParsedVacation | null> {
  try {
    const response = await deepseek.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Сообщение: ${message.message.text}\n\nАвтор: ${message.author.name}` }
      ],
      temperature: 0,
      max_tokens: 200,
    })

    const content = response.choices[0].message.content
    if (!content) return null

    const parsed: AIResponse = JSON.parse(content)

    // Check if no vacation found
    if (parsed.vacation === null) return null

    // Validate required fields
    if (!parsed.employee_name || !parsed.start_date || !parsed.end_date) {
      return null
    }

    return {
      employee_name: parsed.employee_name,
      start_date: parsed.start_date,
      end_date: parsed.end_date,
    }
  } catch (error) {
    console.error('AI parsing error:', error)
    return null
  }
}
```

**Step 3: Commit**

Run:
```bash
git add lib/types.ts lib/ai-parser.ts
git commit -m "feat: add DeepSeek AI parser for vacation dates"
```

---

## Task 4: Create Webhook API Route

**Files:**
- Create: `app/api/webhook/route.ts`

**Step 1: Create webhook handler**

Create: `app/api/webhook/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { parseVacation } from '@/lib/ai-parser'
import { supabase } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Parse vacation from message
    const vacation = await parseVacation(body)

    // If not a vacation message, just return 200
    if (!vacation) {
      return NextResponse.json({ success: true, vacation: false })
    }

    // Check if employee already has a vacation (auto-replace)
    const { data: existing } = await supabase
      .from('vacations')
      .select('*')
      .eq('employee_id', body.author.id)
      .maybeSingle()

    if (existing) {
      // Delete old vacation
      await supabase
        .from('vacations')
        .delete()
        .eq('employee_id', body.author.id)
    }

    // Insert new vacation
    const { error } = await supabase
      .from('vacations')
      .insert({
        employee_name: vacation.employee_name,
        employee_id: body.author.id,
        start_date: vacation.start_date,
        end_date: vacation.end_date,
        message_text: body.message.text,
      })

    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      vacation: true,
      data: vacation,
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
  }
}
```

**Step 2: Commit**

Run:
```bash
git add app/api/webhook/route.ts
git commit -m "feat: add Pachca webhook endpoint"
```

---

## Task 5: Create Vacations API Route

**Files:**
- Create: `app/api/vacations/route.ts`

**Step 1: Create vacations endpoint**

Create: `app/api/vacations/route.ts`
```typescript
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/db'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('vacations')
      .select('*')
      .order('start_date', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

**Step 2: Commit**

Run:
```bash
git add app/api/vacations/route.ts
git commit -m "feat: add vacations API endpoint"
```

---

## Task 6: Create Calendar Component

**Files:**
- Create: `components/calendar.tsx`

**Step 1: Create calendar component**

Create: `components/calendar.tsx`
```typescript
'use client'

import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { enUS } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import type { Vacation } from '@/lib/db'

const locales = { 'en-US': enUS }

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

interface CalendarProps {
  vacations: Vacation[]
}

// Generate color for employee
function getColor(name: string) {
  const colors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

export function VacationCalendar({ vacations }: CalendarProps) {
  const events = vacations.map((v) => ({
    title: v.employee_name,
    start: new Date(v.start_date),
    end: new Date(v.end_date),
    resource: v,
  }))

  const eventStyleGetter = (event: any) => {
    const color = getColor(event.title)
    return {
      style: {
        backgroundColor: color,
        borderRadius: '4px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block',
      },
    }
  }

  return (
    <div className="h-[600px]">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '100%' }}
        views={[Views.MONTH]}
        defaultView={Views.MONTH}
        eventPropGetter={eventStyleGetter}
      />
    </div>
  )
}
```

**Step 2: Commit**

Run:
```bash
git add components/calendar.tsx
git commit -m "feat: add calendar component"
```

---

## Task 7: Create Vacation List Component

**Files:**
- Create: `components/vacation-list.tsx`

**Step 1: Create list component**

Create: `components/vacation-list.tsx`
```typescript
import { Vacation } from '@/lib/db'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

interface VacationListProps {
  vacations: Vacation[]
}

export function VacationList({ vacations }: VacationListProps) {
  return (
    <div className="rounded-md border">
      <div className="grid grid-cols-3 gap-4 p-4 border-b bg-muted font-medium">
        <div>Сотрудник</div>
        <div>Дата начала</div>
        <div>Дата окончания</div>
      </div>
      <div>
        {vacations.map((vacation) => (
          <div
            key={vacation.id}
            className="grid grid-cols-3 gap-4 p-4 border-b last:border-0 hover:bg-muted/50"
          >
            <div className="font-medium">{vacation.employee_name}</div>
            <div>{format(new Date(vacation.start_date), 'dd MMM yyyy', { locale: ru })}</div>
            <div>{format(new Date(vacation.end_date), 'dd MMM yyyy', { locale: ru })}</div>
          </div>
        ))}
        {vacations.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            Нет запланированных отпусков
          </div>
        )}
      </div>
    </div>
  )
}
```

**Step 2: Install date-fns locale**

Run:
```bash
npm install date-fns
```

**Step 3: Commit**

Run:
```bash
git add components/vacation-list.tsx
git commit -m "feat: add vacation list component"
```

---

## Task 8: Create Main Page

**Files:**
- Modify: `app/page.tsx`

**Step 1: Update main page**

Replace: `app/page.tsx`
```typescript
import { VacationCalendar } from '@/components/calendar'
import { VacationList } from '@/components/vacation-list'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { supabase } from '@/lib/db'

async function getVacations() {
  const { data } = await supabase
    .from('vacations')
    .select('*')
    .order('start_date', { ascending: true })

  return data || []
}

export default async function Home() {
  const vacations = await getVacations()

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Календарь отпусков</h1>

        <Tabs defaultValue="calendar" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="calendar">Календарь</TabsTrigger>
            <TabsTrigger value="list">Список</TabsTrigger>
          </TabsList>

          <TabsContent value="calendar">
            <VacationCalendar vacations={vacations} />
          </TabsContent>

          <TabsContent value="list">
            <VacationList vacations={vacations} />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
```

**Step 2: Commit**

Run:
```bash
git add app/page.tsx
git commit -m "feat: add main page with calendar and list views"
```

---

## Task 9: Update Layout and Styles

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`

**Step 1: Update layout**

Replace: `app/layout.tsx`
```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Календарь отпусков',
  description: 'Календарь отпусков команды',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
```

**Step 2: Update global styles**

Replace: `app/globals.css`
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}

/* Calendar override */
.rbc-toolbar {
  margin-bottom: 1rem !important;
}

.rbc-toolbar button {
  @apply px-4 py-2 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground;
}

.rbc-toolbar button.rbc-active {
  @apply bg-primary text-primary-foreground;
}

.rbc-month-view {
  @apply border border-border rounded-lg;
}

.rbc-header {
  @apply p-2 text-center font-medium;
}

.rbc-day-bg + .rbc-day-bg {
  @apply border-l border-border;
}

.rbc-row-bg + .rbc-row-bg .rbc-day-bg {
  @apply border-t border-border;
}

.rbc-event {
  @apply cursor-pointer;
}

.rbc-today {
  @apply bg-muted/50;
}
```

**Step 3: Commit**

Run:
```bash
git add app/layout.tsx app/globals.css
git commit -m "style: update layout and global styles"
```

---

## Task 10: Local Testing

**Files:**
- None

**Step 1: Start development server**

Run:
```bash
npm run dev
```

Expected: Server starts on http://localhost:3000

**Step 2: Test webhook locally**

Run in another terminal:
```bash
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "text": "Уезжаю в отпуск с 15 по 25 июля",
      "created_at": "2026-02-07T10:00:00Z"
    },
    "author": {
      "id": "12345",
      "name": "Иван Иванов"
    }
  }'
```

Expected: `{"success":true,"vacation":true,"data":{...}}`

**Step 3: Verify in database**

Check Supabase dashboard:
- Go to Table Editor → vacations
- Should see one record for Иван Иванов

**Step 4: Check calendar**

Open: http://localhost:3000
- Should see calendar with Иван's vacation highlighted in July
- Switch to List tab - should see Иван in the table

**Step 5: Test auto-replace**

Run:
```bash
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "text": "Изменяю даты: с 20 по 30 июля",
      "created_at": "2026-02-07T11:00:00Z"
    },
    "author": {
      "id": "12345",
      "name": "Иван Иванов"
    }
  }'
```

Expected: `{"success":true,"vacation":true,"data":{...}}`

Check Supabase: should only have ONE record (old deleted, new added)

**Step 6: Test non-vacation message**

Run:
```bash
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "text": "Привет всем!",
      "created_at": "2026-02-07T12:00:00Z"
    },
    "author": {
      "id": "67890",
      "name": "Мария"
    }
  }'
```

Expected: `{"success":true,"vacation":false}`

Check Supabase: no new record

**Step 7: Commit**

Run:
```bash
git add .
git commit -m "test: verify local webhook and calendar functionality"
```

---

## Task 11: Deploy to Vercel

**Files:**
- None

**Step 1: Create GitHub repository**

Run:
```bash
gh repo create calendar-vacations --source=. --remote=origin --push --public
```

Or manually:
```bash
# Create repo on GitHub first, then:
git remote add origin https://github.com/YOUR_USERNAME/calendar-vacations.git
git branch -M main
git push -u origin main
```

**Step 2: Deploy on Vercel**

1. Go to https://vercel.com
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Add environment variables in Settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `DEEPSEEK_API_KEY`
5. Click "Deploy"

Expected: Deploy completes, get URL like `https://calendar-vacations.vercel.app`

**Step 3: Test production**

Run:
```bash
curl -X POST https://calendar-vacations.vercel.app/api/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "text": "Тест отпуска 1-5 марта",
      "created_at": "2026-02-07T13:00:00Z"
    },
    "author": {
      "id": "99999",
      "name": "Test User"
    }
  }'
```

Expected: `{"success":true,"vacation":true}`

**Step 4: Open in browser**

Navigate to: `https://calendar-vacations.vercel.app`
- Should see calendar with Test User's vacation

**Step 5: Commit**

Run:
```bash
git add .
git commit -m "deploy: deploy to Vercel"
git push
```

---

## Task 12: Setup Pachca Integration

**Files:**
- None

**Step 1: Create Pachca webhook bot**

In Pachca:
1. Open "Автоматизации" → "Интеграции"
2. Find "Webhook" and click "+"
3. Configure:
   - Name: "Календарь отпусков"
   - Avatar: upload calendar icon
   - Scope: Select "для одного чата" or "для нескольких"
   - Permissions: choose who can add bot to chats

**Step 2: Configure outgoing webhook**

In the integration settings:
- Outgoing Webhook URL: `https://calendar-vacations.vercel.app/api/webhook`
- Select: "Любые сообщения" (any messages)
- Commands: leave empty (we want all messages)

**Step 3: Add bot to chat**

In your Pachca vacation chat:
1. Open chat settings
2. "Добавить участников"
3. Go to "Интеграции" tab
4. Add your "Календарь отпусков" bot

**Step 4: Test in real chat**

Send message in Pachca:
```
Уезжаю в отпуск 10-20 августа
```

Expected:
- Webhook receives message
- AI parses dates
- Calendar updates
- Visit Vercel URL → see vacation in calendar

**Step 5: Pin calendar in chat**

In Pachca:
1. Share the Vercel URL to the chat
2. Pin the message with calendar link

**Step 6: Document setup**

Create: `docs/PACHCA_SETUP.md`
```markdown
# Pachca Integration Setup

## Webhook Configuration

URL: `https://calendar-vacations.vercel.app/api/webhook`

## Usage

Employees can write vacation dates in natural language:
- "Уезжаю 15-25 июля"
- "С 1 по 10 сентября буду в отпуске"
- "Отпуск с 5 августа на 2 недели"

The AI will automatically parse and update the calendar.

## Calendar URL

`https://calendar-vacations.vercel.app`
```

**Step 7: Commit**

Run:
```bash
git add docs/PACHCA_SETUP.md
git commit -m "docs: add Pachca setup instructions"
git push
```

---

## Task 13: Post-Deployment Verification

**Files:**
- None

**Step 1: Test multiple employees**

Send from Pachca as different users:
- User 1: "Уезжаю 15-25 июня"
- User 2: "Отпуск 1-10 июля"
- User 3: "С 20 августа на неделю"

Verify: All appear in calendar with different colors

**Step 2: Test edge cases**

Send:
- "Привет всем!" → Should be ignored
- "Отпуск в прошлом году" → Should parse or be ignored
- "Уезжаю завтра на 3 дня" → Should parse correctly

**Step 3: Test mobile view**

Open on mobile phone:
- Calendar should be responsive
- Switch to list view
- Verify readability

**Step 4: Test auto-replace**

Same user sends two vacation messages:
1. "Уезжаю 1-10 сентября"
2. "Изменяю: 5-15 сентября"

Verify: Only second date exists

**Step 5: Check Supabase**

Go to Supabase dashboard:
- Table Editor → vacations
- Verify data integrity
- Check indexes are working

**Step 6: Final commit**

Run:
```bash
git add .
git commit -m "test: complete post-deployment verification"
git push
```

---

## Summary

This implementation plan creates a complete vacation calendar system with:

✅ Next.js 15 app with TypeScript
✅ DeepSeek AI for natural language parsing
✅ Supabase for data storage
✅ React Big Calendar for visualization
✅ Pachca webhook integration
✅ Auto-replace functionality
✅ Calendar and list views
✅ Responsive design

**Estimated time:** 3-4 hours for full implementation
**Hosting cost:** Free (Vercel + Supabase free tiers)
**AI cost:** ~$0.10-0.50 per month depending on usage
