export interface VideoItem {
  path: string
  title: string
  type: 'video' | 'audio'
  group?: string
  size: number
  mtime: number
}

export interface Course {
  slug: string
  title: string
  dir: string
  rootIndex: number
  videoCount: number
  groups: string[]
  videos: VideoItem[]
}

export interface ProgressEntry {
  position: number
  duration: number
  updatedAt: number
  completed?: boolean
}

export type ProgressMap = Record<string, ProgressEntry>

export interface ScanWarning {
  type: 'deep' | 'duplicate' | 'unsorted'
  message: string
}

export interface Settings {
  roots: string[]
  autoNext: boolean
}

export interface CoursesIndex {
  scannedAt: number
  roots: {
    dir: string
    dirMtimes: Record<string, number>
    courses: Course[]
  }[]
  warnings: ScanWarning[]
}
