import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import {
  backendLabel,
  findClaudeBinary,
  MIN_CLAUDE_CODE_VERSION,
  selectBackend,
} from './backend.mjs';

export function compareVersions(left, right) {
  const a = left.split('.').map(Number);
  const b = right.split('.').map(Number);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference !== 0) {
      return Math.sign(difference);
    }
  }
  return 0;
}

export function formatDoctor({ nodeVersion, backend, claudeVersion, claudeError }) {
  const lines = [
    `Node.js: ${nodeVersion}`,
    `Backend: ${backendLabel(backend)}`,
    `Claude Code minimum: ${MIN_CLAUDE_CODE_VERSION}`,
  ];
  if (claudeVersion) {
    const meetsMinimum = compareVersions(claudeVersion, MIN_CLAUDE_CODE_VERSION) >= 0;
    lines.push(`Claude Code: ${claudeVersion} (${meetsMinimum ? 'meets minimum' : 'below minimum'})`);
  } else {
    lines.push(`Claude Code: not found${claudeError ? ` (${claudeError})` : ''}`);
  }
  return lines.join('\n');
}

export function getDoctorReport({ env = process.env, platform = process.platform, pathValue = process.env.PATH ?? '' } = {}) {
  const backend = selectBackend({ env });
  const binary = findClaudeBinary({ platform, pathValue });
  if (!binary || !binary.native) {
    return formatDoctor({
      nodeVersion: process.version,
      backend,
      claudeError: binary ? 'install the native Claude Code CLI' : 'install Claude Code from https://code.claude.com/docs/en/setup',
    });
  }

  const result = spawnSync(binary.command, ['--version'], { encoding: 'utf8', shell: false });
  const version = /(\d+\.\d+\.\d+)/.exec(`${result.stdout ?? ''} ${result.stderr ?? ''}`)?.[1];
  return formatDoctor({
    nodeVersion: process.version,
    backend,
    claudeVersion: version,
    claudeError: result.error?.message ?? (result.status === 0 ? undefined : 'version command failed'),
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(getDoctorReport());
}
