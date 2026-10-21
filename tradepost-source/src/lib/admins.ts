// The only accounts that may use the admin panel. Matching ignores case.
export const ADMIN_USERNAMES = ["Hotdogmanitis", "Barberdrake"];

export function isAdminName(username: string) {
  return ADMIN_USERNAMES.some((a) => a.toLowerCase() === username.toLowerCase());
}

export function isAdmin(user: { username: string; role: string } | null | undefined) {
  return !!user && user.role === "ADMIN" && isAdminName(user.username);
}
