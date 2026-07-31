import part1 from '../lib/hero-image-chunk-1.js';
import part2 from '../lib/hero-image-chunk-2.js';
import part3 from '../lib/hero-image-chunk-3.js';
import part4 from '../lib/hero-image-chunk-4.js';

const imageBytes = Buffer.from(`${part1}${part2}${part3}${part4}`, 'base64');

export default {
  async fetch(request) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', {
        status: 405,
        headers: { Allow: 'GET, HEAD' }
      });
    }

    return new Response(request.method === 'HEAD' ? null : imageBytes, {
      headers: {
        'Content-Type': 'image/webp',
        'Content-Length': String(imageBytes.byteLength),
        'Cache-Control': 'public, max-age=86400, s-maxage=31536000, stale-while-revalidate=2592000',
        'Content-Disposition': 'inline; filename="fridge-chef-hero.webp"',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  }
};
