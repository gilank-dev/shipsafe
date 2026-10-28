import { useDeferredValue, useId, useMemo, useState } from 'react'
import { DEPLOY_TARGETS } from '../../config/agents'
import { MAX_DESCRIPTION_CHARS } from '../../config/limits'
import { scanSecrets } from '../../domain/secrets'
import { useStore } from '../../state/store'

export const DESCRIPTION_ID = 'project-description'

const WARN_AT = Math.floor(MAX_DESCRIPTION_CHARS * 0.9)

export function ContextForm() {
  const description = useStore((s) => s.submission.description)
  const deployTarget = useStore((s) => s.submission.deployTarget)
  const handlesPII = useStore((s) => s.submission.handlesPII)
  const handlesPayments = useStore((s) => s.submission.handlesPayments)
  const setDescription = useStore((s) => s.setDescription)
  const setDeployTarget = useStore((s) => s.setDeployTarget)
  const setFlag = useStore((s) => s.setFlag)
  const [cutNotice, setCutNotice] = useState(false)
  const hintId = useId()
  const counterId = useId()
  const deployId = useId()

  // Derived from the text, not synced into state. useDeferredValue keeps typing responsive.
  const deferred = useDeferredValue(description)
  const hits = useMemo(() => scanSecrets(deferred), [deferred])
  const firstHit = hits[0]

  return (
    <fieldset className="rule-top mt-4 min-w-0 pt-3">
      <legend className="float-left w-full text-title font-bold [font-stretch:112%]">Project context (optional)</legend>
      <p className="clear-both mt-1 text-small text-ink-2">
        Context helps the review judge severity. Do not paste secrets or code here.
      </p>

      <label htmlFor={DESCRIPTION_ID} className="mt-3 block text-small font-semibold">
        What does the project do?
      </label>
      <textarea
        id={DESCRIPTION_ID}
        className="control mt-1"
        rows={2}
        maxLength={MAX_DESCRIPTION_CHARS}
        value={description}
        placeholder="Who uses it, what data it stores, and how it signs people in."
        aria-describedby={`${counterId}${firstHit ? ` ${hintId}` : ''}`}
        onChange={(e) => {
          setCutNotice(false)
          setDescription(e.target.value)
        }}
        onPaste={(e) => {
          const el = e.currentTarget
          const pasted = e.clipboardData.getData('text')
          const kept = description.length - (el.selectionEnd - el.selectionStart)
          if (kept + pasted.length > MAX_DESCRIPTION_CHARS) setCutNotice(true)
        }}
      />
      <div className="mt-1 flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div className="min-w-0 flex-1 text-small">
          <div role="status" id={hintId}>
            {firstHit && (
              <p className="text-partial">
                Possible secret on line {firstHit.line} ({firstHit.masked}). Replace it with a placeholder such as {firstHit.placeholder}.
              </p>
            )}
          </div>
          {cutNotice && (
            <p className="text-partial">Pasted text was cut at {MAX_DESCRIPTION_CHARS.toLocaleString('en-US')} characters.</p>
          )}
        </div>
        <p
          id={counterId}
          className={`text-caption tabular-nums shrink-0 ${description.length >= WARN_AT ? 'font-semibold text-partial' : 'text-ink-3'}`}
        >
          {description.length.toLocaleString('en-US')} / {MAX_DESCRIPTION_CHARS.toLocaleString('en-US')}
        </p>
      </div>

      <label htmlFor={deployId} className="mt-4 block text-small font-semibold">
        Deployment target
      </label>
      <select id={deployId} className="control mt-1" value={deployTarget} onChange={(e) => setDeployTarget(e.target.value)}>
        {DEPLOY_TARGETS.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      <div className="mt-3">
        <label className="check">
          <input type="checkbox" checked={handlesPII} onChange={(e) => setFlag('handlesPII', e.target.checked)} />
          <span>Handles personal data (PII)</span>
        </label>
        <label className="check">
          <input type="checkbox" checked={handlesPayments} onChange={(e) => setFlag('handlesPayments', e.target.checked)} />
          <span>Handles payments</span>
        </label>
      </div>
    </fieldset>
  )
}
