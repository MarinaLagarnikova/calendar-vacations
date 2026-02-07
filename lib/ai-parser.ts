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
