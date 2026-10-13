export const CLERK_PUBLISHABLE_KEY =
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ||
  'pk_test_cG9ldGljLWxvY3VzdC01MzI2LmNsZXJrLmFjY291bnRzLmRldiQ'

export const isClerkEnabled = Boolean(CLERK_PUBLISHABLE_KEY)
