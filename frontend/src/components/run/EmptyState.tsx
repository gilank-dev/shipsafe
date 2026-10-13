import { focusZipInput } from '../submission/UploadDropzone'

export function EmptyState() {
  return (
    <div className="mt-6 border border-dashed border-rule-strong p-5">
      <p className="max-w-[72ch]">
        No report yet. Choose a ZIP and run the audit. The report lists each finding with its file, severity and a prompt you can paste into your coding agent.
      </p>
      <button type="button" className="btn mt-4" onClick={focusZipInput}>
        Choose a ZIP file
      </button>
    </div>
  )
}
