-- SQLite schema for BudgetHub (migrated from PostgreSQL).
-- UUID primary keys are emulated with a TEXT column whose DEFAULT generates a
-- RFC-4122 v4 UUID using SQLite's randomblob()/hex() functions, so the route
-- code (which never supplies an id and relies on RETURNING *) keeps working.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY DEFAULT (
    lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' ||
    substr(hex(randomblob(2)), 2) || '-' ||
    substr('89ab', 1 + (abs(random()) % 4), 1) ||
    substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6)))
  ),
  dept_code TEXT UNIQUE NOT NULL,
  dept_name TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT (
    lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' ||
    substr(hex(randomblob(2)), 2) || '-' ||
    substr('89ab', 1 + (abs(random()) % 4), 1) ||
    substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6)))
  ),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
  department_id TEXT REFERENCES departments(id),
  is_active INTEGER DEFAULT 1,
  last_login_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cost_centers (
  id TEXT PRIMARY KEY DEFAULT (
    lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' ||
    substr(hex(randomblob(2)), 2) || '-' ||
    substr('89ab', 1 + (abs(random()) % 4), 1) ||
    substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6)))
  ),
  cc_code TEXT UNIQUE NOT NULL,
  cc_name TEXT,
  department_id TEXT REFERENCES departments(id),
  is_active INTEGER DEFAULT 1,
  is_deleted INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS budget_periods (
  id TEXT PRIMARY KEY DEFAULT (
    lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' ||
    substr(hex(randomblob(2)), 2) || '-' ||
    substr('89ab', 1 + (abs(random()) % 4), 1) ||
    substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6)))
  ),
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_by TEXT REFERENCES users(id),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(month, year)
);

CREATE TABLE IF NOT EXISTS expense_entries (
  id TEXT PRIMARY KEY DEFAULT (
    lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' ||
    substr(hex(randomblob(2)), 2) || '-' ||
    substr('89ab', 1 + (abs(random()) % 4), 1) ||
    substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6)))
  ),
  period_id TEXT NOT NULL REFERENCES budget_periods(id),
  department_id TEXT NOT NULL REFERENCES departments(id),
  cost_center_id TEXT REFERENCES cost_centers(id),
  account_code TEXT,
  item_name TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  tax_amount NUMERIC NOT NULL,
  total_amount NUMERIC NOT NULL,
  reason_note TEXT,
  sort_order REAL NOT NULL,
  is_deleted INTEGER DEFAULT 0,
  is_budget_cut INTEGER DEFAULT 0,
  entry_type TEXT DEFAULT 'รายจ่าย',
  created_by TEXT REFERENCES users(id),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS export_logs (
  id TEXT PRIMARY KEY DEFAULT (
    lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' ||
    substr(hex(randomblob(2)), 2) || '-' ||
    substr('89ab', 1 + (abs(random()) % 4), 1) ||
    substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6)))
  ),
  period_id TEXT REFERENCES budget_periods(id),
  file_type TEXT CHECK (file_type IN ('pdf', 'xlsx')),
  exported_by TEXT REFERENCES users(id),
  exported_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY DEFAULT (
    lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' ||
    substr(hex(randomblob(2)), 2) || '-' ||
    substr('89ab', 1 + (abs(random()) % 4), 1) ||
    substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6)))
  ),
  entry_id TEXT REFERENCES expense_entries(id),
  user_id TEXT REFERENCES users(id),
  action_type TEXT CHECK (action_type IN ('create', 'update', 'delete')),
  old_value TEXT,
  new_value TEXT,
  action_at TEXT DEFAULT CURRENT_TIMESTAMP
);
