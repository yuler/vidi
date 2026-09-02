import { promises as fs } from 'node:fs'
import type { CoursesIndex } from '../../shared/types'
import { getCoursesIndex, getSettings, setCoursesIndex } from './cache'
import { scanRoots } from './scan'

const MTIME_COOLDOWN_MS = 5000

let rescanRunning: Promise<CoursesIndex> | null = null
let mtimeCheckRunning: Promise<CoursesIndex> | null = null
let lastMtimeCheckAt = 0

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

async function checkMtimes(index: CoursesIndex): Promise<CoursesIndex> {
  if (mtimeCheckRunning) return mtimeCheckRunning

  const now = Date.now()
  if (now - lastMtimeCheckAt < MTIME_COOLDOWN_MS) {
    return index
  }
  lastMtimeCheckAt = now

  mtimeCheckRunning = (async () => {
    const changed = await Promise.all(index.roots.map(dirChanged))
    if (changed.some(Boolean)) {
      return rescan()
    }
    return index
  })().finally(() => {
    mtimeCheckRunning = null
  })
  return mtimeCheckRunning
}

export async function ensureFreshIndex(opts?: { skipMtimeWalk?: boolean }): Promise<CoursesIndex> {
  const settings = await getSettings()
  const index = await getCoursesIndex()

  const rootsMatch =
    index.roots.length === settings.roots.length &&
    index.roots.every((r, i) => r.dir === settings.roots[i])

  if (!rootsMatch) {
    return rescan()
  }

  if (opts?.skipMtimeWalk && index.scannedAt > 0) {
    return index
  }

  return checkMtimes(index)
}

export function rescan(): Promise<CoursesIndex> {
  if (rescanRunning) return rescanRunning
  rescanRunning = (async () => {
    const settings = await getSettings()
    const index = await scanRoots(settings.roots)
    await setCoursesIndex(index)
    lastMtimeCheckAt = Date.now()
    return index
  })().finally(() => {
    rescanRunning = null
  })
  return rescanRunning
}
