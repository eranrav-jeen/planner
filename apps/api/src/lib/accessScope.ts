import type { NextFunction, Request, Response } from 'express';
import { prisma } from './prisma.js';
import { asyncHandler } from './asyncHandler.js';
import { ApiError } from '../middleware/error.js';

/**
 * null means "unrestricted" (sees everything) — Admins always, and any
 * Manager/Viewer who hasn't been explicitly restricted. A restricted user's
 * scope is always a concrete (possibly empty) list of project ids.
 */
export type AccessScope = { projectIds: string[] } | null;

export async function getAccessScope(req: Request): Promise<AccessScope> {
  const user = req.user!;
  if (user.role === 'ADMIN' || !user.isRestricted) return null;
  const grants = await prisma.projectAccess.findMany({
    where: { userId: user.id },
    select: { projectId: true },
  });
  return { projectIds: grants.map((g) => g.projectId) };
}

/** Intersects an explicit id filter (e.g. a `?projectId=` query param) with the scope. */
export function intersectProjectIds(scope: AccessScope, explicitId: string | undefined): string[] | undefined {
  return intersectIds(scope === null ? null : scope.projectIds, explicitId);
}

/**
 * Generic version for any already-resolved accessible-id list (e.g. from
 * getAccessibleEmployeeIds/getAccessibleCustomerIds). `null` means
 * unrestricted. Returns `undefined` only when there's truly no filter to
 * apply (unrestricted + no explicit id) — callers should treat that as "omit
 * the where clause" and anything else as a concrete `{ in: [...] }` list.
 */
export function intersectIds(accessibleIds: string[] | null, explicitId: string | undefined): string[] | undefined {
  if (accessibleIds === null) return explicitId ? [explicitId] : undefined;
  if (explicitId) return accessibleIds.includes(explicitId) ? [explicitId] : [];
  return accessibleIds;
}

export function isProjectAccessible(scope: AccessScope, projectId: string): boolean {
  return scope === null || scope.projectIds.includes(projectId);
}

/** Route guard: 403s unless the `:paramName` route param is a project the caller can access. */
export function requireProjectAccess(paramName = 'id') {
  return asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    const scope = await getAccessScope(req);
    if (!isProjectAccessible(scope, req.params[paramName])) {
      throw new ApiError(403, 'You do not have access to this project');
    }
    next();
  });
}

export async function getAccessibleCustomerIds(scope: AccessScope): Promise<string[] | null> {
  if (scope === null) return null;
  if (scope.projectIds.length === 0) return [];
  const projects = await prisma.project.findMany({
    where: { id: { in: scope.projectIds } },
    select: { customerId: true },
  });
  return [...new Set(projects.map((p) => p.customerId))];
}

export async function getAccessibleEmployeeIds(scope: AccessScope): Promise<string[] | null> {
  if (scope === null) return null;
  if (scope.projectIds.length === 0) return [];
  const assignments = await prisma.projectAssignment.findMany({
    where: { projectId: { in: scope.projectIds } },
    select: { employeeId: true },
  });
  return [...new Set(assignments.map((a) => a.employeeId))];
}
