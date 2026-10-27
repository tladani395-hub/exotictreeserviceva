module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    status: 'ok',
    environment: 'Vercel Serverless Edge/Node',
    system: 'ExoticTreeServiceva.com Production API',
    database: 'Active (Leads Store)',
    timestamp: new Date().toISOString()
  });
};
