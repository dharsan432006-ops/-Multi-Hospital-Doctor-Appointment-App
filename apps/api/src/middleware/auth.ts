import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { getConfig } from '../config/config.js';
import { ApiError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';

export type AuthRole = 'PATIENT' | 'DOCTOR' | 'ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  role: AuthRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw ApiError.unauthorized('MISSING_TOKEN', 'Missing access token');
    }
    const token = header.slice(7);
    const cfg = getConfig();
    let payload: { sub: string };
    try {
      payload = jwt.verify(token, cfg.JWT_ACCESS_SECRET) as { sub: string };
    } catch {
      throw ApiError.unauthorized('INVALID_TOKEN', 'Invalid or expired access token');
    }
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, isActive: true },
    });
    if (!user || !user.isActive) {
      throw ApiError.unauthorized('USER_INACTIVE', 'Account is inactive');
    }
    req.user = { id: user.id, email: user.email, role: user.role as AuthRole };
    next();
  } catch (e) {
    next(e);
  }
}

export function requireRole(...roles: AuthRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(ApiError.unauthorized());
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(ApiError.forbidden('ROLE_FORBIDDEN', `Requires role: ${roles.join('|')}`));
      return;
    }
    next();
  };
}
