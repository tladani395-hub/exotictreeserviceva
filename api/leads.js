const { loadLeads, saveLeads } = require('./_db');

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

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const leads = loadLeads();

  if (req.method === 'GET') {
    const { status, urgency, page } = req.query || {};
    let filtered = [...leads];

    if (status) {
      filtered = filtered.filter(l => l.status && l.status.toLowerCase() === status.toLowerCase());
    }
    if (urgency) {
      filtered = filtered.filter(l => l.urgency && l.urgency.toLowerCase().includes(urgency.toLowerCase()));
    }
    if (page) {
      filtered = filtered.filter(l => l.page && l.page.toLowerCase().includes(page.toLowerCase()));
    }

    return res.status(200).json({
      success: true,
      total: filtered.length,
      leads: filtered
    });
  }

  if (req.method === 'POST') {
    const { name, phone, email, address, service, page, urgency, treeDiameter, proximity, notes } = req.body || {};
    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Name and phone required' });
    }

    const estimatedCost = calculateEstimate(service, treeDiameter, proximity, urgency);
    const newLead = {
      id: `LEAD-${100 + leads.length + 1}`,
      name: name.trim(),
      phone: phone.trim(),
      email: email ? email.trim() : 'N/A',
      address: address ? address.trim() : 'Virginia Service Area',
      service: service || 'General Tree Care',
      page: page || 'Website Submission',
      urgency: urgency || 'Standard (Within 2-3 Days)',
      treeDiameter: treeDiameter ? `${treeDiameter} inches` : 'Not Specified',
      estimatedCost,
      status: (urgency && (urgency.toLowerCase().includes('immediate') || urgency.toLowerCase().includes('emergency')))
        ? 'Urgent Alert'
        : 'New',
      crew: 'Unassigned',
      notes: notes ? notes.trim() : '',
      date: new Date().toISOString()
    };

    leads.unshift(newLead);
    saveLeads(leads);

    return res.status(201).json({
      success: true,
      leadId: newLead.id,
      estimatedCost: newLead.estimatedCost,
      lead: newLead
    });
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
};
