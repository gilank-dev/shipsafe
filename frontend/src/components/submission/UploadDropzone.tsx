import { useId, useState, type DragEvent } from 'react'
import { MAX_ZIP_BYTES } from '../../config/limits'
import { formatBytes } from '../../domain/format'
import { selectFile } from '../../state/audit-controller'
import { announce } from '../../state/announcer'
import { useStore } from '../../state/store'
import { IconFile, IconUpload } from '../ui/icons'

export const ZIP_INPUT_ID = 'zip-input'

export function focusZipInput(): void {
  document.getElementById(ZIP_INPUT_ID)?.focus()
}

function containsDirectory(e: DragEvent): boolean {
  return Array.from(e.dataTransfer.items ?? []).some((item) => item.webkitGetAsEntry?.()?.isDirectory === true)
}

export function UploadDropzone() {
  const file = useStore((s) => s.submission.file)
  const fileError = useStore((s) => s.submission.fileError)
  const setFile = useStore((s) => s.setFile)
  const [dragging, setDragging] = useState(false)
  const errorId = useId()
  const helpId = useId()

  const onDrop = async (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (containsDirectory(e)) {
      const message = 'Folders cannot be uploaded. Compress the folder into a ZIP file and drop that instead.'
      setFile(null, message)
      announce(message)
      return
    }
    await selectFile(e.dataTransfer.files)
  }

  return (
    <div className="rule-top mt-6 pt-4">
      <h3 className="text-title">Project ZIP</h3>
      <p id={helpId} className="mt-1 text-small text-ink-2">
        One .zip file, up to {formatBytes(MAX_ZIP_BYTES).replace('.0', '')}. Redact real secrets if you can. ShipSafe masks what it finds, but rotate anything exposed.
      </p>
      <div
        className="mt-3"
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <input
          id={ZIP_INPUT_ID}
          type="file"
          accept=".zip,application/zip,application/x-zip-compressed"
          className="dropzone-input visually-hidden"
          aria-describedby={`${helpId}${fileError ? ` ${errorId}` : ''}`}
          aria-invalid={fileError ? true : undefined}
          onChange={async (e) => {
            const picked = e.target.files
            if (picked && picked.length > 0) await selectFile(picked)
            e.target.value = ''
          }}
        />
        <label htmlFor={ZIP_INPUT_ID} className="dropzone" data-dragging={dragging}>
          {file ? (
            <span className="flex items-center gap-3">
              <IconFile width={20} height={20} />
              <span className="min-w-0">
                <span className="block truncate font-semibold">{file.name}</span>
                <span className="block text-small text-ink-2">
                  {formatBytes(file.size)} of {formatBytes(MAX_ZIP_BYTES).replace('.0', '')}
                </span>
              </span>
            </span>
          ) : (
            <span className="flex items-center gap-3">
              <IconUpload width={20} height={20} />
              <span>
                <span className="block font-semibold">{dragging ? 'Drop the ZIP to select it' : 'Choose a ZIP file'}</span>
                <span className="block text-small text-ink-2">or drag it here</span>
              </span>
            </span>
          )}
        </label>
      </div>
      {file && (
        <button
          type="button"
          className="btn btn-quiet mt-1"
          onClick={() => {
            setFile(null, null)
            announce('ZIP removed')
            focusZipInput()
          }}
        >
          Remove {file.name}
        </button>
      )}
      {fileError && (
        <p id={errorId} role="alert" className="mt-2 border-l-2 border-fail pl-3 text-small text-fail">
          {fileError}
        </p>
      )}
    </div>
  )
}
