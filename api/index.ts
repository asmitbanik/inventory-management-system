import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handler } from '../server/src/index.js';

export default async function api(req: VercelRequest, res: VercelResponse) {
  return handler(req, res);
}
