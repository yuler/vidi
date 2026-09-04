import net from 'node:net'

const upstream = process.env.UPSTREAM || '127.0.0.1:8080'
const [host, portS] = upstream.split(':')
const port = Number.parseInt(portS || '8080', 10)
const listenPort = Number.parseInt(process.env.LISTEN_PORT || '80', 10)

const server = net.createServer((client) => {
  const up = net.connect({ host, port })
  up.once('connect', () => {
    client.pipe(up)
    up.pipe(client)
  })
  up.on('error', () => {
    client.destroy()
  })
  client.on('error', () => {
    up.destroy()
  })
})

server.on('error', (err) => {
  console.error(err)
  process.exit(1)
})

server.listen(listenPort, '0.0.0.0', () => {
  console.log(`proxy ${listenPort} -> ${upstream}`)
})
