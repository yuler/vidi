import path from 'node:path'
import type { CoursesIndex, Course, VideoItem } from '../../shared/types'
import { isInsideAnyRoot, isInsideRoot } from './roots'

export interface Segment {
  rootIndex: number
  courseDir: string
  relPath: string
}

function isUnsafeSegment(value: string): boolean {
  if (!value || value.includes('\0')) return true
  return value.split(/[\\/]/).some((part) => part === '..' || part === '.')
}

export function parseSegment(params: string[]): Segment | null {
  const parts = params ?? []
  if (parts.length < 3) return null
  if (parts.some((p) => p === '..' || p === '.' || p.includes('\0'))) return null
  const rootIndex = Number(parts[0])
  if (!Number.isInteger(rootIndex) || rootIndex < 0) return null
  const courseDir = decodeURIComponent(parts[1] ?? '')
  const relPath = parts.slice(2).map(decodeURIComponent).join('/')
  if (!courseDir || !relPath) return null
  if (isUnsafeSegment(courseDir) || isUnsafeSegment(relPath)) return null
  return { rootIndex, courseDir, relPath }
}

export function findVideo(index: CoursesIndex, seg: Segment): VideoItem | null {
  const root = index.roots[seg.rootIndex]
  if (!root) return null
  const course: Course | undefined = root.courses.find((c) => c.dir === seg.courseDir)
  if (!course) return null
  return course.videos.find((v) => v.path === seg.relPath) ?? null
}

export function videoFileAbs(
  index: CoursesIndex,
  seg: Segment,
  video: VideoItem,
  allowedRoots?: string[],
): string | null {
  const rootDir = index.roots[seg.rootIndex]?.dir
  if (!rootDir) return null
  if (isUnsafeSegment(seg.courseDir) || isUnsafeSegment(video.path)) return null
  const file = path.resolve(rootDir, seg.courseDir, video.path)
  if (!isInsideRoot(file, rootDir)) return null
  if (allowedRoots && !isInsideAnyRoot(file, allowedRoots)) return null
  return file
}
