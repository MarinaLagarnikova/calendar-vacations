import { VacationCalendar } from '@/components/calendar'
import { VacationList } from '@/components/vacation-list'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { supabase } from '@/lib/db'

async function getVacations() {
  if (!supabase) return []

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
