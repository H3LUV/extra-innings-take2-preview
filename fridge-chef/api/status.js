'use strict';

module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const aiEnabled = Boolean(process.env.GEMINI_API_KEY);
  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

  return res.status(200).json({
    aiEnabled,
    mode: aiEnabled ? 'ai' : 'demo',
    model: aiEnabled ? model : null
  });
};
