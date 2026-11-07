/**
 * Answer-page photos. Stored through appkit storage (local ./uploads in dev,
 * S3/R2 when configured) under keys that are never served publicly — pages
 * are read back only through the owner-checked routes.
 */
import { randomUUID } from 'node:crypto';
import { storageClass } from '@bloomneo/appkit/storage';
import { errorClass } from '@bloomneo/appkit/error';

const error = errorClass.get();

export const MAX_PAGES = 12;
export const MAX_PAGE_BYTES = 10 * 1024 * 1024;
// HEIC is left out on purpose: storage refuses it and the marker cannot read it. Phones and browsers convert to JPEG on upload.
const TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

export async function storePage(submissionId: string, contentType: string | undefined, body: unknown) {
  const ext = contentType && TYPES[contentType.split(';')[0].trim()];
  if (!ext) throw error.badRequest('Send the page as a JPEG, PNG or WebP photo');
  if (!Buffer.isBuffer(body) || !body.length) throw error.badRequest('Empty image');
  const key = `answer-pages/${submissionId}/${randomUUID()}.${ext}`;
  await storageClass.get().put(key, body, { contentType });
  return key;
}

export async function readPage(key: string) {
  const ext = key.split('.').pop() ?? '';
  const type = Object.entries(TYPES).find(([, e]) => e === ext)?.[0] ?? 'application/octet-stream';
  return { data: await storageClass.get().get(key), type };
}
