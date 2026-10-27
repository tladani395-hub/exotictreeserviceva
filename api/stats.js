module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    success: true,
    stats: {
      totalLeads: 14,
      urgentEmergencies: 3,
      activeJobs: 5,
      completedJobs: 42,
      hotline: '(703) 991-TREE (8733)'
    }
  });
};
