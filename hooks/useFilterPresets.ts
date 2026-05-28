'use client'

import { useState, useCallback } from 'react'
import { Filters } from './useJobSearch'

export interface FilterPreset {
  id:       string
  name:     string
  filters:  Partial<Filters>
  builtIn?: boolean
}

const BUILT_INS: FilterPreset[] = [
  { id: 'remote',     name: '🌐 Remote Roles',      filters: { remote: 'remote' },           builtIn: true },
  { id: 'high-match', name: '⭐ High Match (7+)',    filters: { highMatchOnly: true },         builtIn: true },
  { id: 'has-cl',     name: '📝 Has Cover Letter',  filters: { hasCoverLetter: true },        builtIn: true },
  { id: 'needs-review', name: '🔍 Needs Review',    filters: { statuses: ['New'] },           builtIn: true },
  { id: 'interviewing', name: '🎯 In Progress',      filters: { statuses: ['Interviewing', 'Applied'] }, builtIn: true },
]

const LS_KEY = 'qa_tracker_presets'

function loadCustom(): FilterPreset[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]') } catch { return [] }
}

function persist(presets: FilterPreset[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(presets)) } catch { /* noop */ }
}

export function useFilterPresets() {
  const [custom, setCustom] = useState<FilterPreset[]>(loadCustom)
  const presets = [...BUILT_INS, ...custom]

  const savePreset = useCallback((name: string, filters: Partial<Filters>) => {
    setCustom(prev => {
      const next = [...prev, { id: crypto.randomUUID(), name, filters }]
      persist(next)
      return next
    })
  }, [])

  const deletePreset = useCallback((id: string) => {
    setCustom(prev => {
      const next = prev.filter(p => p.id !== id)
      persist(next)
      return next
    })
  }, [])

  return { presets, savePreset, deletePreset }
}
