import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { Course, CoursesIndex, ScanWarning, VideoItem } from '../../shared/types'

const collator = new Intl.Collator('zh-Hans-CN', { numeric: true, sensitivity: 'base' })

const VIDEO_EXTS = new Set(['.mp4', '.mkv', '.webm', '.mov', '.avi'])
const AUDIO_EXTS = new Set(['.mp3', '.m4a', '.aac', '.wav'])
const MAX_LEVEL = 3

function isDirty(name: string) {
  if (name.startsWith('._')) return true
  if (name.startsWith('.')) return true
  if (name.includes('.downloading')) return true
  return false
}

function titleFromFile(name: string) {
  return name.replace(/\.[^.]+$/, '').trim()
}

function findDuplicateTwins(videos: VideoItem[]): string[][] {
  const byBase = new Map<string, VideoItem[]>()
  for (const v of videos) {
    const base = v.title.replace(/\s*\(\d+\)\s*$/, '').trim()
    const list = byBase.get(base) ?? []
    list.push(v)
    byBase.set(base, list)
  }
  const pairs: string[][] = []
  for (const [, list] of byBase) {
    if (list.length > 1) {
      pairs.push(list.map((v) => v.title))
    }
  }
  return pairs
}

function courseTitle(dirName: string) {
  return dirName.replace(/^\s*\d+[.\-、]\s*/, '').trim() || dirName
}

function courseSlug(rootIndex: number, courseName: string) {
  return `${rootIndex}-${courseName}`
}

interface WalkResult {
  videos: VideoItem[]
  groups: Map<string, WalkResult>
  dirMtimes: Record<string, number>
}

async function walkCourse(
  courseAbs: string,
  courseName: string,
  warnings: ScanWarning[],
): Promise<{ videos: VideoItem[]; groups: Map<string, WalkResult>; dirMtimes: Record<string, number> }> {
  const dirMtimes: Record<string, number> = {}

  async function walk(dirAbs: string, level: number, groupPath: string[]): Promise<WalkResult> {
    let stat: { mtimeMs: number }
    try {
      stat = await fs.stat(dirAbs)
    } catch {
      return { videos: [], groups: new Map(), dirMtimes }
    }
    dirMtimes[dirAbs] = stat.mtimeMs

    const entries = await fs.readdir(dirAbs, { withFileTypes: true })
    const videos: VideoItem[] = []
    const groups = new Map<string, WalkResult>()

    const deferred: Promise<void>[] = []

    for (const entry of entries) {
      const abs = path.join(dirAbs, entry.name)
      if (isDirty(entry.name)) continue

      if (entry.isDirectory()) {
        const relSegments = path.relative(courseAbs, abs)
        const relLevel = relSegments.split(path.sep).length
        if (relLevel > MAX_LEVEL) {
          warnings.push({ type: 'deep', message: `超过3级：${relSegments}` })
          continue
        }
        deferred.push(
          walk(abs, level + 1, [...groupPath, entry.name]).then((sub) => {
            groups.set(entry.name, sub)
          }),
        )
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase()
        if (VIDEO_EXTS.has(ext) || AUDIO_EXTS.has(ext)) {
          const fileStat = await fs.stat(abs)
          videos.push({
            path: path.relative(courseAbs, abs),
            title: titleFromFile(entry.name),
            type: AUDIO_EXTS.has(ext) ? 'audio' : 'video',
            group: groupPath.length > 0 ? groupPath.join(' / ') : undefined,
            size: fileStat.size,
            mtime: fileStat.mtimeMs,
          })
        }
      }
    }

    await Promise.all(deferred)
    videos.sort((a, b) => collator.compare(a.title, b.title))
    return { videos, groups, dirMtimes }
  }

  return walk(courseAbs, 1, [])
}

function flattenGroups(groups: Map<string, WalkResult>): { name: string; videos: VideoItem[] }[] {
  const out: { name: string; videos: VideoItem[] }[] = []
  for (const [name, result] of groups) {
    if (result.videos.length === 0) continue
    out.push({ name, videos: result.videos })
  }
  return out.sort((a, b) => collator.compare(a.name, b.name))
}

export async function scanRoots(roots: string[]): Promise<CoursesIndex> {
  const warnings: ScanWarning[] = []
  const result: CoursesIndex['roots'] = []
  let scannedAt = 0

  for (let rootIndex = 0; rootIndex < roots.length; rootIndex++) {
    const rootDir = roots[rootIndex]!
    const dirMtimes: Record<string, number> = {}
    const courses: Course[] = []

    try {
      const stat = await fs.stat(rootDir)
      scannedAt = Math.max(scannedAt, stat.mtimeMs)
      dirMtimes[rootDir] = stat.mtimeMs

      const entries = await fs.readdir(rootDir, { withFileTypes: true })
      const courseDirs = entries
        .filter((e) => e.isDirectory() && !isDirty(e.name))
        .sort((a, b) => collator.compare(a.name, b.name))

      for (const entry of courseDirs) {
        const courseAbs = path.join(rootDir, entry.name)
        const courseName = entry.name
        const walked = await walkCourse(courseAbs, courseName, warnings)
        Object.assign(dirMtimes, walked.dirMtimes)

        const groups = flattenGroups(walked.groups)
        const flat = [...walked.videos]
        for (const g of groups) flat.push(...g.videos)
        flat.sort((a, b) => collator.compare(a.title, b.title))

        const dupPairs = findDuplicateTwins(flat)
        if (dupPairs.length > 0) {
          warnings.push({
            type: 'duplicate',
            message: `「${courseTitle(courseName)}」有 ${dupPairs.length} 组疑似重复文件（含 (1) 后缀），建议在源盘整理`,
          })
        }

        courses.push({
          slug: courseSlug(rootIndex, courseName),
          title: courseTitle(courseName),
          dir: courseName,
          rootIndex,
          videoCount: flat.length,
          groups: groups.map((g) => g.name),
          videos: flat,
        })
      }
    } catch (err: any) {
      warnings.push({ type: 'unsorted', message: `无法读取根目录 ${rootDir}: ${err.message}` })
    }

    result.push({ dir: rootDir, dirMtimes, courses })
  }

  return { scannedAt, roots: result, warnings }
}
