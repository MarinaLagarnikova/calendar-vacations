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
