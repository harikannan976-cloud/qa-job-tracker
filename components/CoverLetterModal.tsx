'use client'

import { useState, useEffect, useRef } from 'react'
import { Copy, Download, X, Edit2, Check, ExternalLink, Loader2 } from 'lucide-react'
import { useFocusTrap } from '@/hooks/useFocusTrap'

interface Props {
  jobTitle:         string
  employer:         string
  coverLetterUrl:   string
  coverLetterText?: string
  onClose:          () => void
  onCopied?:        () => void
}

export default function CoverLetterModal({ jobTitle, employer, coverLetterUrl, coverLetterText, onClose, onCopied }: Props) {
  const [text,    setText]    = useState('')
  const [edited,  setEdited]  = useState('')
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(!coverLetterText)
  const [error,   setError]   = useState<string | null>(null)
  const [copied,  setCopied]  = useState(false)

  const dialogRef = useRef<HTMLDivElement>(null)
  useFocusTrap(dialogRef)

  useEffect(() => {
    if (coverLetterText) {
      setText(coverLetterText)
      setEdited(coverLetterText)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    fetch(`/api/cover-letter?url=${encodeURIComponent(coverLetterUrl)}`)
      .then(r => r.json())
      .then(d => {
        if (d.text) {
          setText(d.text)
          setEdited(d.text)
        } else {
          setError(d.error === 'external_html' ? 'html' : 'fetch_failed')
        }
      })
      .catch(() => setError('fetch_failed'))
      .finally(() => setLoading(false))
  }, [coverLetterUrl, coverLetterText])

  const displayText = editing ? edited : text

  function handleCopy() {
    navigator.clipboard.writeText(displayText).then(() => {
      setCopied(true)
      onCopied?.()
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleDownload() {
    const blob = new Blob([displayText], { type: 'text/plain' })
    const a    = document.createElement('a')
    a.href     = URL.createObjectURL(blob)
    a.download = `cover-letter-${employer.toLowerCase().replace(/\W+/g, '-')}.txt`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  // Escape is handled via onKeyDown on the dialog div (stopPropagation prevents
  // the panel behind this modal from also closing on the same keystroke)

  return (
    <>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60]" onClick={onClose} />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cl-modal-title"
        onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); onClose() } }}
        className="fixed inset-x-4 top-[5vh] bottom-[5vh] max-w-2xl mx-auto bg-[#0e0e18] border border-[#1a1a26] rounded-2xl z-[70] flex flex-col shadow-2xl animate-fade-in"
      >

        {/* Header */}
        <div className="flex-shrink-0 flex items-start justify-between px-6 py-4 border-b border-[#1a1a26]">
          <div>
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-medium mb-0.5">Cover Letter</p>
            <h2 id="cl-modal-title" className="text-[14px] font-semibold text-white leading-snug">{jobTitle}</h2>
            <p className="text-[12px] text-zinc-500 mt-0.5">{employer}</p>
          </div>
          <button onClick={onClose} aria-label="Close cover letter" className="text-zinc-600 hover:text-zinc-300 hover:bg-[#1e1e2e] p-1.5 rounded-lg transition-all mt-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toolbar */}
        {!loading && !error && (
          <div className="flex-shrink-0 flex items-center gap-2 px-6 py-3 border-b border-[#1a1a26]">
            <button
              onClick={() => setEditing(e => !e)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all ${
                editing
                  ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/25'
                  : 'bg-[#14141e] text-zinc-400 border-[#252535] hover:text-zinc-200 hover:border-[#3a3a4e]'
              }`}
            >
              <Edit2 className="w-3 h-3" />
              {editing ? 'Editing' : 'Edit'}
            </button>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-[#14141e] text-zinc-400 border border-[#252535] hover:text-zinc-200 hover:border-[#3a3a4e] transition-all"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-[#14141e] text-zinc-400 border border-[#252535] hover:text-zinc-200 hover:border-[#3a3a4e] transition-all"
            >
              <Download className="w-3 h-3" />
              Download
            </button>

            <a
              href={coverLetterUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-[#14141e] text-zinc-400 border border-[#252535] hover:text-zinc-200 hover:border-[#3a3a4e] transition-all ml-auto"
            >
              <ExternalLink className="w-3 h-3" />
              Open Original
            </a>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-hidden px-6 py-5">
          {loading && (
            <div className="flex items-center justify-center h-full gap-2 text-zinc-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-[13px]">Loading cover letter…</span>
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <div className="w-10 h-10 rounded-full bg-[#1a1a26] flex items-center justify-center">
                <ExternalLink className="w-4 h-4 text-zinc-500" />
              </div>
              <div>
                <p className="text-[13px] text-zinc-400 font-medium mb-1">
                  {error === 'html' ? 'Preview unavailable' : 'Could not load cover letter'}
                </p>
                <p className="text-[12px] text-zinc-600 mb-4">
                  {error === 'html'
                    ? 'This cover letter is hosted externally (Google Drive or similar).'
                    : 'The file could not be fetched. Try opening it directly.'}
                </p>
              </div>
              <a
                href={coverLetterUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[13px] font-medium transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open Cover Letter
              </a>
            </div>
          )}

          {!loading && !error && (
            editing ? (
              <textarea
                value={edited}
                onChange={e => setEdited(e.target.value)}
                className="w-full h-full bg-[#090910] border border-[#2a2a3e] rounded-xl px-4 py-3 text-[13px] text-zinc-200 leading-7 resize-none focus:outline-none focus:border-indigo-500/40 font-mono"
              />
            ) : (
              <div className="h-full overflow-y-auto pr-1">
                <p className="text-[13px] text-zinc-300 leading-7 whitespace-pre-wrap">
                  {displayText}
                </p>
              </div>
            )
          )}
        </div>
      </div>
    </>
  )
}
