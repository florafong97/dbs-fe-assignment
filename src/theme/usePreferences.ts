import { useEffect, useState } from 'react'
import type { Segment } from '@/api/types'

type Theme = 'light' | 'dark'

// Keep these keys in sync with public/preferences.js.
const THEME_KEY = 'meridian.theme.v1'
const SEGMENT_KEY = 'meridian.segment.v1'

function readSavedSegment(): Segment | null {
  try {
    const value = localStorage.getItem(SEGMENT_KEY)
    return value === 'retail' || value === 'premium' ? value : null
  } catch {
    return null
  }
}

function persist(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Preferences still work for this session if storage is unavailable.
  }
}

export function usePreferences(defaultSegment: Segment = 'retail') {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
  )
  const [segmentOverride, setSegmentOverride] = useState(readSavedSegment)
  const segment = segmentOverride ?? defaultSegment

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.dataset.segment = segment
  }, [theme, segment])

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    persist(THEME_KEY, next)
  }

  function selectSegment(next: Segment) {
    setSegmentOverride(next)
    persist(SEGMENT_KEY, next)
  }

  return { theme, segment, toggleTheme, selectSegment }
}
