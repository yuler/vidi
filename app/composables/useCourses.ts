import type { Course, ProgressMap, ScanWarning } from '~~/shared/types'

export interface CoursesResponse {
  roots: { dir: string; courses: Course[] }[]
  warnings: ScanWarning[]
  scannedAt: number
}

export function useCourses() {
  const { data, status, refresh, error } = useFetch<CoursesResponse>('/api/courses')

  const flatCourses = computed<Course[]>(() => {
    const list: Course[] = []
    for (const root of data.value?.roots ?? []) {
      list.push(...(root.courses ?? []))
    }
    return list
  })

  return { data, flatCourses, status, refresh, error }
}

export function useProgress() {
  const { data: progress, refresh } = useFetch<ProgressMap>('/api/progress')
  return { progress, refresh }
}
