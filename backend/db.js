// SQLite data layer with a PostgreSQL-compatible query() API.
//
// The original app was written against node-postgres (`pg`). Instead of
// rewriting every route, this shim accepts the same Postgres-flavoured SQL and
// translates it on the fly to what better-sqlite3 understands, and returns the
// same `{ rows, rowCount }` shape that `pg` returned.
//
// Translations performed:
//   $1, $2 ...            -> ?  (positional, repeats handled correctly)
//   now()                 -> CURRENT_TIMESTAMP
//   ::uuid / ::int casts  -> removed
//   true / false params   -> 1 / 0   (better-sqlite3 rejects JS booleans)
//   RETURNING             -> rows are read back via .all()
// On read, known boolean and JSON columns are revived to JS types so the
// frontend sees the same data it saw under PostgreSQL.

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const dbPath =
  process.env.BUDGETHUB_DB_PATH || path.join(__dirname, '..', 'budgethub.db');

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Columns that were BOOLEAN in Postgres (stored as 0/1 in SQLite).
const BOOL_COLUMNS = new Set(['is_active', 'is_deleted', 'is_budget_cut']);
// Columns that were JSONB in Postgres (stored as TEXT in SQLite).
const JSON_COLUMNS = new Set(['old_value', 'new_value']);

function translateSql(text) {
  let sql = text;
  // Drop Postgres type casts such as $2::uuid, ::text, ::int, ::numeric
  sql = sql.replace(/::[a-zA-Z_][a-zA-Z0-9_]*/g, '');
  // now() -> CURRENT_TIMESTAMP
  sql = sql.replace(/\bnow\s*\(\s*\)/gi, 'CURRENT_TIMESTAMP');
  return sql;
}

function normalizeParam(v) {
  if (v === true) return 1;
  if (v === false) return 0;
  if (v === undefined) return null;
  return v;
}

// Replace $N placeholders with ? and build the ordered values array.
// A placeholder may repeat (e.g. "$2 IS NULL OR x = $2"); each occurrence
// pushes its own value so positional binding stays correct.
function buildPositional(sql, params) {
  const values = [];
  const text = sql.replace(/\$(\d+)/g, (_m, n) => {
    values.push(normalizeParam(params[parseInt(n, 10) - 1]));
    return '?';
  });
  return { text, values };
}

function reviveRow(row) {
  if (!row || typeof row !== 'object') return row;
  for (const key of Object.keys(row)) {
    const val = row[key];
    if (val === null) continue;
    if (BOOL_COLUMNS.has(key) && typeof val === 'number') {
      row[key] = val === 1;
    } else if (JSON_COLUMNS.has(key) && typeof val === 'string') {
      try {
        row[key] = JSON.parse(val);
      } catch (_e) {
        /* leave as-is if not valid JSON */
      }
    }
  }
  return row;
}

// Drop-in replacement for pg's pool.query(). Returns a Promise so existing
// `await db.query(...)` call sites keep working unchanged.
function query(text, params = []) {
  try {
    const translated = translateSql(text);
    const { text: finalSql, values } = buildPositional(translated, params);

    const isSelect = /^\s*select/i.test(finalSql);
    const hasReturning = /\breturning\b/i.test(finalSql);

    const stmt = db.prepare(finalSql);

    if (isSelect || hasReturning) {
      const rows = stmt.all(...values).map(reviveRow);
      return Promise.resolve({ rows, rowCount: rows.length });
    }

    const info = stmt.run(...values);
    return Promise.resolve({
      rows: [],
      rowCount: info.changes,
      lastInsertRowid: info.lastInsertRowid,
    });
  } catch (err) {
    return Promise.reject(err);
  }
}

module.exports = {
  query,
  // Expose the raw better-sqlite3 handle for seeding / maintenance.
  raw: db,
  pool: { query }, // compatibility with any code expecting pool.query
};
