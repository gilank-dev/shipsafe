// Runs before first paint (external file, so a strict CSP without 'unsafe-inline' still works).
// Applies the stored theme; the OS preference is handled in CSS when no theme is stored.
(function () {
  try {
    var stored = window.localStorage.getItem('shipsafe.theme')
    if (stored === 'light' || stored === 'dark') {
      document.documentElement.setAttribute('data-theme', stored)
    }
  } catch (e) {
    /* storage blocked: fall back to the OS preference */
  }
})()
