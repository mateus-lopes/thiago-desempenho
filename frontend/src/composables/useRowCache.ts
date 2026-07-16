const PREFIX = 'rowcache_'
const DEFAULT = 15
const MAX = 60

export function getRowCache(key: string): number {
  const v = localStorage.getItem(PREFIX + key)
  const n = v ? parseInt(v, 10) : DEFAULT
  return Math.min(isNaN(n) ? DEFAULT : n, MAX)
}

export function setRowCache(key: string, count: number) {
  localStorage.setItem(PREFIX + key, String(count))
}
