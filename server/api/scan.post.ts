import { rescan } from '../utils/refresh'

export default defineEventHandler(async () => {
  const index = await rescan()
  return {
    roots: index.roots,
    warnings: index.warnings,
    scannedAt: index.scannedAt,
  }
})
