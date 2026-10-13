import { isOutdated, snapshotOf } from '../domain/stale'
import { isTurnstileEnabled } from '../config/turnstile'
import { useStore, type ShipSafeState } from './store'

/** Derived, never stored: the report is Outdated when the ZIP or context differ from what it was built from. */
export const selectOutdated = (s: ShipSafeState): boolean =>
  isOutdated(
    s.audit.snapshot,
    snapshotOf(s.submission.file, {
      description: s.submission.description,
      deployTarget: s.submission.deployTarget,
      handlesPII: s.submission.handlesPII,
      handlesPayments: s.submission.handlesPayments,
    }),
  )

export const selectIsCaptchaReady = (s: ShipSafeState): boolean =>
  !isTurnstileEnabled() || Boolean(s.submission.turnstileToken)

export const selectCanRun = (s: ShipSafeState): boolean =>
  s.submission.file !== null &&
  s.submission.fileError === null &&
  s.audit.status !== 'running' &&
  selectIsCaptchaReady(s)

export const useOutdated = () => useStore(selectOutdated)
export const useCanRun = () => useStore(selectCanRun)
export const useIsCaptchaReady = () => useStore(selectIsCaptchaReady)

