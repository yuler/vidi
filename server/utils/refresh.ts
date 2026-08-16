import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { CoursesIndex } from '../../shared/types'
import { getCoursesIndex, getSettings, setCoursesIndex } from './cache'
import { scanRoots } from './scan'

let rescanRunning: Promise<CoursesIndex> | null = null

function dirChanged(root: CoursesIndex['roots'][number]): Promise<boolean> {
  const mtimes = root.dirMtimes
  const dirs = Object.keys(mtimes)
  const checks = dirs.map(async (dir) => {
    try {
      const stat = await fs.stat(dir)
      const prev = mtimes[dir] ?? 0
      return Math.round(stat.mtimeMs) !== Math.round(prev)
    } catch {
      return true
    }
  })
  return Promise.all(checks).then((results) => results.some(Boolean))
}

export async function ensureFreshIndex(): Promise<CoursesIndex> {
  const settings = await getSettings()
  const index = await getCoursesIndex()

  const rootsMatch =
    index.roots.length === settings.roots.length &&
    index.roots.every((r, i) => r.dir === settings.roots[i])

  if (!rootsMatch) {
    return rescan()
  }

  const changed = await Promise.all(index.roots.map(dirChanged))
  if (changed.some(Boolean)) {
    return rescan()
  }

  return index
}

export function rescan(): Promise<CoursesIndex> {
  if (rescanRunning) return rescanRunning
  rescanRunning = (async () => {
    const settings = await getSettings()
    const index = await scanRoots(settings.roots)
    await setCoursesIndex(index)
    return index
  })().finally(() => {
    rescanRunning = null
  })
  return rescanRunning
}
