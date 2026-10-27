const fs = require('fs');
const path = require('path');

const SEED_FILE = path.join(__dirname, '..', 'data', 'initial-leads.json');
const TMP_FILE = path.join('/tmp', 'leads.json');

let leadsCache = null;

function loadLeads() {
  if (leadsCache) return leadsCache;

  // Try loading from /tmp first (writable in Vercel serverless)
  try {
    if (fs.existsSync(TMP_FILE)) {
      leadsCache = JSON.parse(fs.readFileSync(TMP_FILE, 'utf8'));
      return leadsCache;
    }
  } catch (e) {
    console.error('Error reading /tmp/leads.json:', e);
  }

  // Fallback to initial seeds in repository
  try {
    if (fs.existsSync(SEED_FILE)) {
      leadsCache = JSON.parse(fs.readFileSync(SEED_FILE, 'utf8'));
      // try writing to /tmp
      try {
        fs.writeFileSync(TMP_FILE, JSON.stringify(leadsCache, null, 2));
      } catch (err) {}
      return leadsCache;
    }
  } catch (e) {
    console.error('Error reading SEED_FILE:', e);
  }

  leadsCache = [];
  return leadsCache;
}

function saveLeads(leads) {
  leadsCache = leads;
  try {
    fs.writeFileSync(TMP_FILE, JSON.stringify(leads, null, 2));
  } catch (err) {
    // Non-fatal if /tmp write fails in some environments
  }
}

module.exports = {
  loadLeads,
  saveLeads
};
