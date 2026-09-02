import type { Course, ProgressEntry, ProgressMap, VideoItem } from './types'

export function progressKey(courseSlug: string, videoPath: string) {
  return `${courseSlug}:${videoPath}`
}

export function progressEntry(
  map: ProgressMap | null | undefined,
  courseSlug: string,
  videoPath: string,
): ProgressEntry | undefined {
  if (!map) return undefined
  return map[progressKey(courseSlug, videoPath)] ?? map[videoPath]
}

export function matchProgressVideo(
  key: string,
  courses: Course[],
): { course: Course; video: VideoItem } | undefined {
  for (const course of courses) {
    const prefix = `${course.slug}:`
    if (key.startsWith(prefix)) {
      const videoPath = key.slice(prefix.length)
      const video = course.videos.find((v) => v.path === videoPath)
      if (video) return { course, video }
    }
  }
  for (const course of courses) {
    const video = course.videos.find((v) => v.path === key)
    if (video) return { course, video }
  }
}

export function migrateProgressKeys(
  map: ProgressMap,
  courses: Course[],
): { map: ProgressMap; changed: boolean } {
  const pathToSlugs = new Map<string, string[]>()
  const prefixed = new Set<string>()
  for (const course of courses) {
    for (const video of course.videos) {
      const slugs = pathToSlugs.get(video.path) ?? []
      slugs.push(course.slug)
      pathToSlugs.set(video.path, slugs)
      prefixed.add(progressKey(course.slug, video.path))
    }
  }

  let changed = false
  const next: ProgressMap = { ...map }
  for (const [key, entry] of Object.entries(map)) {
    if (prefixed.has(key)) continue
    const slugs = pathToSlugs.get(key)
    if (!slugs || slugs.length !== 1) continue
    const slug = slugs[0]
    if (!slug) continue
    const dest = progressKey(slug, key)
    const existing = next[dest]
    if (!existing || existing.updatedAt <= entry.updatedAt) {
      next[dest] = entry
    }
    delete next[key]
    changed = true
  }
  return { map: next, changed }
}
