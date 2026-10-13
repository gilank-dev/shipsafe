import { useId, useState, type DragEvent } from 'react'
import { MAX_ZIP_BYTES } from '../../config/limits'
import { formatBytes } from '../../domain/format'
import { selectFile, importGitHubRepo } from '../../state/audit-controller'
import { announce } from '../../state/announcer'
import { useStore } from '../../state/store'
import { IconFile, IconUpload, IconGit, IconDownload } from '../ui/icons'

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
  const [sourceMode, setSourceMode] = useState<'zip' | 'repo'>('zip')
  const [repoInput, setRepoInput] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
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

  const handleImportRepo = async (urlToImport?: string) => {
    const target = (urlToImport ?? repoInput).trim()
    if (!target) {
      setImportError('Please enter a GitHub repository URL or owner/repo format.')
      return
    }
    setImportError(null)
    setIsImporting(true)
    try {
      const ok = await importGitHubRepo(target)
      if (ok) {
        setRepoInput('')
      } else {
        setImportError('Failed to import repository. Ensure it is public and under 10 MB.')
      }
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : 'Error importing repository.')
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="rule-top mt-6 pt-4">
      {/* Top Source Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div>
          <h3 className="text-title font-bold">Project Source</h3>
          <p id={helpId} className="mt-0.5 text-small text-ink-2">
            Upload your codebase ZIP archive or import a public repository from GitHub (up to {formatBytes(MAX_ZIP_BYTES).replace('.0', '')}).
          </p>
        </div>

        <div className="inline-flex p-1 border border-rule bg-surface shrink-0 self-start sm:self-center" role="tablist" aria-label="Project source selection">
          <button
            type="button"
            role="tab"
            id="tab-upload-zip"
            aria-selected={sourceMode === 'zip'}
            aria-controls="panel-upload-zip"
            className={`px-3 py-1.5 text-small font-semibold transition-colors flex items-center gap-1.5 ${
              sourceMode === 'zip'
                ? 'bg-raised text-ink border border-rule-strong shadow-xs'
                : 'text-ink-2 hover:text-ink'
            }`}
            onClick={() => setSourceMode('zip')}
          >
            <IconUpload width={14} height={14} />
            <span>Upload ZIP</span>
          </button>
          <button
            type="button"
            role="tab"
            id="tab-import-repo"
            aria-selected={sourceMode === 'repo'}
            aria-controls="panel-import-repo"
            className={`px-3 py-1.5 text-small font-semibold transition-colors flex items-center gap-1.5 ${
              sourceMode === 'repo'
                ? 'bg-raised text-ink border border-rule-strong shadow-xs'
                : 'text-ink-2 hover:text-ink'
            }`}
            onClick={() => setSourceMode('repo')}
          >
            <IconGit width={14} height={14} />
            <span>Import GitHub Repo</span>
          </button>
        </div>
      </div>

      {/* Selected File Card (Shared between ZIP and Imported Repo) */}
      {file ? (
        <div className="mt-3">
          <div className="p-3 sm:p-4 border-2 border-rule-strong bg-raised flex items-center justify-between gap-3 w-full min-w-0">
            <span className="flex items-center gap-3 min-w-0 flex-1">
              <IconFile className="shrink-0 text-ink" width={22} height={22} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold text-body font-mono text-ink" title={file.name}>
                  {file.name}
                </span>
                <span className="block text-small text-ink-2">
                  {formatBytes(file.size)} of {formatBytes(MAX_ZIP_BYTES).replace('.0', '')} (Ready for audit)
                </span>
              </span>
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <span className="tag text-caption font-bold bg-status-pass-bg text-status-pass-fg border border-status-pass-border">
                Ready
              </span>
              <button
                type="button"
                className="btn btn-quiet text-small px-2.5 py-1 text-fail hover:bg-status-fail-bg"
                onClick={() => {
                  setFile(null, null)
                  announce('File removed')
                  if (sourceMode === 'zip') focusZipInput()
                }}
              >
                <span className="truncate block max-w-full">
                  Remove <span className="font-semibold">{file.name}</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      ) : sourceMode === 'zip' ? (
        /* ZIP Dropzone Panel */
        <div
          id="panel-upload-zip"
          role="tabpanel"
          aria-labelledby="tab-upload-zip"
          className="mt-2"
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
              <span className="flex items-center gap-3">
                <IconUpload className="shrink-0" width={20} height={20} />
                <span>
                  <span className="block font-semibold">
                    {dragging ? 'Drop the ZIP to select it' : 'Choose a ZIP file'}
                  </span>
                  <span className="block text-small text-ink-2">
                    Tap to browse or drag file here
                  </span>
                </span>
              </span>
              <span className="inline-flex items-center justify-center btn text-small px-3 py-1.5 shrink-0 self-start sm:self-center pointer-events-none">
                Browse ZIP file
              </span>
            </div>
          </label>
        </div>
      ) : (
        /* GitHub Repo Import Input Panel */
        <div id="panel-import-repo" role="tabpanel" aria-labelledby="tab-import-repo" className="mt-2 border border-rule bg-surface p-4 space-y-3">
          <div>
            <label htmlFor="repo-input" className="block text-small font-semibold text-ink">
              GitHub Repository (URL or owner/repo)
            </label>
            <p className="text-small text-ink-2 mt-0.5">
              Enter any public repository. ShipSafe downloads the default branch archive and prepares it for static rules and AI audit.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-2">
                <IconGit width={16} height={16} />
              </div>
              <input
                id="repo-input"
                type="text"
                value={repoInput}
                onChange={(e) => {
                  setRepoInput(e.target.value)
                  if (importError) setImportError(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void handleImportRepo()
                  }
                }}
                placeholder="e.g. gilank-dev/shipsafe or expressjs/express"
                className="control pl-9 w-full text-small font-mono"
                disabled={isImporting}
                aria-describedby={importError ? 'repo-error' : undefined}
              />
            </div>
            <button
              type="button"
              className="btn btn-primary text-small px-4 shrink-0 flex items-center justify-center gap-2"
              onClick={() => void handleImportRepo()}
              disabled={isImporting || !repoInput.trim()}
            >
              {isImporting ? (
                <>
                  <span className="inline-block w-3.5 h-3.5 border-2 border-surface border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                  <span>Importing...</span>
                </>
              ) : (
                <>
                  <IconDownload width={14} height={14} />
                  <span>Import Repo</span>
                </>
              )}
            </button>
          </div>

          {importError && (
            <p id="repo-error" role="alert" className="border-l-2 border-fail pl-3 text-small text-fail">
              {importError}
            </p>
          )}

          <div className="pt-1 flex flex-wrap items-center gap-1.5 text-small text-ink-2">
            <span className="font-semibold text-ink">Quick try:</span>
            <button
              type="button"
              className="btn btn-quiet text-small font-mono py-1 px-2 border border-rule hover:border-ink"
              onClick={() => {
                setRepoInput('gilank-dev/shipsafe')
                void handleImportRepo('gilank-dev/shipsafe')
              }}
              disabled={isImporting}
            >
              gilank-dev/shipsafe
            </button>
            <button
              type="button"
              className="btn btn-quiet text-small font-mono py-1 px-2 border border-rule hover:border-ink"
              onClick={() => {
                setRepoInput('expressjs/express')
                void handleImportRepo('expressjs/express')
              }}
              disabled={isImporting}
            >
              expressjs/express
            </button>
          </div>
        </div>
      )}

      {fileError && (
        <p id={errorId} role="alert" className="mt-2 border-l-2 border-fail pl-3 text-small text-fail">
          {fileError}
        </p>
      )}
    </div>
  )
}
