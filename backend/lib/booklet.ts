import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Resource } from '../schema/resources.ts';

export const BOOKLET_RESOURCE_KEY = 'conference-booklet';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const PDF_PATH = path.join(currentDir, 'program.pdf');

function bookletDocument(data: Buffer) {
  return {
    key: BOOKLET_RESOURCE_KEY,
    name: 'IHGC 2026 Conference Booklet',
    description: 'Official programme and conference booklet.',
    fileName: 'IHGC-2026-Conference-Booklet.pdf',
    mimeType: 'application/pdf',
    data,
    size: data.length,
    isActive: true,
  };
}

// Inserts the booklet only when it is not already stored.
export async function ensureBookletSeeded(): Promise<boolean> {
  const existing = await Resource.findOne({ key: BOOKLET_RESOURCE_KEY }).lean();
  if (existing) return false;

  const data = await fs.readFile(PDF_PATH);
  await Resource.updateOne(
    { key: BOOKLET_RESOURCE_KEY },
    { $setOnInsert: bookletDocument(data) },
    { upsert: true }
  );
  return true;
}

// Inserts or replaces the stored booklet (used by the manual seed script).
export async function seedBooklet(): Promise<number> {
  const data = await fs.readFile(PDF_PATH);
  await Resource.findOneAndUpdate(
    { key: BOOKLET_RESOURCE_KEY },
    { $set: bookletDocument(data) },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return data.length;
}
