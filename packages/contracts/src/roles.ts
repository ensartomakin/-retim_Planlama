export const ROLE_CODES = [
  'super_admin',
  'tasarim',
  'modalist',
  'planlama',
  'satinalma',
  'uretim',
] as const;

export type RoleCode = (typeof ROLE_CODES)[number];

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  roles: RoleCode[];
}

export function hasRole(user: Pick<SessionUser, 'roles'>, ...allowed: RoleCode[]): boolean {
  if (user.roles.includes('super_admin')) return true;
  return allowed.some((r) => user.roles.includes(r));
}

export function canWrite(user: Pick<SessionUser, 'roles'>, module: Module): boolean {
  return hasRole(user, ...MODULE_WRITERS[module]);
}

export type Module = 'model' | 'pattern' | 'order' | 'bom' | 'stock' | 'purchase' | 'users';

const MODULE_WRITERS: Record<Module, RoleCode[]> = {
  model: ['tasarim'],
  pattern: ['modalist'],
  order: ['planlama'],
  bom: ['satinalma', 'tasarim'],
  stock: ['satinalma'],
  purchase: ['satinalma'],
  users: [],
};
