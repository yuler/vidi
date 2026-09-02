import { promises as fsp } from 'node:fs'
import fs from 'node:fs'
import path from 'node:path'
import { ensureFreshIndex } from '../../utils/refresh'
import { findVideo, parseSegment, videoFileAbs } from '../../utils/video'

const MIME_TYPES: Record<string, string> = {
  mp4: 'video/mp4',
  mkv: 'video/x-matroska',
  webm: 'video/webm',
  mov: 'video/quicktime',
  avi: 'video/x-msvideo',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  wav: 'audio/wav',
}

export default defineEventHandler(async (event) => {
  const params = getRouterParam(event, 'path')?.split('/') ?? []
  const seg = parseSegment(params)
  if (!seg) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  const rangeHeader = getHeader(event, 'range')
  const index = await ensureFreshIndex({ skipMtimeWalk: Boolean(rangeHeader) })
  const video = findVideo(index, seg)
  if (!video) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  const filePath = videoFileAbs(index, seg, video)
  const ext = path.extname(video.path).toLowerCase().slice(1)
  const contentType = MIME_TYPES[ext] ?? 'application/octet-stream'

  let stat
  try {
    stat = await fsp.stat(filePath)
  } catch {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  const fileSize = stat.size

  if (!rangeHeader) {
    setHeader(event, 'Content-Type', contentType)
    setHeader(event, 'Content-Length', fileSize)
    setHeader(event, 'Accept-Ranges', 'bytes')
    return sendStream(event, fs.createReadStream(filePath))
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader)
  if (!match) {
    throw createError({ statusCode: 416, statusMessage: 'Range Not Satisfiable' })
  }

  let start = match[1] ? Number(match[1]) : undefined
  let end = match[2] ? Number(match[2]) : undefined

  if (start === undefined) {
    if (end === undefined) {
      throw createError({ statusCode: 416, statusMessage: 'Range Not Satisfiable' })
    }
    const suffixLength = Math.min(end, fileSize)
    start = Math.max(fileSize - suffixLength, 0)
    end = fileSize - 1
  } else if (end === undefined) {
    end = fileSize - 1
  }

  if (start > end || start >= fileSize) {
    setResponseStatus(event, 416)
    setHeader(event, 'Content-Range', `bytes */${fileSize}`)
    return null
  }

  if (end >= fileSize) end = fileSize - 1
  const chunkSize = end - start + 1

  setResponseStatus(event, 206)
  setHeader(event, 'Content-Type', contentType)
  setHeader(event, 'Content-Range', `bytes ${start}-${end}/${fileSize}`)
  setHeader(event, 'Accept-Ranges', 'bytes')
  setHeader(event, 'Content-Length', chunkSize)

  return sendStream(event, fs.createReadStream(filePath, { start, end }))
})
