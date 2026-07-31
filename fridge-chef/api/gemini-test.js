export default {
  async fetch(request) {
    if (request.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

    if (!apiKey) {
      return Response.json({ ok: false, stage: 'environment', error: 'GEMINI_API_KEY missing' }, { status: 503 });
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Reply with exactly the word OK.' }] }]
        })
      });

      const data = await response.json().catch(() => ({}));
      return Response.json({
        ok: response.ok,
        model,
        googleStatus: response.status,
        googleError: data?.error?.message || null,
        text: data?.candidates?.[0]?.content?.parts?.[0]?.text || null
      }, { status: response.ok ? 200 : 502 });
    } catch (error) {
      return Response.json({ ok: false, model, error: error?.message || 'unknown error' }, { status: 502 });
    }
  }
};
