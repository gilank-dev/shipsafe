const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!publishableKey) {
  const errMsg =
    '[ShipSafe] Missing VITE_CLERK_PUBLISHABLE_KEY environment variable. Authentication via Clerk will be unavailable.'
  if (import.meta.env.DEV) {
    throw new Error(errMsg)
  } else {
    console.error(errMsg)
  }
}

export const CLERK_PUBLISHABLE_KEY = publishableKey || ''

export const isClerkEnabled = Boolean(CLERK_PUBLISHABLE_KEY)
