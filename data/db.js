const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname);
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'leads.db');
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ SQLite connection error:', err.message);
  } else {
    console.log(`🗄️ Connected to Real SQLite Database: ${DB_PATH}`);
  }
});

// Initialize Schema
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
  `);

  // Seed initial records if empty
  db.get(`SELECT COUNT(*) as count FROM leads`, (err, row) => {
    if (!err && row && row.count === 0) {
      console.log('🌱 Seeding initial Virginia lead records into SQLite...');
      const seedFile = path.join(__dirname, 'initial-leads.json');
      if (fs.existsSync(seedFile)) {
        try {
          const seeds = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
          const stmt = db.prepare(`
            INSERT INTO leads (id, name, phone, email, address, service, page, urgency, tree_diameter, estimated_cost, status, crew, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          seeds.forEach((s) => {
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
          console.log(`✅ Seeded ${seeds.length} lead records into SQLite database.`);
        } catch (e) {
          console.error('Error seeding leads:', e);
        }
      }
    }
  });
});

// Database Operations Wrapped in Promises
function getAllLeads(filter = {}) {
  return new Promise((resolve, reject) => {
    let query = `SELECT * FROM leads ORDER BY datetime(created_at) DESC`;
    const params = [];

    db.all(query, params, (err, rows) => {
      if (err) return reject(err);
      
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
        results = results.filter(l => l.status.toLowerCase() === filter.status.toLowerCase());
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
  return new Promise((resolve, reject) => {
    db.get(`SELECT COUNT(*) as count FROM leads`, (err, row) => {
      if (err) return reject(err);
      resolve(row ? row.count : 0);
    });
  });
}

function insertLead(lead) {
  return new Promise((resolve, reject) => {
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
        if (err) return reject(err);
        resolve(lead);
      }
    );
    stmt.finalize();
  });
}

function updateLead(id, updates) {
  return new Promise((resolve, reject) => {
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

    if (fields.length === 0) return resolve(null);

    values.push(id);
    const query = `UPDATE leads SET ${fields.join(', ')} WHERE id = ?`;

    db.run(query, values, function (err) {
      if (err) return reject(err);
      db.get(`SELECT * FROM leads WHERE id = ?`, [id], (err2, row) => {
        if (err2 || !row) return resolve(null);
        resolve({
          id: row.id,
          name: row.name,
          phone: row.phone,
          email: row.email,
          address: row.address,
          service: row.service,
          page: row.page,
          urgency: row.urgency,
          treeDiameter: row.tree_diameter,
          estimatedCost: row.estimated_cost,
          status: row.status,
          crew: row.crew,
          notes: row.notes,
          date: row.created_at
        });
      });
    });
  });
}

function deleteLead(id) {
  return new Promise((resolve, reject) => {
    db.run(`DELETE FROM leads WHERE id = ?`, [id], function (err) {
      if (err) return reject(err);
      resolve(this.changes > 0);
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
