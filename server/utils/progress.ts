import type { ProgressMap } from '../../shared/types'
import { readJson, writeJson } from './store'

let memory: ProgressMap | null = null
let writeTimer: ReturnType<typeof setTimeout> | null = null
let pendingWrite: Promise<void> | null = null

async function load(): Promise<ProgressMap> {
  if (memory) return memory
  const loaded = await readJson<ProgressMap>('progress.json', {})
  memory = loaded
  return memory
}

function scheduleWrite() {
  if (writeTimer) clearTimeout(writeTimer)
  writeTimer = setTimeout(() => {
    if (pendingWrite) return
    pendingWrite = writeJson('progress.json', memory ?? {}).finally(() => {
      pendingWrite = null
    })
  }, 1000)
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
  if (writeTimer) clearTimeout(writeTimer)
  if (pendingWrite) return pendingWrite
  if (memory) {
    pendingWrite = writeJson('progress.json', memory).finally(() => {
      pendingWrite = null
    })
    return pendingWrite
  }
}
