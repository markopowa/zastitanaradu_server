export function hasPermission(
  permissions: string[],
  required: string,
): boolean {
  return permissions.includes(required);
}

export function hasAnyPermission(
  permissions: string[],
  required: string[],
): boolean {
  return required.some((perm) => permissions.includes(perm));
}

export function hasPermissionWithPrefix(
  permissions: string[],
  prefix: string,
): boolean {
  return permissions.some((perm) => perm.startsWith(prefix));
}
