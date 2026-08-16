import { promises as fs } from 'node:fs'
import path from 'node:path'

const dataDir = path.resolve(process.cwd(), 'data')

export function dataFile(name: string) {
  return path.join(dataDir, name)
}

export async function ensureDataDir() {
  await fs.mkdir(dataDir, { recursive: true })
}

export async function readJson<T>(name: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(dataFile(name), 'utf-8')
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export async function writeJson(name: string, data: unknown) {
  await ensureDataDir()
  const target = dataFile(name)
  const tmp = `${target}.${process.pid}.tmp`
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf-8')
  await fs.rename(tmp, target)
}
