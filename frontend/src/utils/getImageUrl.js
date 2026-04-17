const BASE = import.meta.env.VITE_API_BASE_URL || ''

export function getImageUrl(url) {
  if (!url) return null
  if (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:')) return url
  return BASE + url
}
