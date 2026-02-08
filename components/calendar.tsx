'use client'

import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay, addDays } from 'date-fns'
import { ru } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import type { Vacation } from '@/lib/db'

const locales = { 'ru-RU': ru }

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
}) as any

// Override default culture
const culture = 'ru-RU'

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
    // Add 1 day to end date to include the last day in the calendar
    end: addDays(new Date(v.end_date), 1),
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
        culture={culture}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '100%' }}
        views={[Views.MONTH]}
        defaultView={Views.MONTH}
        eventPropGetter={eventStyleGetter}
        messages={{
          next: "Далее",
          previous: "Назад",
          today: "Сегодня",
          month: "Месяц",
          week: "Неделя",
          day: "День",
        }}
      />
    </div>
  )
}
