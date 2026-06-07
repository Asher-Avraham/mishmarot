-- Supabase SQL Schema for Mishmarot
-- Run this in Supabase Dashboard → SQL Editor

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'employee')),
  employee_id BIGINT REFERENCES employees(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Employees table
CREATE TABLE IF NOT EXISTS employees (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Schedule weeks table
CREATE TABLE IF NOT EXISTS schedule_weeks (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  week_start_date DATE NOT NULL UNIQUE,
  week_end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Employee time preferences table
CREATE TABLE IF NOT EXISTS employee_time_preferences (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  schedule_week_id BIGINT NOT NULL REFERENCES schedule_weeks(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  time_frame TEXT NOT NULL CHECK (time_frame IN ('morning', 'noon', 'night')),
  preference_status TEXT NOT NULL CHECK (preference_status IN ('can', 'prefer', 'avoid', 'cannot')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employee_id, schedule_week_id, shift_date, time_frame)
);

-- 5. Shift assignments table
CREATE TABLE IF NOT EXISTS shift_assignments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  schedule_week_id BIGINT NOT NULL REFERENCES schedule_weeks(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  time_frame TEXT NOT NULL,
  job_type TEXT NOT NULL,
  assigned_employee_id BIGINT REFERENCES employees(id) ON DELETE SET NULL,
  external_worker_name TEXT,
  override_cannot BOOLEAN NOT NULL DEFAULT false,
  assigned_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (schedule_week_id, shift_date, time_frame, job_type)
);

-- Enable Row Level Security (optional, but recommended)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_time_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_assignments ENABLE ROW LEVEL SECURITY;

-- For now, allow public access (since auth is handled by the Express API, not Supabase Auth)
CREATE POLICY "Allow all access" ON users FOR ALL USING (true);
CREATE POLICY "Allow all access" ON employees FOR ALL USING (true);
CREATE POLICY "Allow all access" ON schedule_weeks FOR ALL USING (true);
CREATE POLICY "Allow all access" ON employee_time_preferences FOR ALL USING (true);
CREATE POLICY "Allow all access" ON shift_assignments FOR ALL USING (true);
