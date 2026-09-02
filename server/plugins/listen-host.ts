export default defineNitroPlugin(() => {
  if (process.env.NODE_ENV !== 'production') return
  if (process.env.NITRO_HOST || process.env.HOST) return
  process.env.HOST = '127.0.0.1'
})
