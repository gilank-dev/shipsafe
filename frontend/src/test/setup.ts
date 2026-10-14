import '@testing-library/jest-dom/vitest'
import { afterEach, expect, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as axeMatchers from 'vitest-axe/matchers'

expect.extend(axeMatchers)

const clerkMock = vi.hoisted(() => () => ({
  ClerkProvider: ({ children }: { children: React.ReactNode }) => children,
  useUser: () => ({ isSignedIn: false, user: null, isLoaded: true }),
  useAuth: () => ({ isSignedIn: false, userId: null, getToken: async () => null, isLoaded: true }),
  useClerk: () => ({
    openSignIn: vi.fn(),
    openSignUp: vi.fn(),
    signOut: vi.fn(),
  }),
  useSignIn: () => ({
    isLoaded: true,
    signIn: {
      authenticateWithRedirect: vi.fn().mockResolvedValue({}),
      create: vi.fn().mockResolvedValue({}),
    },
  }),
  useSignUp: () => ({
    isLoaded: true,
    signUp: {
      create: vi.fn().mockResolvedValue({}),
    },
  }),
  AuthenticateWithRedirectCallback: () => null,
  HandleSSOCallback: () => null,
  SignIn: () => null,
  SignUp: () => null,
  SignInButton: ({ children }: { children: React.ReactNode }) => children,
  SignUpButton: ({ children }: { children: React.ReactNode }) => children,
  UserButton: () => null,
}))

// Mock Clerk React SDK for test suites
vi.mock('@clerk/clerk-react', clerkMock)
vi.mock('@clerk/react', clerkMock)


// jsdom has no <dialog> showModal/close; provide the minimum behaviour the app relies on.
if (typeof HTMLDialogElement !== 'undefined') {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    if (!this.hasAttribute('open')) return
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
}

if (typeof window.ResizeObserver === 'undefined') {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

afterEach(() => cleanup())

