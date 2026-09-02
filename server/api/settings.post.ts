import { saveSettings } from '../utils/cache'
import { rescan } from '../utils/refresh'
import { validateLibraryRoot } from '../utils/roots'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ roots?: string[]; autoNext?: boolean }>(event)

  let roots = Array.isArray(body?.roots)
    ? body.roots.map((r) => String(r).trim()).filter(Boolean)
    : undefined
  const autoNext = typeof body?.autoNext === 'boolean' ? body.autoNext : undefined

  if (roots && roots.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'At least one root directory is required' })
  }

  if (roots) {
    const validated: string[] = []
    const seen = new Set<string>()
    for (const root of roots) {
      const result = await validateLibraryRoot(root)
      if (!result.ok) {
        throw createError({ statusCode: 400, statusMessage: result.message })
      }
      if (seen.has(result.path)) continue
      seen.add(result.path)
      validated.push(result.path)
    }
    roots = validated
  }

  const settings = await saveSettings({ roots, autoNext })
  await rescan()
  return settings
})
