import { execSync } from 'child_process'
import os from 'os'
import fs from 'fs'
import path from 'path'

let _env: NodeJS.ProcessEnv | null = null

// On macOS, apps launched from DMG/Finder don't inherit the user's shell PATH.
// We source the login shell AND the rc file (for nvm/volta/etc in .zshrc/.bashrc),
// then merge in known fallback paths and any nvm node versions we can find on disk.
export function getShellEnv(): NodeJS.ProcessEnv {
  if (_env) return _env

  const home = os.homedir()
  const shell = process.env.SHELL || '/bin/zsh'

  // Always-added paths: Homebrew, npm-global, and all nvm node versions on disk
  const extraPaths: string[] = [
    '/opt/homebrew/bin',
    '/opt/homebrew/sbin',
    '/usr/local/bin',
    '/usr/local/sbin',
    path.join(home, '.npm-global', 'bin'),
  ]

  // Enumerate every nvm node version so we find wechat-cli regardless of active version
  try {
    const nvmDir = process.env.NVM_DIR || path.join(home, '.nvm')
    const nvmVersionsDir = path.join(nvmDir, 'versions', 'node')
    if (fs.existsSync(nvmVersionsDir)) {
      for (const v of fs.readdirSync(nvmVersionsDir)) {
        const binDir = path.join(nvmVersionsDir, v, 'bin')
        if (fs.existsSync(binDir)) extraPaths.push(binDir)
      }
    }
  } catch { /* ignore */ }

  // Try to get the shell's full PATH.
  // zsh -l alone skips .zshrc (login vs interactive), so we source the rc file explicitly.
  const rcFile = shell.includes('zsh') ? path.join(home, '.zshrc') : path.join(home, '.bashrc')
  const shellCmds = [
    `${shell} -l -c "[ -f '${rcFile}' ] && source '${rcFile}' 2>/dev/null; echo $PATH"`,
    `${shell} -l -c "echo $PATH"`,
  ]

  let shellPath = ''
  for (const cmd of shellCmds) {
    try {
      const result = execSync(cmd, { encoding: 'utf8', timeout: 5000, windowsHide: true }).trim()
      if (result && result.includes('/')) { shellPath = result; break }
    } catch { /* try next */ }
  }

  const baseParts = shellPath ? shellPath.split(':') : (process.env.PATH || '').split(':')
  const allPaths = [...new Set([...baseParts, ...extraPaths].filter(Boolean))]
  _env = { ...process.env, PATH: allPaths.join(':') }
  return _env
}
