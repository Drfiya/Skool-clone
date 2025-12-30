import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * User-like object interface for display utilities
 */
interface UserLike {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}

/**
 * Get initials from a user-like object
 * Falls back to first character of email, then "?"
 */
export function getInitials(user: UserLike): string {
  const first = user.firstName?.[0] || "";
  const last = user.lastName?.[0] || "";
  return (first + last).toUpperCase() || user.email?.[0]?.toUpperCase() || "?";
}

/**
 * Get display name from a user-like object
 * Falls back to email, then "Member"
 */
export function getDisplayName(user: UserLike, fallback = "Member"): string {
  if (user.firstName || user.lastName) {
    return `${user.firstName || ""} ${user.lastName || ""}`.trim();
  }
  return user.email || fallback;
}
