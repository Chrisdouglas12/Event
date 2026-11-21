import express from 'express';
import type { Request, Response } from 'express';

import { Resource } from '../schema/resources.ts';

const router = express.Router();

function safeFileName(name: string): string {
  return name.replace(/[^\w.\-]+/g, '_').slice(0, 180) || 'download';
}

// MongoDB drivers can hand binary fields back as Buffer, Uint8Array or a
// Binary wrapper. res.end() only accepts real Buffers, so normalise first.
function toBuffer(value: unknown): Buffer | null {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  if (value && typeof value === 'object') {
    const wrapper = value as { buffer?: unknown; value?: unknown };
    const inner = wrapper.buffer ?? wrapper.value;
    if (Buffer.isBuffer(inner)) return inner;
    if (inner instanceof Uint8Array) return Buffer.from(inner);
    if (inner instanceof ArrayBuffer) return Buffer.from(inner);
  }
  return null;
}

// GET /api/resources/:key
// Streams a stored asset (for example the conference programme) from MongoDB.
router.get('/resources/:key', async (req: Request, res: Response) => {
  try {
    const key = String(req.params.key || '').trim().toLowerCase();
    if (!key) return res.status(400).json({ error: 'Resource key is required' });

    const resource = await Resource.findOne({ key, isActive: true }).lean();
    if (!resource) return res.status(404).json({ error: 'Resource not found' });

    const bytes = toBuffer(resource.data);
    if (!bytes) {
      console.error('[GET /api/resources/:key] stored binary data is invalid');
      return res.status(500).json({ error: 'Failed to download resource' });
    }

    res.setHeader('Content-Type', resource.mimeType || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeFileName(resource.fileName)}"`
    );
    res.setHeader('Content-Length', String(bytes.length));
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    return res.end(bytes);
  } catch (err) {
    console.error('[GET /api/resources/:key] error:', err);
    return res.status(500).json({ error: 'Failed to download resource' });
  }
});

export default router;
