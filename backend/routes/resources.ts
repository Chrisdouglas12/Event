import express from 'express';
import type { Request, Response } from 'express';

import { Resource } from '../schema/resources.ts';

const router = express.Router();

function safeFileName(name: string): string {
  return name.replace(/[^\w.\-]+/g, '_').slice(0, 180) || 'download';
}

// GET /api/resources/:key
// Streams a stored asset (for example the conference booklet) from MongoDB.
router.get('/resources/:key', async (req: Request, res: Response) => {
  try {
    const key = String(req.params.key || '').trim().toLowerCase();
    if (!key) return res.status(400).json({ error: 'Resource key is required' });

    const resource = await Resource.findOne({ key, isActive: true }).lean();
    if (!resource) return res.status(404).json({ error: 'Resource not found' });

    res.setHeader('Content-Type', resource.mimeType || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeFileName(resource.fileName)}"`
    );
    res.setHeader('Content-Length', String(resource.size ?? resource.data?.length ?? 0));
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    return res.end(resource.data);
  } catch (err) {
    console.error('[GET /api/resources/:key] error:', err);
    return res.status(500).json({ error: 'Failed to download resource' });
  }
});

export default router;
