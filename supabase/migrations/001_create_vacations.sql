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
