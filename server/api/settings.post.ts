import { saveSettings } from '../utils/cache'
import { rescan } from '../utils/refresh'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ roots?: string[]; autoNext?: boolean }>(event)

  const roots = Array.isArray(body?.roots)
    ? body.roots.map((r) => String(r).trim()).filter(Boolean)
    : undefined
  const autoNext = typeof body?.autoNext === 'boolean' ? body.autoNext : undefined

  if (roots && roots.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'At least one root directory is required' })
  }

  const settings = await saveSettings({ roots, autoNext })
  await rescan()
  return settings
})
