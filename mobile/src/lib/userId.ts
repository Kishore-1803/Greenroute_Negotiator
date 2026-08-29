let currentUserId: string | null = null;

export function getOrCreateUserId(): string {
  if (currentUserId) return currentUserId;
  // Generate pseudo-UUID for mobile session
  currentUserId = 'user_' + Math.random().toString(36).substring(2, 10);
  return currentUserId;
}
