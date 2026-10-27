const { loadLeads } = require('./_db');

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const leads = loadLeads();
  const total = leads.length;
  const urgentCount = leads.filter(l =>
    (l.urgency && l.urgency.toLowerCase().includes('immediate')) ||
    (l.urgency && l.urgency.toLowerCase().includes('emergency')) ||
    l.status === 'Urgent Alert' ||
    (l.service && l.service.toLowerCase().includes('emergency'))
  ).length;

  const scheduledCount = leads.filter(l => l.status === 'Scheduled' || l.status === 'Dispatched').length;
  const completedCount = leads.filter(l => l.status === 'Completed').length;

  res.status(200).json({
    success: true,
    stats: {
      totalLeads: total,
      urgentEmergencies: urgentCount,
      activeJobs: scheduledCount,
      completedJobs: completedCount,
      serviceAreas: ['Fairfax County', 'Loudoun County', 'Richmond Metro', 'Prince William', 'Virginia Beach'],
      hotline: '(703) 991-TREE (8733)'
    }
  });
};
