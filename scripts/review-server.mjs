import { randomBytes } from 'node:crypto';
import { REVIEW_API, REVIEW_TOKEN_HEADER } from './review-contract.mjs';
import { ReviewError } from './review-store.mjs';

function json(response, status, data) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(data));
}

/**
 * The adapter is mounted only on the loopback review preview. Host and Origin
 * checks reject rebinding/cross-site requests; a per-process token also guards
 * reads and mutations after bootstrap. No CORS headers or remote API exist.
 */
export function reviewHandler(store, { port = 4173 } = {}) {
  const token = randomBytes(32).toString('hex');
  const hosts = new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
  return async (request, response, next) => {
    const path = (request.url ?? '').split('?')[0];
    if (!path.startsWith(REVIEW_API + '/')) return next();
    try {
      const host = request.headers.host;
      const origin = request.headers.origin;
      const site = request.headers['sec-fetch-site'];
      if (!hosts.has(host) || (origin && origin !== `http://${host}`) || (site && !['same-origin', 'none'].includes(site))) {
        throw new ReviewError('review_origin_rejected', 403);
      }
      if (path === REVIEW_API + '/session' && request.method === 'GET') {
        return json(response, 200, { token, pages: [...store.pages.values()] });
      }
      if (request.headers[REVIEW_TOKEN_HEADER] !== token) throw new ReviewError('review_token_rejected', 403);
      if (path === REVIEW_API + '/annotations' && request.method === 'GET') {
        return json(response, 200, { annotations: await store.list() });
      }
      const isCreate = path === REVIEW_API + '/annotations' && request.method === 'POST';
      const isUpdate = path.startsWith(REVIEW_API + '/annotations/') && request.method === 'PATCH';
      if (!isCreate && !isUpdate) throw new ReviewError('review_route_missing', 404);
      if (!/^application\/json(?:;|$)/i.test(request.headers['content-type'] ?? '')) {
        throw new ReviewError('review_json_required', 415);
      }
      let text = '';
      request.setEncoding('utf8');
      for await (const chunk of request) text += chunk;
      let input;
      try { input = JSON.parse(text); } catch { throw new ReviewError('invalid_review_json'); }
      const note = isCreate ? await store.create(input) : await store.update(path.slice((REVIEW_API + '/annotations/').length), input);
      return json(response, isCreate ? 201 : 200, { annotation: note });
    } catch (error) {
      const reason = error instanceof ReviewError ? error.reason : 'review_storage_failed';
      console.error(`local_review_error: ${reason}`);
      return json(response, error instanceof ReviewError ? error.status : 500, { reason });
    }
  };
}

export function localReviewPlugin(store) {
  return {
    name: 'agent-insight-local-review',
    configurePreviewServer(server) { server.middlewares.use(reviewHandler(store)); },
  };
}
