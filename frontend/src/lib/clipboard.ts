/**
 * Cross-device clipboard copying with fallback for iOS Safari, Android Chrome,
 * insecure contexts (HTTP / local IP), and in-app webviews.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false
  }

  // 1. Try modern Async Clipboard API first (requires HTTPS or localhost in modern browsers)
  if (navigator?.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // Insecure context, permissions denied, or webview restriction: fall back to execCommand
    }
  }

  // 2. Fallback to hidden textarea with document.execCommand('copy')
  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    // Style to ensure it is not visible and does not alter scrolling or trigger mobile zoom
    textarea.style.position = 'fixed'
    textarea.style.top = '0'
    textarea.style.left = '-9999px'
    textarea.style.width = '2em'
    textarea.style.height = '2em'
    textarea.style.padding = '0'
    textarea.style.border = 'none'
    textarea.style.outline = 'none'
    textarea.style.boxShadow = 'none'
    textarea.style.background = 'transparent'
    textarea.style.fontSize = '16px' // 16px prevents iOS Safari auto-zoom
    textarea.setAttribute('readonly', '')
    textarea.setAttribute('aria-hidden', 'true')
    document.body.appendChild(textarea)

    // Selection handling for both desktop and iOS Safari
    textarea.focus()
    textarea.select()
    textarea.setSelectionRange(0, textarea.value.length)

    const successful = document.execCommand('copy')
    document.body.removeChild(textarea)
    return Boolean(successful)
  } catch {
    return false
  }
}
