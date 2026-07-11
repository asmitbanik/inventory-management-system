import type { VercelRequest, VercelResponse } from '@vercel/node';

type Handler = (req: VercelRequest, res: VercelResponse) => Promise<unknown>;

let cachedAuthDispatch: Handler | undefined;
let cachedAppDispatch: Handler | undefined;

function getPath(req: VercelRequest) {
  return req.url?.split('?')[0] ?? '';
}

function isAuthRoute(path: string) {
  return path.includes('/auth/');
}

export default async function api(req: VercelRequest, res: VercelResponse) {
  const path = getPath(req);

  if (path.endsWith('/health')) {
    return res.json({ status: 'ok', region: process.env.VERCEL_REGION || null });
  }

  if (isAuthRoute(path)) {
    if (!cachedAuthDispatch) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      cachedAuthDispatch = require('./auth-handlers.cjs').dispatchAuth;
    }
    return cachedAuthDispatch(req, res);
  }

  if (!cachedAppDispatch) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedAppDispatch = require('../server/dist/api/app-dispatch.js').dispatchApp;
  }
  return cachedAppDispatch(req, res);
}
