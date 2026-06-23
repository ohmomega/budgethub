// Express application for BudgetHub.
//
// This module no longer launches a database server, opens a browser, or scans
// drives. It simply builds the Express app and exposes startServer(), which the
// Electron main process calls. The SQLite database is opened lazily by db.js
// using the BUDGETHUB_DB_PATH environment variable.

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Sensible defaults so the JWT routes work even if nothing set these.
process.env.JWT_SECRET =
  process.env.JWT_SECRET || 'budgethub_jwt_secret_key_2026_xyz';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'budgethub_jwt_refresh_secret_key_2026_xyz';

function createApp({ distDir }) {
  const app = express();

  app.use(
    cors({
      origin: '*',
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );
  app.use(express.json());

  // API routes (must come before static/fallback handlers)
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api', require('./routes/master'));
  app.use('/api', require('./routes/expenses'));
  app.use('/api/export', require('./routes/export'));

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', time: new Date() });
  });

  // Serve the built React frontend.
  if (distDir && fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'API endpoint not found' });
      }
      const indexPath = path.join(distDir, 'index.html');
      if (fs.existsSync(indexPath)) return res.sendFile(indexPath);
      res.status(404).send('Application files not found.');
    });
  }

  // Error handler
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong on the server!' });
  });

  return app;
}

// Starts the HTTP server bound to localhost only. Resolves with the chosen
// port (pass port 0 to let the OS pick a free one).
function startServer({ distDir, port = 0 } = {}) {
  return new Promise((resolve, reject) => {
    const app = createApp({ distDir });
    const server = app.listen(port, '127.0.0.1', () => {
      const actualPort = server.address().port;
      console.log(`BudgetHub server listening on http://127.0.0.1:${actualPort}`);
      resolve({ server, port: actualPort, app });
    });
    server.on('error', reject);
  });
}

module.exports = { createApp, startServer };

// Allow `node backend/app.js` to run a standalone server for development.
if (require.main === module) {
  const distDir = path.join(__dirname, '..', 'frontend', 'dist');
  startServer({ distDir, port: process.env.PORT ? Number(process.env.PORT) : 5000 }).catch(
    (err) => {
      console.error('Failed to start server:', err);
      process.exit(1);
    }
  );
}
