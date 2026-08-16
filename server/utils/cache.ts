import type { CoursesIndex, Settings } from '../../shared/types'
import { readJson, writeJson } from './store'

export const DEFAULT_SETTINGS: Settings = {
  roots: ['/Volumes/ToshibaSSD/英语资料'],
  autoNext: false,
}

let settingsCache: Settings | null = null

export async function getSettings(): Promise<Settings> {
  if (settingsCache) return settingsCache
  const loaded = await readJson<Settings>('settings.json', DEFAULT_SETTINGS)
  settingsCache = { ...DEFAULT_SETTINGS, ...loaded }
  return settingsCache
}

export async function saveSettings(next: Partial<Settings>) {
  const current = await getSettings()
  const merged: Settings = {
    roots: next.roots ?? current.roots,
    autoNext: next.autoNext ?? current.autoNext,
  }
  settingsCache = merged
  await writeJson('settings.json', merged)
  return merged
}

let indexCache: CoursesIndex | null = null

export async function getCoursesIndex(): Promise<CoursesIndex> {
  if (indexCache) return indexCache
  const loaded = await readJson<CoursesIndex>('courses.json', {
    scannedAt: 0,
    roots: [],
    warnings: [],
  })
  indexCache = loaded
  return indexCache
}

export async function setCoursesIndex(index: CoursesIndex) {
  indexCache = index
  await writeJson('courses.json', index)
}
