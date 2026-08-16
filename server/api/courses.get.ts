import { ensureFreshIndex } from '../utils/refresh'

export default defineEventHandler(async () => {
  const index = await ensureFreshIndex()
  return {
    roots: index.roots,
    warnings: index.warnings,
    scannedAt: index.scannedAt,
  }
})
