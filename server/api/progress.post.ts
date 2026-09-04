import { setProgress } from '../utils/progress'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ key?: string; position?: number; duration?: number; completed?: boolean }>(event)
  const key = body?.key
  const position = Number(body?.position)
  const duration = Number(body?.duration)
  if (!key || !Number.isFinite(position) || !Number.isFinite(duration) || position < 0 || duration <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid progress payload' })
  }
  await setProgress(key, {
    position,
    duration,
    updatedAt: Date.now(),
    ...(typeof body.completed === 'boolean' ? { completed: body.completed } : {}),
  })
  return { ok: true }
})
