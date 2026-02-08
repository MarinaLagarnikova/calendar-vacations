/**
 * Ручное добавление отпусков в базу данных
 *
 * Простейший способ добавить отпуска без интеграции с Пачкой
 * Используется для быстрого внесения данных администратором
 */

import { createClient } from '@supabase/supabase-js'
import readline from 'readline'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface VacationInput {
  employee_name: string
  employee_id: string
  start_date: string
  end_date: string
  message_text?: string
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve)
  })
}

function formatDate(dateStr: string): string {
  // Проверяем формат YYYY-MM-DD
  const regex = /^\d{4}-\d{2}-\d{2}$/
  if (!regex.test(dateStr)) {
    throw new Error('Неверный формат даты. Используйте ГГГГ-ММ-ДД (например: 2026-07-15)')
  }
  return dateStr
}

async function addVacation() {
  console.log('\n➕ Добавление отпуска в календарь\n')

  try {
    const employee_name = await question('Имя сотрудника: ')
    const employee_id = await question('ID сотрудника (можно оставить пустым для автогенерации): ')
    const start_date = await question('Дата начала (ГГГГ-ММ-ДД): ')
    const end_date = await question('Дата окончания (ГГГГ-ММ-ДД): ')
    const message_text = await question('Комментарий (опционально): ')

    // Валидация дат
    const formattedStartDate = formatDate(start_date)
    const formattedEndDate = formatDate(end_date)

    const vacation: VacationInput = {
      employee_name: employee_name.trim(),
      employee_id: employee_id.trim() || `manual_${Date.now()}`,
      start_date: formattedStartDate,
      end_date: formattedEndDate,
      message_text: message_text.trim() || undefined
    }

    // Проверяем, существует ли похожий отпуск
    const { data: existing } = await supabase
      .from('vacations')
      .select('*')
      .eq('employee_id', vacation.employee_id)
      .eq('start_date', vacation.start_date)
      .single()

    if (existing) {
      console.log('\n⚠️  Внимание: Найден существующий отпуск для этого сотрудника с той же датой начала!')

      const overwrite = await question('Перезаписать? (y/N): ')
      if (overwrite.toLowerCase() !== 'y') {
        console.log('❌ Отменено')
        rl.close()
        return
      }

      // Удаляем старую запись
      await supabase
        .from('vacations')
        .delete()
        .eq('id', existing.id)
    }

    // Сохраняем отпуск
    const { error } = await supabase
      .from('vacations')
      .insert(vacation)

    if (error) {
      console.error('\n❌ Ошибка при сохранении:', error.message)
    } else {
      console.log('\n✅ Отпуск успешно добавлен!')
      console.log(`   👤 ${vacation.employee_name}`)
      console.log(`   📅 ${vacation.start_date} - ${vacation.end_date}`)
    }

  } catch (error: any) {
    console.error('\n❌ Ошибка:', error.message)
  } finally {
    rl.close()
  }
}

async function addMultipleVacations() {
  console.log('\n📋 Массовое добавление отпусков')
  console.log('Формат: Имя | ID | Дата начала | Дата окончания | Комментарий\n')
  console.log('Пример:')
  console.log('Иван Иванов | user001 | 2026-07-01 | 2026-07-15 | Отпуск в июле')
  console.log('Мария Петрова | user002 | 2026-08-01 | 2026-08-31 |')
  console.log('\nВведите данные (пустая строка для завершения):\n')

  const lines: string[] = []

  rl.on('line', (line) => {
    if (line.trim() === '') {
      rl.close()
      return
    }
    lines.push(line)
  })

  rl.on('close', async () => {
    let added = 0
    let failed = 0

    for (const line of lines) {
      const parts = line.split('|').map(p => p.trim())

      if (parts.length < 4) {
        console.log(`⏭️  Пропущено (неверный формат): ${line}`)
        failed++
        continue
      }

      const [employee_name, employee_id, start_date, end_date, message_text] = parts

      try {
        const vacation: VacationInput = {
          employee_name,
          employee_id: employee_id || `manual_${Date.now()}_${added}`,
          start_date: formatDate(start_date),
          end_date: formatDate(end_date),
          message_text: message_text || undefined
        }

        const { error } = await supabase
          .from('vacations')
          .insert(vacation)

        if (error) {
          console.error(`❌ Ошибка: ${error.message} - ${employee_name}`)
          failed++
        } else {
          console.log(`✅ ${employee_name} (${start_date} - ${end_date})`)
          added++
        }
      } catch (error: any) {
        console.error(`❌ Ошибка: ${error.message} - ${line}`)
        failed++
      }
    }

    console.log(`\n🎉 Готово!`)
    console.log(`✅ Добавлено: ${added}`)
    console.log(`❌ Ошибок: ${failed}`)
  })
}

async function main() {
  const mode = process.argv[2]

  if (mode === 'batch') {
    await addMultipleVacations()
  } else {
    console.log('\nРежим:')
    console.log('1. Одиночный отпуск')
    console.log('2. Массовое добавление')

    const choice = await question('\nВыберите режим (1/2): ')

    if (choice === '2') {
      rl.close()
      await addMultipleVacations()
    } else {
      await addVacation()
    }
  }
}

main()
