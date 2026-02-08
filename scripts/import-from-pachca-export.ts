/**
 * Импорт отпусков из экспорта Пачки
 *
 * Этот скрипт парсит JSON-архив, экспортированный из Пачки,
 * и распознаёт даты отпусков с помощью DeepSeek AI
 *
 * Инструкция по экспорту из Пачки:
 * 1. Настройки пространства → Экспорт сообщений (только тариф "Корпорация")
 * 2. Указать период (макс. 45 дней)
 * 3. Указать ID чата с отпусками
 * 4. Дождаться письма на почте с ссылкой на архив
 * 5. Распаковать архив и указать путь к папке с чатом
 */

import { createClient } from '@supabase/supabase-js'
import { OpenAI } from 'openai'
import fs from 'fs'
import path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const deepSeekKey = process.env.DEEPSEEK_API_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)
const openai = new OpenAI({
  apiKey: deepSeekKey,
  baseURL: 'https://api.deepseek.com'
})

interface PachcaMessage {
  id: number
  created_at: string
  content: string
  user: {
    id: number
    name: string
    last_name: string
    email: string
  }
  chat: {
    id: number
    name: string
  }
}

interface ParsedVacation {
  employee_name: string
  start_date: string
  end_date: string
}

/**
 * Распознаёт даты отпуска из текста с помощью DeepSeek AI
 */
async function parseVacationDate(text: string, authorName: string): Promise<ParsedVacation | null> {
  try {
    const response = await openai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: `Ты - парсер дат отпусков. Извлеки дату начала и окончания отпуска из текста.

ВАЖНО:
- Отвечай ТОЛЬКО в формате JSON без дополнительного текста
- Если даты не указаны или неясны, верни {"vacation": null}
- Если указан только один день, сделай start_date и end_date одинаковыми
- Формат дат: YYYY-MM-DD
- Все даты - за 2026 год, если год не указан
- employee_name - это имя сотрудника

Пример ответа:
{
  "employee_name": "Иван Иванов",
  "start_date": "2026-07-15",
  "end_date": "2026-07-25"
}`
        },
        {
          role: 'user',
          content: `Сообщение от ${authorName}: ${text}`
        }
      ],
      temperature: 0,
      response_format: { type: "json_object" }
    })

    const result = JSON.parse(response.choices[0].message.content || '{}')

    if (result.vacation === null || !result.start_date || !result.end_date) {
      return null
    }

    return {
      employee_name: result.employee_name || authorName,
      start_date: result.start_date,
      end_date: result.end_date
    }
  } catch (error) {
    console.error('Ошибка при парсинге даты:', error)
    return null
  }
}

/**
 * Читает все JSON файлы из папки чата
 */
function readChatMessages(chatFolderPath: string): PachcaMessage[] {
  const messages: PachcaMessage[] = []

  if (!fs.existsSync(chatFolderPath)) {
    console.error(`Папка не найдена: ${chatFolderPath}`)
    return []
  }

  const files = fs.readdirSync(chatFolderPath)
  const jsonFiles = files.filter(f => f.endsWith('.json'))

  console.log(`Найдено ${jsonFiles.length} файлов с сообщениями`)

  for (const file of jsonFiles) {
    const filePath = path.join(chatFolderPath, file)
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      const fileMessages = JSON.parse(content) as PachcaMessage[]
      messages.push(...fileMessages)
    } catch (error) {
      console.error(`Ошибка при чтении файла ${file}:`, error)
    }
  }

  return messages
}

/**
 * Импортирует отпуска из сообщений
 */
async function importVacationsFromMessages(messages: PachcaMessage[]) {
  console.log(`\n📝 Обработка ${messages.length} сообщений...\n`)

  let imported = 0
  let skipped = 0

  for (const message of messages) {
    const authorName = `${message.user.name} ${message.user.last_name}`.trim()

    // Пропускаем сообщения без текста
    if (!message.content || message.content.trim().length === 0) {
      skipped++
      continue
    }

    // Парсим дату отпуска
    const vacation = await parseVacationDate(message.content, authorName)

    if (!vacation) {
      skipped++
      continue
    }

    // Проверяем, существует ли уже отпуск для этого сотрудника
    const { data: existing } = await supabase
      .from('vacations')
      .select('*')
      .eq('employee_id', String(message.user.id))
      .eq('start_date', vacation.start_date)
      .single()

    if (existing) {
      console.log(`⏭️  Пропущено (уже существует): ${authorName} - ${vacation.start_date}`)
      skipped++
      continue
    }

    // Сохраняем отпуск в базу
    const { error } = await supabase
      .from('vacations')
      .insert({
        employee_name: vacation.employee_name,
        employee_id: String(message.user.id),
        start_date: vacation.start_date,
        end_date: vacation.end_date,
        message_text: message.content
      })

    if (error) {
      console.error(`❌ Ошибка при сохранении: ${error.message}`)
    } else {
      console.log(`✅ Импортировано: ${authorName} (${vacation.start_date} - ${vacation.end_date})`)
      imported++
    }
  }

  console.log(`\n🎉 Импорт завершён!`)
  console.log(`✅ Импортировано: ${imported}`)
  console.log(`⏭️  Пропущено: ${skipped}`)
}

/**
 * Главная функция
 */
async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.log(`
Использование: npx tsx --env-file=.env.local scripts/import-from-pachca-export.ts <путь_к_папке_чата>

Пример: npx tsx --env-file=.env.local scripts/import-from-pachca-export.ts ./pachca-export/Отпуски_123456

Инструкция:
1. Экспортируйте сообщения из Пачки (Настройки → Экспорт)
2. Распакуйте архив
3. Найдите папку с нужным чатом (называется как "ИмяЧата_ID")
4. Укажите путь к этой папке при запуске скрипта
`)
    process.exit(1)
  }

  const chatFolderPath = args[0]

  console.log('📂 Чтение сообщений из:', chatFolderPath)

  const messages = readChatMessages(chatFolderPath)

  if (messages.length === 0) {
    console.log('❌ Сообщения не найдены')
    process.exit(1)
  }

  console.log(`✅ Прочитано ${messages.length} сообщений`)

  await importVacationsFromMessages(messages)
}

main()
