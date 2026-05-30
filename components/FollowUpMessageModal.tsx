'use client'

import { useState, useRef } from 'react'
import { X, Copy, Check } from 'lucide-react'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { Job } from '@/lib/airtable'

// ─── Types ────────────────────────────────────────────────────────────────────

type MessageType = 'initial' | 'recruiter' | 'thank_you' | 'second'

const MESSAGE_TYPES: { key: MessageType; label: string; when: string }[] = [
  { key: 'initial',   label: 'Initial Follow-Up',  when: 'After applying, no response in 1–2 weeks' },
  { key: 'recruiter', label: 'Recruiter Outreach',  when: 'Reaching out to the recruiter directly'   },
  { key: 'thank_you', label: 'Post-Interview',      when: 'After a phone screen or interview'         },
  { key: 'second',    label: 'Second Follow-Up',    when: 'No response after initial follow-up'       },
]

// ─── Template helpers ─────────────────────────────────────────────────────────

function greetingName(contact: string): string {
  if (!contact || contact.includes('@')) return 'there'
  return contact.split(/[\s,]+/)[0]
}

function formatDate(iso: string): string {
  if (!iso) return 'recently'
  const d = new Date(iso + 'T00:00:00Z')
  return isNaN(d.getTime())
    ? 'recently'
    : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
}

function generateMessage(type: MessageType, job: Job): string {
  const title       = job.job_title    || 'the position'
  const company     = job.employer_name || 'your company'
  const greeting    = greetingName(job.recruiter_contact)
  const appliedDate = formatDate(job.applied_date)

  const templates: Record<MessageType, string> = {
    initial: [
      `Hi ${greeting},`,
      '',
      `I wanted to follow up on my application for the ${title} position at ${company}, which I submitted ${appliedDate}.`,
      '',
      `I remain very interested in this opportunity and would welcome the chance to discuss how my background aligns with your team's needs.`,
      '',
      'Thank you for your time and consideration.',
      '',
      'Best regards',
    ].join('\n'),

    recruiter: [
      `Hi ${greeting},`,
      '',
      `I'm reaching out regarding the ${title} role at ${company}. I applied ${appliedDate} and wanted to connect directly to express my strong interest.`,
      '',
      `My background in QA Automation aligns well with this role, and I'd welcome a brief conversation at your convenience.`,
      '',
      'Best regards',
    ].join('\n'),

    thank_you: [
      `Hi ${greeting},`,
      '',
      `Thank you for taking the time to speak with me about the ${title} role at ${company}. I enjoyed learning more about the team and the work ahead.`,
      '',
      `I remain very interested in the position and believe my experience would be a strong contribution to ${company}. Please don't hesitate to reach out if you need any additional information.`,
      '',
      'Thank you again.',
      '',
      'Best regards',
    ].join('\n'),

    second: [
      `Hi ${greeting},`,
      '',
      `I'm writing to follow up again on my application for the ${title} position at ${company}. I applied ${appliedDate} and remain very interested in the opportunity.`,
      '',
      `I understand you're reviewing many candidates and appreciate your time. I'd love to know if there are any updates on the hiring timeline.`,
      '',
      'Thank you.',
      '',
      'Best regards',
    ].join('\n'),
  }

  return templates[type]
}

function subjectLine(type: MessageType, job: Job): string {
  const title   = job.job_title    || 'Position'
  const company = job.employer_name || 'Company'
  const subjects: Record<MessageType, string> = {
    initial:   `Following Up — ${title} Application`,
    recruiter: `${title} — ${company} — Interest in Connecting`,
    thank_you: `Thank You — ${title} Interview`,
    second:    `Re: ${title} Application Update`,
  }
  return subjects[type]
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  job:     Job
  onClose: () => void
}

export default function FollowUpMessageModal({ job, onClose }: Props) {
  const [activeType, setActiveType] = useState<MessageType>('initial')
  const [copied,     setCopied]     = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  useFocusTrap(dialogRef)

  const message = generateMessage(activeType, job)
  const subject = subjectLine(activeType, job)

  function handleCopy() {
    const full = `Subject: ${subject}\n\n${message}`
    navigator.clipboard.writeText(full).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60]" onClick={onClose} />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="msg-modal-title"
        onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); onClose() } }}
        className="fixed inset-x-4 top-[6vh] bottom-[6vh] max-w-2xl mx-auto bg-[#0e0e18] border border-[#1a1a26] rounded-2xl z-[70] flex flex-col shadow-2xl animate-fade-in"
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-start justify-between px-6 py-4 border-b border-[#1a1a26]">
          <div>
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-medium mb-0.5">
              Follow-Up Message
            </p>
            <h2 id="msg-modal-title" className="text-[14px] font-semibold text-white leading-snug">
              {job.job_title}
            </h2>
            <p className="text-[12px] text-zinc-500 mt-0.5">{job.employer_name}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close message generator"
            className="text-zinc-600 hover:text-zinc-300 hover:bg-[#1e1e2e] p-1.5 rounded-lg transition-all mt-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message type tabs */}
        <div className="flex-shrink-0 flex gap-1 px-6 pt-3 pb-2 overflow-x-auto">
          {MESSAGE_TYPES.map(({ key, label, when }) => (
            <button
              key={key}
              type="button"
              onClick={() => { setActiveType(key); setCopied(false) }}
              title={when}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 ${
                activeType === key
                  ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/25'
                  : 'bg-[#0d0d14] text-zinc-500 border-[#1a1a26] hover:text-zinc-300 hover:border-[#252535]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* When to use */}
        <div className="flex-shrink-0 px-6 pb-2">
          <p className="text-[11px] text-zinc-600">
            {MESSAGE_TYPES.find(m => m.key === activeType)?.when}
          </p>
        </div>

        {/* Subject line */}
        <div className="flex-shrink-0 mx-6 mb-2 px-3 py-2 bg-[#0d0d14] border border-[#1a1a26] rounded-lg">
          <span className="text-[10px] text-zinc-600 uppercase tracking-wider mr-2">Subject:</span>
          <span className="text-[12px] text-zinc-300">{subject}</span>
        </div>

        {/* Message body */}
        <div className="flex-1 overflow-y-auto mx-6 mb-3 bg-[#090910] border border-[#1a1a26] rounded-xl px-4 py-3">
          <p className="text-[13px] text-zinc-300 leading-7 whitespace-pre-wrap font-mono">
            {message}
          </p>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 pb-5">
          <p className="text-[11px] text-zinc-700">
            Edit as needed before sending
          </p>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy Message'}
          </button>
        </div>
      </div>
    </>
  )
}
