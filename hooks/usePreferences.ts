'use client'

import { useState, useCallback } from 'react'
import {
  UserPreferences,
  PREFERENCE_DEFAULTS,
  loadPreferences,
  savePreferences,
  resetPreferences,
  validatePreferences,
} from '@/lib/preferences'

export function usePreferences() {
  const [prefs, setPrefs] = useState<UserPreferences>(loadPreferences)

  const save = useCallback((next: UserPreferences): string | null => {
    const err = validatePreferences(next)
    if (err) return err
    savePreferences(next)
    setPrefs(next)
    return null
  }, [])

  const reset = useCallback((): UserPreferences => {
    resetPreferences()
    const defaults = { ...PREFERENCE_DEFAULTS }
    setPrefs(defaults)
    return defaults
  }, [])

  return { prefs, setPrefs, save, reset }
}
