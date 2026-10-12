import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readJSON, readPage } from './book-lib.mjs';
import { REVIEW_FORMAT_VERSION, REVIEW_STATUS } from './review-contract.mjs';

/** Named failures are returned to the client without filesystem details. */
export class ReviewError extends Error {
  constructor(reason, status = 400) { super(reason); this.reason = reason; this.status = status; }
}

/** Freeze catalog identity and source content at server startup. */
export function reviewPages(root) {
  return readJSON(join(root, 'catalog.json')).flatMap(group => group.items).map(item => {
    const file = join(root, 'docs', item.path);
    return {
      pageId: readPage(file).meta.id, path: item.path, title: item.title,
      sourceHash: createHash('sha256').update(readFileSync(file)).digest('hex'),
    };
  });
}

function requireText(value, reason, allowEmpty = false) {
  if (typeof value !== 'string' || (!allowEmpty && !value.trim())) throw new ReviewError(reason);
  return value;
}

/**
 * Owns the single .review/annotations.json file. The HTTP adapter constructs
 * one store per local server. Mutations serialize and replace the file
 * atomically; malformed existing data is rejected rather than overwritten.
 */
export class ReviewStore {
  constructor(directory, pages, { now = () => new Date().toISOString() } = {}) {
    this.directory = directory;
    this.file = join(directory, 'annotations.json');
    this.pages = new Map(pages.map(page => [page.pageId, page]));
    this.now = now;
    this.pending = Promise.resolve();
  }

  /** Missing data means an empty first review; unreadable data remains intact. */
  async read() {
    let text;
    try { text = await readFile(this.file, 'utf8'); }
    catch (error) {
      if (error.code === 'ENOENT') return { version: REVIEW_FORMAT_VERSION, annotations: [] };
      throw new ReviewError('review_store_unreadable', 500);
    }
    try {
      const data = JSON.parse(text);
      if (data.version !== REVIEW_FORMAT_VERSION || !Array.isArray(data.annotations)) throw new Error();
      const ids = new Set();
      for (const note of data.annotations) {
        for (const key of ['id', 'pageId', 'path', 'title', 'sourceHash', 'createdAt', 'updatedAt']) {
          requireText(note[key], 'invalid_review_store');
        }
        for (const key of ['anchor', 'quote']) requireText(note[key], 'invalid_review_store', true);
        requireText(note.comment, 'invalid_review_store');
        if (!Object.values(REVIEW_STATUS).includes(note.status) || ids.has(note.id)) throw new Error();
        ids.add(note.id);
      }
      return data;
    } catch { throw new ReviewError('invalid_review_store', 500); }
  }

  async list() { await this.pending; return (await this.read()).annotations; }

  /** Serialize changes, preserving existing records if validation or I/O fails. */
  mutate(change) {
    const operation = this.pending.then(async () => {
      const data = await this.read();
      const result = change(data.annotations);
      await mkdir(this.directory, { recursive: true, mode: 0o700 });
      const temporary = join(this.directory, `.annotations-${randomUUID()}.tmp`);
      try {
        await writeFile(temporary, JSON.stringify(data, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
        await rename(temporary, this.file);
      } finally { await rm(temporary, { force: true }); }
      return result;
    });
    this.pending = operation.catch(() => {});
    return operation;
  }

  /** The client supplies a location and opinion, never a storage path or ID. */
  create(input) {
    return this.mutate(notes => {
      const page = this.pages.get(input?.pageId);
      if (!page) throw new ReviewError('unknown_review_page');
      if (input.sourceHash !== page.sourceHash) throw new ReviewError('stale_review_page', 409);
      const timestamp = this.now();
      const note = {
        id: randomUUID(), ...page,
        anchor: requireText(input.anchor, 'invalid_review_anchor', true),
        quote: requireText(input.quote, 'invalid_review_quote', true),
        comment: requireText(input.comment, 'empty_review_comment').trim(),
        status: REVIEW_STATUS.OPEN, createdAt: timestamp, updatedAt: timestamp,
      };
      notes.push(note);
      return note;
    });
  }

  /** Editing an opinion or its disposition preserves the original source location. */
  update(id, input) {
    return this.mutate(notes => {
      const note = notes.find(item => item.id === id);
      if (!note) throw new ReviewError('review_note_missing', 404);
      if (!input || !Object.keys(input).length || Object.keys(input).some(key => !['comment', 'status'].includes(key))) {
        throw new ReviewError('invalid_review_update');
      }
      if ('comment' in input) note.comment = requireText(input.comment, 'empty_review_comment').trim();
      if ('status' in input) {
        if (!Object.values(REVIEW_STATUS).includes(input.status)) throw new ReviewError('invalid_review_status');
        note.status = input.status;
      }
      note.updatedAt = this.now();
      return note;
    });
  }
}
