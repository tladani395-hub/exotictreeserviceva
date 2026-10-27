const fs = require('fs');
const path = require('path');

const SEED_FILE = path.join(__dirname, '..', 'data', 'initial-leads.json');

// In-memory fallback cache for serverless environments
let memoryLeads = null;

function getLeads() {
  if (memoryLeads) return memoryLeads;
  try {
    if (fs.existsSync(SEED_FILE)) {
      memoryLeads = JSON.parse(fs.readFileSync(SEED_FILE, 'utf8'));
      return memoryLeads;
    }
  } catch (e) {
    console.error(e);
  }
  memoryLeads = [];
  return memoryLeads;
}

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const leads = getLeads();

  if (req.method === 'GET') {
    return res.status(200).json({ success: true, total: leads.length, leads });
  }

  if (req.method === 'POST') {
    const { name, phone, email, address, service, urgency, notes } = req.body || {};
    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Name and phone required' });
    }

    const newLead = {
      id: `LEAD-${100 + leads.length + 1}`,
      name,
      phone,
      email: email || 'N/A',
      address: address || 'Virginia',
      service: service || 'Tree Removal',
      urgency: urgency || 'Standard',
      treeDiameter: '18 inches',
      estimatedCost: '$650 - $1,250',
      status: urgency && urgency.includes('Immediate') ? 'Urgent Alert' : 'New',
      crew: 'Unassigned',
      notes: notes || '',
      date: new Date().toISOString()
    };

    leads.unshift(newLead);
    return res.status(201).json({ success: true, leadId: newLead.id, estimatedCost: newLead.estimatedCost, lead: newLead });
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
};
