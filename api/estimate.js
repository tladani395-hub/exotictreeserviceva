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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS' || req.method === 'HEAD') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    const { service, diameter, proximity, urgency } = req.body || {};
    const estimate = calculateEstimate(service, diameter, proximity, urgency);
    return res.status(200).json({ success: true, estimate });
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
};
