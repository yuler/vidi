import { promises as fs } from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { VideoItem } from '../../shared/types'
import { dataFile } from './store'

const execFileAsync = promisify(execFile)

const COVER_DIR = dataFile('covers')
const FFMPEG_CANDIDATES = ['ffmpeg', '/opt/homebrew/bin/ffmpeg', '/usr/local/bin/ffmpeg']
const FFPROBE_CANDIDATES = ['ffprobe', '/opt/homebrew/bin/ffprobe', '/usr/local/bin/ffprobe']
const COVER_CONCURRENCY = 3

let ffmpegPath: string | null = null
let ffprobePath: string | null = null

const inFlight = new Map<string, Promise<string | null>>()
const failed = new Set<string>()

let activeCovers = 0
const coverWaiters: Array<() => void> = []

function acquireCoverSlot(): Promise<void> {
  if (activeCovers < COVER_CONCURRENCY) {
    activeCovers++
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    coverWaiters.push(resolve)
  })
}

function releaseCoverSlot() {
  const next = coverWaiters.shift()
  if (next) {
    next()
    return
  }
  activeCovers--
}

async function resolveBin(candidates: string[]): Promise<string | null> {
  for (const bin of candidates) {
    try {
      await execFileAsync(bin, ['-version'], { timeout: 3000 })
      return bin
    } catch {
      // try next
    }
  }
  return null
}

async function getFfmpeg(): Promise<string | null> {
  if (ffmpegPath === null) ffmpegPath = await resolveBin(FFMPEG_CANDIDATES)
  return ffmpegPath
}

async function getFfprobe(): Promise<string | null> {
  if (ffprobePath === null) ffprobePath = await resolveBin(FFPROBE_CANDIDATES)
  return ffprobePath
}

async function probeDuration(fileAbs: string): Promise<number | null> {
  const ffprobe = await getFfprobe()
  if (!ffprobe) return null
  try {
    const { stdout } = await execFileAsync(
      ffprobe,
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', fileAbs],
      { timeout: 15000 },
    )
    const sec = Number(stdout.trim())
    return Number.isFinite(sec) && sec > 0 ? sec * 1000 : null
  } catch {
    return null
  }
}

async function extractFrame(fileAbs: string, durationMs: number, outAbs: string): Promise<boolean> {
  const ffmpeg = await getFfmpeg()
  if (!ffmpeg) return false
  const atSec = Math.max(1, Math.floor(durationMs * 0.1) / 1000)
  try {
    await execFileAsync(
      ffmpeg,
      [
        '-y',
        '-ss', String(atSec),
        '-i', fileAbs,
        '-frames:v', '1',
        '-vf', 'scale=640:-2',
        '-q:v', '5',
        outAbs,
      ],
      { timeout: 30000 },
    )
    return true
  } catch {
    return false
  }
}

function coverKey(video: VideoItem): string {
  const hash = createHash('sha1').update(`${video.path}:${Math.round(video.mtime)}`).digest('hex')
  return `${hash}.jpg`
}

export function coverPath(video: VideoItem): string {
  return path.join(COVER_DIR, coverKey(video))
}

async function generateCover(fileAbs: string, out: string): Promise<string | null> {
  await acquireCoverSlot()
  try {
    try {
      await fs.access(out)
      return out
    } catch {
      // still a miss after waiting for a slot
    }
    await fs.mkdir(COVER_DIR, { recursive: true })
    const duration = await probeDuration(fileAbs)
    if (duration === null) {
      failed.add(out)
      return null
    }
    const ok = await extractFrame(fileAbs, duration, out)
    if (!ok) {
      failed.add(out)
      return null
    }
    return out
  } finally {
    releaseCoverSlot()
  }
}

export async function getCoverPath(video: VideoItem, fileAbs: string): Promise<string | null> {
  const out = coverPath(video)
  try {
    await fs.access(out)
    return out
  } catch {
    // not cached yet
  }

  if (failed.has(out)) return null

  let pending = inFlight.get(out)
  if (!pending) {
    pending = generateCover(fileAbs, out)
    inFlight.set(out, pending)
    pending.finally(() => inFlight.delete(out)).catch(() => {})
  }
  return pending
}
