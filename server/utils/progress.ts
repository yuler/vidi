import type { ProgressMap } from '../../shared/types'
import { migrateProgressKeys } from '../../shared/progress'
import { getCoursesIndex } from './cache'
import { readJson, writeJson } from './store'

let memory: ProgressMap | null = null
let writeTimer: ReturnType<typeof setTimeout> | null = null
let pendingWrite: Promise<void> | null = null
let dirty = false

async function load(): Promise<ProgressMap> {
  if (memory) return memory
  const loaded = await readJson<ProgressMap>('progress.json', {})
  const index = await getCoursesIndex()
  const courses = index.roots.flatMap((root) => root.courses)
  const { map, changed } = migrateProgressKeys(loaded, courses)
  memory = map
  if (changed) scheduleWrite()
  return memory
}

function scheduleWrite() {
  dirty = true
  if (writeTimer) clearTimeout(writeTimer)
  writeTimer = setTimeout(() => {
    writeTimer = null
    void runWrite()
  }, 1000)
}

function runWrite(): Promise<void> {
  if (pendingWrite) {
    return pendingWrite.then(() => {
      if (dirty && !writeTimer) return runWrite()
    })
  }
  if (!dirty || !memory) return Promise.resolve()
  dirty = false
  pendingWrite = writeJson('progress.json', memory).finally(() => {
    pendingWrite = null
  })
  return pendingWrite.then(() => {
    if (dirty && !writeTimer) return runWrite()
  })
}

export async function getProgress(): Promise<ProgressMap> {
  return load()
}

export async function setProgress(key: string, entry: { position: number; duration: number; updatedAt: number }) {
  const map = await load()
  map[key] = entry
  scheduleWrite()
}

export async function flushProgress() {
  if (writeTimer) {
    clearTimeout(writeTimer)
    writeTimer = null
  }
  await runWrite()
}
