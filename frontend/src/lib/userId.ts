export function getOrCreateUserId(): string {
  let id = localStorage.getItem('userId');
  if (!id) {
    id = Math.random().toString(36).substring(2, 15);
    localStorage.setItem('userId', id);
  }
  return id;
}
