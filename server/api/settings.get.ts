import { getSettings } from '../utils/cache'

export default defineEventHandler(async () => {
  const settings = await getSettings()
  return {
    roots: settings.roots,
    autoNext: settings.autoNext,
    defaultRoot: '/Volumes/ToshibaSSD/英语资料',
  }
})
