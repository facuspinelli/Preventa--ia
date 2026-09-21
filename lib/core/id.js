export function createId(prefix = 'id') {
  const now = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${now}-${random}`;
}
