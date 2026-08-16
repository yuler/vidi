import { getProgress } from '../utils/progress'

export default defineEventHandler(async () => {
  return getProgress()
})
