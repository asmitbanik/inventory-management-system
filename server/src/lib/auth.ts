import jwt from 'jsonwebtoken';
import type { CookieOptions, Response } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const COOKIE_NAME = 'inventory_token';

export interface JwtPayload {
  userId: string;
  email: string;
}

type CookieResponse = {
  cookie?: (name: string, value: string, options?: CookieOptions) => unknown;
  clearCookie?: (name: string, options?: CookieOptions) => unknown;
  setHeader: (name: string, value: string | string[]) => unknown;
};

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

function cookieOptions(): CookieOptions {
  const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  };
}

function serializeCookie(name: string, value: string, opts: CookieOptions) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${opts.path ?? '/'}`,
    `Max-Age=${Math.floor((opts.maxAge ?? 0) / 1000)}`,
    opts.httpOnly ? 'HttpOnly' : '',
    opts.secure ? 'Secure' : '',
    `SameSite=${opts.sameSite === 'none' ? 'None' : opts.sameSite === 'strict' ? 'Strict' : 'Lax'}`,
  ].filter(Boolean);
  return parts.join('; ');
}

export function setAuthCookie(res: CookieResponse, payload: JwtPayload) {
  const opts = cookieOptions();
  const value = signToken(payload);
  if (typeof res.cookie === 'function') {
    res.cookie(COOKIE_NAME, value, opts);
    return;
  }
  res.setHeader('Set-Cookie', serializeCookie(COOKIE_NAME, value, opts));
}

export function clearAuthCookie(res: CookieResponse) {
  const opts = { ...cookieOptions(), maxAge: 0 };
  if (typeof res.clearCookie === 'function') {
    res.clearCookie(COOKIE_NAME, opts);
    return;
  }
  res.setHeader('Set-Cookie', serializeCookie(COOKIE_NAME, '', opts));
}

function parseCookieHeader(header?: string): Record<string, string> {
  if (!header) return {};
  return Object.fromEntries(
    header.split(';').map((part) => {
      const [key, ...rest] = part.trim().split('=');
      return [key, decodeURIComponent(rest.join('='))];
    })
  );
}

export function getTokenFromRequest(req: {
  cookies?: Record<string, string>;
  headers?: { authorization?: string; cookie?: string };
}): string | null {
  if (req.cookies?.[COOKIE_NAME]) return req.cookies[COOKIE_NAME];
  const parsed = parseCookieHeader(req.headers?.cookie);
  if (parsed[COOKIE_NAME]) return parsed[COOKIE_NAME];
  const authHeader = req.headers?.authorization;
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);
  return null;
}
