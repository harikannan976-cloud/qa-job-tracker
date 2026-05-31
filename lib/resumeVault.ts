export interface ResumeRecord {
  id:            string   // uuid
  name:          string   // display name, e.g. "QA Engineer - Tailored"
  googleDriveUrl: string  // direct-download Google Drive URL
  uploadDate:    string   // ISO date string
  isDefault:     boolean
  targetRole:    string   // optional, e.g. "QA Automation Engineer"
  notes:         string   // optional free text
}

const STORAGE_KEY = 'qa_tracker_resumes'

export function loadResumes(): ResumeRecord[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as ResumeRecord[]
  } catch {
    return []
  }
}

export function saveResumes(resumes: ResumeRecord[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(resumes))
}

export function addResume(resume: Omit<ResumeRecord, 'id' | 'uploadDate'>): ResumeRecord[] {
  const resumes = loadResumes()
  const newRecord: ResumeRecord = {
    ...resume,
    id:         crypto.randomUUID(),
    uploadDate: new Date().toISOString().split('T')[0],
  }
  // If this is the first resume or marked default, clear other defaults
  const updated = resume.isDefault
    ? resumes.map(r => ({ ...r, isDefault: false }))
    : resumes
  const next = [...updated, newRecord]
  saveResumes(next)
  return next
}

export function updateResume(id: string, patch: Partial<Omit<ResumeRecord, 'id'>>): ResumeRecord[] {
  const resumes = loadResumes()
  const next = resumes.map(r => {
    if (r.id !== id) return patch.isDefault ? { ...r, isDefault: false } : r
    return { ...r, ...patch }
  })
  saveResumes(next)
  return next
}

export function deleteResume(id: string): ResumeRecord[] {
  const resumes = loadResumes()
  const next = resumes.filter(r => r.id !== id)
  // If deleted resume was default, promote the first remaining one
  if (next.length > 0 && !next.some(r => r.isDefault)) {
    next[0].isDefault = true
  }
  saveResumes(next)
  return next
}

export function setDefaultResume(id: string): ResumeRecord[] {
  const resumes = loadResumes()
  const next = resumes.map(r => ({ ...r, isDefault: r.id === id }))
  saveResumes(next)
  return next
}

export function getDefaultResume(): ResumeRecord | null {
  const resumes = loadResumes()
  return resumes.find(r => r.isDefault) ?? resumes[0] ?? null
}
