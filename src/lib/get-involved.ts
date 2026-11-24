/**
 * Role selection for the /get-involved page. One page hosts the speaker,
 * volunteer and idea forms; `?role=` picks the panel that opens first.
 */

export type Role = "speak" | "volunteer" | "idea";

export const DEFAULT_ROLE: Role = "speak";

const ROLES: ReadonlyArray<Role> = ["speak", "volunteer", "idea"];

/** Reads a `?role=` search param (string, repeated array or absent) into a valid Role. */
export function parseRole(value: string | string[] | undefined): Role {
  const first = Array.isArray(value) ? value[0] : value;
  return ROLES.find((role) => role === first) ?? DEFAULT_ROLE;
}
