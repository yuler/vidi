import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const BLOCKED_PREFIXES = [
  '/etc',
  '/usr',
  '/bin',
  '/sbin',
  '/var',
  '/dev',
  '/proc',
  '/sys',
  '/tmp',
  '/opt',
  '/root',
  '/boot',
  '/Library',
  '/Applications',
  '/cores',
  '/Network',
  '/private',
  '/System',
]

function isHomeDir(resolved: string, homeReal?: string): boolean {
  if (resolved === os.homedir()) return true
  if (homeReal && resolved === homeReal) return true
  if (/^\/Users\/[^/]+$/.test(resolved)) return true
  if (/^\/home\/[^/]+$/.test(resolved)) return true
  if (/^\/System\/Volumes\/Data\/Users\/[^/]+$/.test(resolved)) return true
  return false
}

function isUserLibraryPath(resolved: string): boolean {
  return (
    /^\/Users\/[^/]+\/.+/.test(resolved)
    || /^\/home\/[^/]+\/.+/.test(resolved)
    || /^\/System\/Volumes\/Data\/Users\/[^/]+\/.+/.test(resolved)
  )
}

function isVolumeLibraryPath(resolved: string): boolean {
  return /^\/Volumes\/[^/]+/.test(resolved)
}

export function isSensitivePath(resolved: string, homeReal?: string): boolean {
  const normalized = path.resolve(resolved)
  if (normalized === path.parse(normalized).root) return true
  if (normalized === '/Volumes' || normalized === '/Users' || normalized === '/home') return true
  if (isHomeDir(normalized, homeReal)) return true
  if (isUserLibraryPath(normalized) || isVolumeLibraryPath(normalized)) return false
  return BLOCKED_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`))
}

export function isInsideRoot(fileAbs: string, rootAbs: string): boolean {
  const root = path.resolve(rootAbs)
  const file = path.resolve(fileAbs)
  const rel = path.relative(root, file)
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel)
}

export function isInsideAnyRoot(fileAbs: string, roots: string[]): boolean {
  return roots.some((root) => isInsideRoot(fileAbs, root))
}

export async function validateLibraryRoot(input: string): Promise<{ ok: true; path: string } | { ok: false; message: string }> {
  const trimmed = input.trim()
  if (!trimmed) return { ok: false, message: 'Root directory is required' }
  if (trimmed.includes('\0')) return { ok: false, message: 'Root is not an allowed library path' }
  if (!path.isAbsolute(trimmed)) return { ok: false, message: 'Root must be an absolute path' }

  const segments = trimmed.split(path.sep)
  if (segments.includes('..') || segments.includes('.')) {
    return { ok: false, message: 'Root path must not contain . or ..' }
  }

  const logical = path.resolve(trimmed)
  if (isSensitivePath(logical)) {
    return { ok: false, message: 'Root is not an allowed library path' }
  }

  let stat
  try {
    stat = await fs.stat(logical)
  } catch {
    return { ok: false, message: `Root does not exist: ${logical}` }
  }
  if (!stat.isDirectory()) {
    return { ok: false, message: 'Root must be a directory' }
  }

  let resolved: string
  try {
    resolved = await fs.realpath(logical)
  } catch {
    return { ok: false, message: `Root does not exist: ${logical}` }
  }

  let homeReal: string | undefined
  try {
    homeReal = await fs.realpath(os.homedir())
  } catch {
    homeReal = os.homedir()
  }

  if (isSensitivePath(resolved, homeReal)) {
    return { ok: false, message: 'Root is not an allowed library path' }
  }

  return { ok: true, path: resolved }
}
