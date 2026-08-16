import { promises as fsp } from 'node:fs'
import fs from 'node:fs'
import { getCoursesIndex } from '../../utils/cache'
import { ensureFreshIndex } from '../../utils/refresh'
import { getCoverPath } from '../../utils/cover'
import { findVideo, parseSegment, videoFileAbs } from '../../utils/video'

export default defineEventHandler(async (event) => {
  const params = getRouterParam(event, 'path')?.split('/') ?? []
  const seg = parseSegment(params)
  if (!seg) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  await ensureFreshIndex()
  const index = await getCoursesIndex()
  const video = findVideo(index, seg)
  if (!video || video.type === 'audio') {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  const fileAbs = videoFileAbs(index, seg, video)
  const cover = await getCoverPath(video, fileAbs)
  if (!cover) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  setHeader(event, 'Content-Type', 'image/jpeg')
  setHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable')
  const size = await fsp.stat(cover).then((s) => s.size).catch(() => 0)
  if (size > 0) setHeader(event, 'Content-Length', size)

  return sendStream(event, fs.createReadStream(cover))
})
