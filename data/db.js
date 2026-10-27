let sqlite3 = null;
try {
  sqlite3 = require('sqlite3').verbose();
} catch (e) {
  // SQLite native module not available in this environment (e.g. serverless)
}

const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname);
const DB_PATH = path.join(DB_DIR, 'leads.db');
let db = null;
let isSqliteAvailable = false;

// In-memory fallback if SQLite fails or filesystem is read-only
let memoryLeads = [];
try {
  const seedFile = path.join(__dirname, 'initial-leads.json');
  if (fs.existsSync(seedFile)) {
    memoryLeads = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
  }
} catch (e) {}

if (sqlite3) {
  try {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.warn('⚠️ SQLite could not be opened, using memory fallback:', err.message);
        isSqliteAvailable = false;
      } else {
        isSqliteAvailable = true;
        console.log(`🗄️ Connected to Real SQLite Database: ${DB_PATH}`);
      }
    });

    if (db) {
      db.serialize(() => {
        db.run(`
          CREATE TABLE IF NOT EXISTS leads (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            phone TEXT NOT NULL,
            email TEXT,
            address TEXT,
            service TEXT,
            page TEXT,
            urgency TEXT,
            tree_diameter TEXT,
            estimated_cost TEXT,
            status TEXT DEFAULT 'New',
            crew TEXT DEFAULT 'Unassigned',
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) {
            isSqliteAvailable = false;
          }
        });

        db.get(`SELECT COUNT(*) as count FROM leads`, (err, row) => {
          if (!err && row && row.count === 0 && memoryLeads.length > 0) {
            console.log('🌱 Seeding initial Virginia lead records into SQLite...');
            const stmt = db.prepare(`
              INSERT INTO leads (id, name, phone, email, address, service, page, urgency, tree_diameter, estimated_cost, status, crew, notes, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            memoryLeads.forEach((s) => {
              stmt.run([
                s.id,
                s.name,
                s.phone,
                s.email,
                s.address,
                s.service,
                s.page,
                s.urgency,
                s.treeDiameter,
                s.estimatedCost,
                s.status,
                s.crew,
                s.notes,
                s.date || new Date().toISOString()
              ]);
            });
            stmt.finalize();
          }
        });
      });
    }
  } catch (err) {
    console.warn('SQLite init error:', err.message);
    isSqliteAvailable = false;
  }
}

// Database Operations Wrapped in Promises
function getAllLeads(filter = {}) {
  if (!isSqliteAvailable || !db) {
    let results = [...memoryLeads];
    if (filter.status) results = results.filter(l => l.status && l.status.toLowerCase() === filter.status.toLowerCase());
    if (filter.urgency) results = results.filter(l => l.urgency && l.urgency.toLowerCase().includes(filter.urgency.toLowerCase()));
    if (filter.page) results = results.filter(l => l.page && l.page.toLowerCase().includes(filter.page.toLowerCase()));
    return Promise.resolve(results);
  }

  return new Promise((resolve, reject) => {
    let query = `SELECT * FROM leads ORDER BY datetime(created_at) DESC`;
    db.all(query, [], (err, rows) => {
      if (err) return resolve(memoryLeads);
      
      let results = rows.map(r => ({
        id: r.id,
        name: r.name,
        phone: r.phone,
        email: r.email,
        address: r.address,
        service: r.service,
        page: r.page,
        urgency: r.urgency,
        treeDiameter: r.tree_diameter,
        estimatedCost: r.estimated_cost,
        status: r.status,
        crew: r.crew,
        notes: r.notes,
        date: r.created_at
      }));

      if (filter.status) {
        results = results.filter(l => l.status && l.status.toLowerCase() === filter.status.toLowerCase());
      }
      if (filter.urgency) {
        results = results.filter(l => l.urgency && l.urgency.toLowerCase().includes(filter.urgency.toLowerCase()));
      }
      if (filter.page) {
        results = results.filter(l => l.page && l.page.toLowerCase().includes(filter.page.toLowerCase()));
      }

      resolve(results);
    });
  });
}

function getLeadCount() {
  if (!isSqliteAvailable || !db) {
    return Promise.resolve(memoryLeads.length);
  }
  return new Promise((resolve) => {
    db.get(`SELECT COUNT(*) as count FROM leads`, (err, row) => {
      if (err || !row) return resolve(memoryLeads.length);
      resolve(row.count);
    });
  });
}

function insertLead(lead) {
  memoryLeads.unshift(lead);
  if (!isSqliteAvailable || !db) {
    return Promise.resolve(lead);
  }

  return new Promise((resolve) => {
    const stmt = db.prepare(`
      INSERT INTO leads (id, name, phone, email, address, service, page, urgency, tree_diameter, estimated_cost, status, crew, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      [
        lead.id,
        lead.name,
        lead.phone,
        lead.email,
        lead.address,
        lead.service,
        lead.page,
        lead.urgency,
        lead.treeDiameter,
        lead.estimatedCost,
        lead.status,
        lead.crew,
        lead.notes,
        lead.date
      ],
      function (err) {
        if (err) console.error('Insert error:', err);
        resolve(lead);
      }
    );
    stmt.finalize();
  });
}

function updateLead(id, updates) {
  const index = memoryLeads.findIndex(l => l.id === id);
  if (index !== -1) {
    if (updates.status !== undefined) memoryLeads[index].status = updates.status;
    if (updates.crew !== undefined) memoryLeads[index].crew = updates.crew;
    if (updates.notes !== undefined) memoryLeads[index].notes = updates.notes;
  }

  if (!isSqliteAvailable || !db) {
    return Promise.resolve(index !== -1 ? memoryLeads[index] : null);
  }

  return new Promise((resolve) => {
    const fields = [];
    const values = [];

    if (updates.status !== undefined) {
      fields.push(`status = ?`);
      values.push(updates.status);
    }
    if (updates.crew !== undefined) {
      fields.push(`crew = ?`);
      values.push(updates.crew);
    }
    if (updates.notes !== undefined) {
      fields.push(`notes = ?`);
      values.push(updates.notes);
    }

    if (fields.length === 0) return resolve(index !== -1 ? memoryLeads[index] : null);

    values.push(id);
    const query = `UPDATE leads SET ${fields.join(', ')} WHERE id = ?`;

    db.run(query, values, function () {
      resolve(index !== -1 ? memoryLeads[index] : null);
    });
  });
}

function deleteLead(id) {
  const idx = memoryLeads.findIndex(l => l.id === id);
  if (idx !== -1) memoryLeads.splice(idx, 1);

  if (!isSqliteAvailable || !db) {
    return Promise.resolve(idx !== -1);
  }

  return new Promise((resolve) => {
    db.run(`DELETE FROM leads WHERE id = ?`, [id], function () {
      resolve(true);
    });
  });
}

module.exports = {
  db,
  getAllLeads,
  getLeadCount,
  insertLead,
  updateLead,
  deleteLead
};
