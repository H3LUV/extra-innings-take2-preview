export const maxDuration = 10;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

export default {
  fetch(request) {
    if (request.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: {
          Allow: 'GET',
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store, max-age=0'
        }
      });
    }

    const aiEnabled = Boolean(process.env.GEMINI_API_KEY);
    const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

    return json({
      aiEnabled,
      mode: aiEnabled ? 'ai' : 'disabled',
      model: aiEnabled ? model : null,
      runtime: 'vercel-web-handler'
    });
  }
};
