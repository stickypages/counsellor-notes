/**
 * Format "2026-05-07" → "May 7, 2026"
 */
export function formatDate(dateStr) {
  if (!dateStr) return ''
  try {
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

/**
 * Today's date as YYYY-MM-DD
 */
export function today() {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Strip HTML tags to plain text for previews
 */
export function stripHtml(html) {
  if (!html) return ''
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
