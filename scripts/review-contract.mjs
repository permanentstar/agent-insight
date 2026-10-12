/**
 * Local review protocol shared by the Vue client and the loopback server.
 * Page identity comes from the book catalog; the server owns record IDs,
 * source hashes and timestamps. Review text never enters the public build.
 * @typedef {Object} Annotation
 * @property {string} id
 * @property {string} pageId
 * @property {string} path
 * @property {string} title
 * @property {string} sourceHash
 * @property {string} anchor
 * @property {string} quote
 * @property {string} comment
 * @property {'open'|'resolved'} status
 * @property {string} createdAt
 * @property {string} updatedAt
 */
export const REVIEW_API = '/__review';
export const REVIEW_TOKEN_HEADER = 'x-agent-insight-review-token';
export const REVIEW_STATUS = Object.freeze({ OPEN: 'open', RESOLVED: 'resolved' });
export const REVIEW_FORMAT_VERSION = 1;

/** Turn a catalog Markdown path into its VitePress reading URL. */
export function readingUrl(path, anchor = '') {
  const page = path === 'index.md' ? '/' : '/' + path.replace(/\/index\.md$/, '/').replace(/\.md$/, '');
  return page + (anchor ? '#' + encodeURIComponent(anchor) : '');
}
