'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Star, ExternalLink, FileText, Edit2, Check, X } from 'lucide-react'
import {
  loadResumes, addResume, updateResume, deleteResume, setDefaultResume,
  type ResumeRecord,
} from '@/lib/resumeVault'

const INPUT = 'w-full bg-[#0d0d14] border border-[#1f1f2e] rounded-lg px-3 py-2 text-[12px] text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20'

const EMPTY: Omit<ResumeRecord, 'id' | 'uploadDate'> = {
  name:           '',
  googleDriveUrl: '',
  isDefault:      false,
  targetRole:     '',
  notes:          '',
}

function AddResumeForm({ onAdd, onCancel }: { onAdd: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({ ...EMPTY })

  function patch(p: Partial<typeof EMPTY>) { setForm(f => ({ ...f, ...p })) }

  function handleAdd() {
    if (!form.name.trim()) { toast.error('Resume name is required'); return }
    if (!form.googleDriveUrl.trim()) { toast.error('Google Drive URL is required'); return }
    addResume(form)
    toast.success(`"${form.name}" added to vault`)
    onAdd()
  }

  return (
    <div className="bg-[#0d0d14] border border-indigo-500/20 rounded-xl p-4 space-y-3">
      <p className="text-[12px] font-semibold text-indigo-400">Add Resume</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">Resume Name *</p>
          <input className={INPUT} value={form.name} placeholder='e.g. "QA Engineer — Tailored"'
            onChange={e => patch({ name: e.target.value })} />
        </div>
        <div>
          <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">Target Role</p>
          <input className={INPUT} value={form.targetRole} placeholder="QA Automation Engineer"
            onChange={e => patch({ targetRole: e.target.value })} />
        </div>
      </div>

      <div>
        <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">Google Drive Direct-Download URL *</p>
        <input className={INPUT} type="url" value={form.googleDriveUrl}
          placeholder="https://drive.google.com/uc?export=download&id=..."
          onChange={e => patch({ googleDriveUrl: e.target.value })} />
        <p className="text-[10px] text-zinc-700 mt-1">
          In Google Drive: right-click the PDF → Get link → copy, then change <span className="font-mono">/file/d/ID/view</span> to <span className="font-mono">/uc?export=download&id=ID</span>
        </p>
      </div>

      <div>
        <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">Notes</p>
        <input className={INPUT} value={form.notes} placeholder="Optional notes"
          onChange={e => patch({ notes: e.target.value })} />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          role="switch"
          aria-checked={form.isDefault}
          onClick={() => patch({ isDefault: !form.isDefault })}
          className={`relative w-8 h-4 rounded-full overflow-hidden transition-colors ${form.isDefault ? 'bg-indigo-600' : 'bg-[#252535]'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform duration-150 ${form.isDefault ? 'translate-x-4' : 'translate-x-0'}`} />
        </button>
        <span className="text-[12px] text-zinc-400">Set as default resume</span>
      </div>

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={handleAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[12px] font-semibold rounded-lg transition-colors">
          <Check className="w-3 h-3" /> Add Resume
        </button>
        <button type="button" onClick={onCancel}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1a26] hover:bg-[#20202e] border border-[#2a2a3e] text-zinc-400 hover:text-zinc-200 text-[12px] rounded-lg transition-all">
          <X className="w-3 h-3" /> Cancel
        </button>
      </div>
    </div>
  )
}

function ResumeRow({ resume, onUpdate }: { resume: ResumeRecord; onUpdate: () => void }) {
  const [editing, setEditing] = useState(false)
  const [name, setName]       = useState(resume.name)

  function handleSetDefault() {
    setDefaultResume(resume.id)
    toast.success(`"${resume.name}" set as default`)
    onUpdate()
  }

  function handleDelete() {
    deleteResume(resume.id)
    toast.success(`"${resume.name}" removed`)
    onUpdate()
  }

  function handleRename() {
    if (!name.trim()) return
    updateResume(resume.id, { name: name.trim() })
    setEditing(false)
    onUpdate()
  }

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
      resume.isDefault
        ? 'bg-indigo-500/5 border-indigo-500/20'
        : 'bg-[#111118] border-[#1a1a26] hover:border-[#252535]'
    }`}>
      <div className="w-8 h-8 rounded-lg bg-[#16161e] border border-[#252535] flex items-center justify-center flex-shrink-0">
        <FileText className="w-4 h-4 text-zinc-500" />
      </div>

      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="flex items-center gap-1.5">
            <input
              className="flex-1 bg-[#0d0d14] border border-indigo-500/40 rounded px-2 py-0.5 text-[12px] text-zinc-300 focus:outline-none"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditing(false) }}
              autoFocus
            />
            <button type="button" onClick={handleRename} className="text-emerald-400 hover:text-emerald-300"><Check className="w-3.5 h-3.5" /></button>
            <button type="button" onClick={() => setEditing(false)} className="text-zinc-600 hover:text-zinc-400"><X className="w-3.5 h-3.5" /></button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium text-zinc-200 truncate">{resume.name}</span>
            {resume.isDefault && (
              <span className="flex-shrink-0 text-[9px] font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 px-1.5 py-0.5 rounded-full uppercase tracking-wider">Default</span>
            )}
          </div>
        )}
        <div className="flex items-center gap-2 mt-0.5">
          {resume.targetRole && <span className="text-[10px] text-zinc-600">{resume.targetRole}</span>}
          <span className="text-[10px] text-zinc-700">{resume.uploadDate}</span>
        </div>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <a href={resume.googleDriveUrl} target="_blank" rel="noopener noreferrer"
          title="Open in Drive"
          className="p-1.5 text-zinc-600 hover:text-zinc-300 transition-colors rounded-lg hover:bg-[#1a1a26]">
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
        <button type="button" onClick={() => setEditing(true)} title="Rename"
          className="p-1.5 text-zinc-600 hover:text-zinc-300 transition-colors rounded-lg hover:bg-[#1a1a26]">
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        {!resume.isDefault && (
          <button type="button" onClick={handleSetDefault} title="Set as default"
            className="p-1.5 text-zinc-600 hover:text-amber-400 transition-colors rounded-lg hover:bg-[#1a1a26]">
            <Star className="w-3.5 h-3.5" />
          </button>
        )}
        <button type="button" onClick={handleDelete} title="Remove"
          className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors rounded-lg hover:bg-[#1a1a26]">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

export default function ResumeVault() {
  const [resumes, setResumes]   = useState<ResumeRecord[]>([])
  const [adding, setAdding]     = useState(false)

  function refresh() { setResumes(loadResumes()) }
  useEffect(refresh, [])

  return (
    <div className="space-y-4">
      {resumes.length === 0 && !adding ? (
        <div className="flex flex-col items-center justify-center py-12 bg-[#111118] border border-dashed border-[#252535] rounded-xl text-center">
          <div className="w-10 h-10 rounded-xl bg-[#16161e] border border-[#252535] flex items-center justify-center mb-3">
            <FileText className="w-5 h-5 text-zinc-700" />
          </div>
          <p className="text-[13px] font-medium text-zinc-500 mb-1">No resumes yet</p>
          <p className="text-[11px] text-zinc-700 max-w-[200px] leading-relaxed">
            Add a Google Drive link to your default resume to use with Apply Assistant
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {resumes.map(r => (
            <ResumeRow key={r.id} resume={r} onUpdate={refresh} />
          ))}
        </div>
      )}

      {adding ? (
        <AddResumeForm onAdd={() => { setAdding(false); refresh() }} onCancel={() => setAdding(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#111118] hover:bg-[#16161e] border border-dashed border-[#252535] hover:border-indigo-500/30 text-zinc-500 hover:text-indigo-400 text-[12px] font-medium rounded-xl transition-all w-full justify-center"
        >
          <Plus className="w-3.5 h-3.5" /> Add Resume
        </button>
      )}

      <div className="p-3 bg-[#0d0d14] border border-[#1a1a26] rounded-xl">
        <p className="text-[10px] text-zinc-700 leading-relaxed">
          <span className="text-zinc-500 font-medium">Resume Vault stores links only.</span> Your PDF lives in Google Drive — paste a direct-download link above. The Apply Assistant extension will fetch and use the default resume when autofilling applications.
        </p>
      </div>
    </div>
  )
}
