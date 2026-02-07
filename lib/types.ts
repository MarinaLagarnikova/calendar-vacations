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
