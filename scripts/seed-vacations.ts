import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Тестовые отпуска на 2026 год
const testVacations = [
  {
    employee_name: 'Иван Иванов',
    employee_id: 'user_001',
    start_date: '2026-06-01',
    end_date: '2026-06-15',
    message_text: 'Отпуск 1-15 июня'
  },
  {
    employee_name: 'Мария Петрова',
    employee_id: 'user_002',
    start_date: '2026-07-10',
    end_date: '2026-07-24',
    message_text: 'Уезжаю 10-24 июля'
  },
  {
    employee_name: 'Алексей Сидоров',
    employee_id: 'user_003',
    start_date: '2026-08-01',
    end_date: '2026-08-31',
    message_text: 'Весь август в отпуску'
  },
  {
    employee_name: 'Елена Кузнецова',
    employee_id: 'user_004',
    start_date: '2026-06-20',
    end_date: '2026-07-05',
    message_text: 'С 20 июня на 2 недели'
  },
  {
    employee_name: 'Дмитрий Волков',
    employee_id: 'user_005',
    start_date: '2026-09-01',
    end_date: '2026-09-14',
    message_text: 'Отпуск 1-14 сентября'
  },
  {
    employee_name: 'Анна Соколова',
    employee_id: 'user_006',
    start_date: '2026-07-01',
    end_date: '2026-07-15',
    message_text: 'Отпуск в июле'
  }
]

async function seedVacations() {
  console.log('🌱 Начинаем добавление тестовых отпусков...\n')

  for (const vacation of testVacations) {
    try {
      const { data, error } = await supabase
        .from('vacations')
        .insert(vacation)
        .select()

      if (error) {
        console.error(`❌ Ошибка при добавлении отпуска ${vacation.employee_name}:`, error.message)
      } else {
        console.log(`✅ Добавлен: ${vacation.employee_name} (${vacation.start_date} - ${vacation.end_date})`)
      }
    } catch (err) {
      console.error(`❌ Ошибка:`, err)
    }
  }

  console.log('\n🎉 Готово! Проверьте https://calendar-vacations.vercel.app')
}

seedVacations()
