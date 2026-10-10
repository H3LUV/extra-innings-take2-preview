export default {
  async fetch(request, env, ctx) {
    return new Response("Today NBA is offline.", {
      status: 410,
      statusText: "Gone",
      headers: {
        "content-type": "text/plain; charset=UTF-8",
        "cache-control": "no-store, max-age=0"
      }
    });
  }
};
