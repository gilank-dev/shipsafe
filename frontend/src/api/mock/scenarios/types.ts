import type { BaseFinding } from '../prompts'

export interface Scenario {
  projectName: string
  summary: string
  findings: BaseFinding[]
  /** Masked: first 4 characters + ****. */
  secretsToRotate: string[]
  notAssessed: string[]
  /** Extra skipped paths on top of the ones found in the archive listing. */
  skippedFiles: string[]
}
