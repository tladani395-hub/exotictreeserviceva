const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./data/db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Estimate Calculator Helper
function calculateEstimate(service, diameter, proximity, urgency) {
  let baseMin = 350;
  let baseMax = 650;

  if (service === 'Emergency Tree Removal') {
    baseMin = 850;
    baseMax = 1600;
  } else if (service === 'Standard Tree Removal' || service === 'Hazardous Tree Removal' || service === 'Tree Removal') {
    baseMin = 500;
    baseMax = 1200;
  } else if (service === 'Crane-Assisted Removal') {
    baseMin = 1400;
    baseMax = 2800;
  } else if (service === 'Trimming & Pruning' || service === 'Tree Trimming / Pruning' || service === 'Tree Trimming & Pruning') {
    baseMin = 300;
    baseMax = 700;
  } else if (service === 'Stump Grinding' || service === 'Stump Grinding / Removal') {
    baseMin = 150;
    baseMax = 350;
  } else if (service === 'Storm Cleanup & Debris' || service === 'Yard Cleanup / Storm Debris') {
    baseMin = 450;
    baseMax = 950;
  }

  const d = parseInt(diameter) || 18;
  const sizeMultiplier = Math.max(1, d / 12);
  const proxMultiplier = proximity === 'near-structure' ? 1.4 : (proximity === 'near-powerlines' ? 1.6 : 1.0);
  const urgencyMultiplier = (urgency && urgency.toLowerCase().includes('emergency')) ? 1.35 : 1.0;

  const min = Math.round((baseMin * sizeMultiplier * proxMultiplier * urgencyMultiplier) / 50) * 50;
  const max = Math.round((baseMax * sizeMultiplier * proxMultiplier * urgencyMultiplier) / 50) * 50;

  return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
}

// ==================== REST API ENDPOINTS (REAL SQL DATABASE) ====================

// 1. Health check & DB status
app.get('/api/health', async (req, res) => {
  try {
    const count = await db.getLeadCount();
    res.json({
      status: 'ok',
      database: 'SQLite (leads.db)',
      totalRecords: count,
      system: 'ExoticTreeServiceva.com Backend API',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// 2. Calculate instant estimate
app.post('/api/estimate', (req, res) => {
  const { service, diameter, proximity, urgency } = req.body;
  const estimate = calculateEstimate(service, diameter, proximity, urgency);
  res.json({ success: true, estimate });
});

// 3. Get all leads from SQLite database
app.get('/api/leads', async (req, res) => {
  try {
    const { status, urgency, page } = req.query;
    const leads = await db.getAllLeads({ status, urgency, page });

    res.json({
      success: true,
      database: 'SQLite',
      total: leads.length,
      leads
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database read error: ' + err.message });
  }
});

// 4. Create new lead in SQLite database
app.post('/api/leads', async (req, res) => {
  const {
    name,
    phone,
    email,
    address,
    service,
    page,
    urgency,
    treeDiameter,
    proximity,
    notes
  } = req.body;

  if (!name || !phone) {
    return res.status(400).json({
      success: false,
      message: 'Name and Phone number are required to submit an estimate request.'
    });
  }

  try {
    const currentCount = await db.getLeadCount();
    const leadId = `LEAD-${100 + currentCount + 1}`;
    const estimatedCost = calculateEstimate(service, treeDiameter, proximity, urgency);

    const newLead = {
      id: leadId,
      name: name.trim(),
      phone: phone.trim(),
      email: email ? email.trim() : 'N/A',
      address: address ? address.trim() : 'Virginia Service Area',
      service: service || 'General Tree Care Consultation',
      page: page || 'Website Submission',
      urgency: urgency || 'Standard (Within 2-3 Days)',
      treeDiameter: treeDiameter ? `${treeDiameter} inches` : 'Not Specified',
      estimatedCost,
      status: (urgency && urgency.toLowerCase().includes('immediate')) || (urgency && urgency.toLowerCase().includes('emergency'))
        ? 'Urgent Alert'
        : 'New',
      crew: 'Unassigned',
      notes: notes ? notes.trim() : 'No additional notes provided.',
      date: new Date().toISOString()
    };

    await db.insertLead(newLead);

    res.status(201).json({
      success: true,
      database: 'SQLite',
      message: 'Thank you! Your quote request has been saved to the database and dispatched to our Virginia team.',
      leadId: newLead.id,
      estimatedCost: newLead.estimatedCost,
      lead: newLead
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database insert error: ' + err.message });
  }
});

// 5. Update lead status or assign crew (Company / Employee CRM)
app.patch('/api/leads/:id', async (req, res) => {
  const { id } = req.params;
  const { status, crew, notes } = req.body;

  try {
    const updated = await db.updateLead(id, { status, crew, notes });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Lead not found in database.' });
    }

    res.json({
      success: true,
      database: 'SQLite',
      message: `Lead ${id} successfully updated in database.`,
      lead: updated
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database update error: ' + err.message });
  }
});

// 6. Delete lead from SQLite database
app.delete('/api/leads/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const deleted = await db.deleteLead(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Lead not found in database.' });
    }
    res.json({ success: true, database: 'SQLite', message: `Lead ${id} removed from database.` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database delete error: ' + err.message });
  }
});

// 7. Get dashboard stats for staff portal
app.get('/api/stats', async (req, res) => {
  try {
    const leads = await db.getAllLeads();

    const total = leads.length;
    const urgentCount = leads.filter(l => 
      (l.urgency && l.urgency.toLowerCase().includes('immediate')) || 
      l.status === 'Urgent Alert' || 
      (l.service && l.service.toLowerCase().includes('emergency'))
    ).length;

    const scheduledCount = leads.filter(l => l.status === 'Scheduled' || l.status === 'Dispatched').length;
    const completedCount = leads.filter(l => l.status === 'Completed').length;

    res.json({
      success: true,
      database: 'SQLite',
      stats: {
        totalLeads: total,
        urgentEmergencies: urgentCount,
        activeJobs: scheduledCount,
        completedJobs: completedCount,
        serviceAreas: ['Fairfax County', 'Loudoun County', 'Richmond Metro', 'Prince William', 'Virginia Beach'],
        hotline: '(703) 991-TREE (8733)'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database stats error: ' + err.message });
  }
});

// ==================== CLEAN PAGE ROUTES ====================

app.get('/tree-removal', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'tree-removal.html'));
});

app.get('/tree-trimming', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'tree-trimming.html'));
});

app.get('/emergency', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'emergency.html'));
});

app.get('/portal', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'portal.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🌲 Exotic Tree Service VA Web Platform Active`);
  console.log(`🗄️ Real Database: SQLite (data/leads.db)`);
  console.log(`🌐 Live at: http://localhost:${PORT}`);
  console.log(`🪓 Service 1 (Tree Removal):   http://localhost:${PORT}/tree-removal`);
  console.log(`✂️ Service 2 (Tree Trimming):  http://localhost:${PORT}/tree-trimming`);
  console.log(`⚡ Emergency (24/7 Storm):     http://localhost:${PORT}/emergency`);
  console.log(`🌿 Flagship (Interactive Hub): http://localhost:${PORT}/index.html`);
  console.log(`📋 Staff Dispatch CRM:        http://localhost:${PORT}/portal`);
  console.log(`=======================================================`);
});
