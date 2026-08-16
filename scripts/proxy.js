import net from 'node:net'

const upstream = process.env.UPSTREAM || '127.0.0.1:8080'
const [host, portStr] = upstream.split(':')
const port = Number(portStr) || 8080

net
  .createServer((client) => {
    const server = net.connect(port, host)
    client.pipe(server)
    server.pipe(client)
    client.on('error', () => server.destroy())
    server.on('error', () => client.destroy())
  })
  .listen(80, () => {
    console.log(`proxy 80 -> ${upstream}`)
  })
