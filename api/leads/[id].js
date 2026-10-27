const { loadLeads, saveLeads } = require('../_db');

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS' || req.method === 'HEAD') {
    return res.status(200).end();
  }

  const { id } = req.query;
  const leads = loadLeads();
  const index = leads.findIndex(l => l.id.toLowerCase() === (id || '').toLowerCase());

  if (index === -1) {
    return res.status(404).json({ success: false, message: `Lead ${id} not found.` });
  }

  if (req.method === 'GET') {
    return res.status(200).json({ success: true, lead: leads[index] });
  }

  if (req.method === 'PATCH') {
    const { status, crew, notes } = req.body || {};
    if (status !== undefined) leads[index].status = status;
    if (crew !== undefined) leads[index].crew = crew;
    if (notes !== undefined) leads[index].notes = notes;

    saveLeads(leads);
    return res.status(200).json({
      success: true,
      message: `Lead ${id} updated successfully`,
      lead: leads[index]
    });
  }

  if (req.method === 'DELETE') {
    leads.splice(index, 1);
    saveLeads(leads);
    return res.status(200).json({
      success: true,
      message: `Lead ${id} deleted successfully`
    });
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
};
