import { useEffect, useId, useRef, useState } from 'react'
import { loadSample } from '../../api/client'

import { SAMPLES, type SampleId } from '../../config/samples'
import { announce } from '../../state/announcer'
import { useStore } from '../../state/store'
import { ConfirmDialog } from '../dialogs/ConfirmDialog'
import { IconChevron } from '../ui/icons'

/** Demo projects for the mock engine. Hidden when the app talks to a real server. */
export function SampleMenu() {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState<SampleId | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listId = useId()
  const hasFile = useStore((s) => s.submission.file !== null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const load = async (id: SampleId) => {
    const { file, context } = await loadSample(id)
    useStore.getState().loadProject(file, context)
    const label = SAMPLES.find((s) => s.id === id)?.label ?? id
    announce(`Loaded sample: ${label}`)
  }

  const choose = (id: SampleId) => {
    setOpen(false)
    if (hasFile) setPending(id)
    else void load(id)
  }

  return (
    <div
      ref={wrapRef}
      className="relative"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          setOpen(false)
          triggerRef.current?.focus()
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        className="btn"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
      >
        Load sample
        <IconChevron />
      </button>
      {open && (
        <ul
          id={listId}
          aria-label="Sample projects"
          className="absolute right-0 top-full z-40 mt-1 w-[min(22rem,calc(100vw-2rem))] border-2 border-ink bg-raised"
        >
          {SAMPLES.map((sample) => (
            <li key={sample.id} className="border-b border-rule last:border-b-0">
              <button
                type="button"
                className="block w-full px-3 py-2 text-left hover:bg-surface"
                onClick={() => choose(sample.id)}
              >
                <span className="block text-small font-semibold">{sample.label}</span>
                <span className="block text-caption text-ink-3">{sample.note}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {pending && (
        <ConfirmDialog
          title="Replace your project?"
          confirmLabel="Load sample"
          cancelLabel="Keep my inputs"
          onCancel={() => setPending(null)}
          onConfirm={() => {
            const id = pending
            setPending(null)
            void load(id)
          }}
        >
          <p>Loading a sample replaces the ZIP and project context you have now. Samples are fictional projects built in memory.</p>
        </ConfirmDialog>
      )}
    </div>
  )
}
