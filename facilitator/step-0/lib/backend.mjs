import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { accessSync, constants, existsSync } from 'node:fs';
import path from 'node:path';

export const MIN_CLAUDE_CODE_VERSION = '2.1.205';
export const BACKENDS = ['claude-code', 'sdk', 'sdk-login'];

export function selectBackend({ argument, env = process.env } = {}) {
  const backend = argument || env.AGENT_BACKEND || (env.ANTHROPIC_API_KEY ? 'sdk' : 'claude-code');
  if (!BACKENDS.includes(backend)) {
    throw new Error(`Unknown backend "${backend}". Choose claude-code, sdk, or sdk-login.`);
  }
  return backend;
}

export function backendLabel(backend) {
  return {
    'claude-code': 'claude-code (claude -p)',
    sdk: 'sdk (query(), API key)',
    'sdk-login': 'sdk-login (query() on your Claude Code login)',
  }[backend];
}

export function findClaudeBinary({ platform = process.platform, pathValue = process.env.PATH ?? '' } = {}) {
  const pathSeparator = platform === 'win32' ? ';' : ':';
  const directories = pathValue.split(pathSeparator).filter(Boolean);
  const executableNames = platform === 'win32' ? ['claude.exe'] : ['claude'];

  for (const directory of directories) {
    for (const name of executableNames) {
      const candidate = path.join(directory, name);
      if (!existsSync(candidate)) {
        continue;
      }
      if (platform !== 'win32') {
        try {
          accessSync(candidate, constants.X_OK);
        } catch {
          continue;
        }
      }
      return { command: candidate, native: true };
    }
  }

  if (platform === 'win32') {
    for (const directory of directories) {
      const candidate = path.join(directory, 'claude.cmd');
      if (existsSync(candidate)) {
        return { command: candidate, native: false };
      }
    }
  }

  return null;
}

function valuesForAgents(agents) {
  return Object.fromEntries(Object.entries(agents).map(([name, agent]) => [
    name,
    Object.fromEntries(['description', 'prompt', 'tools', 'model']
      .filter((key) => agent[key] !== undefined)
      .map((key) => [key, agent[key]])),
  ]));
}

export function toClaudeArgs(prompt, options = {}) {
  const args = ['-p', prompt, '--output-format', 'stream-json', '--verbose'];

  if (options.settingSources?.length) {
    args.push('--setting-sources', options.settingSources.join(','));
  }
  if (options.maxTurns !== undefined) {
    args.push('--max-turns', String(options.maxTurns));
  }
  if (options.model) {
    args.push('--model', options.model);
  }
  if (Array.isArray(options.tools)) {
    args.push('--tools', options.tools.join(','));
  }
  if (options.allowedTools?.length) {
    args.push('--allowedTools', options.allowedTools.join(','));
  }
  if (options.disallowedTools?.length) {
    args.push('--disallowedTools', options.disallowedTools.join(','));
  }
  if (options.permissionMode) {
    args.push('--permission-mode', options.permissionMode);
  }

  const systemPrompt = options.systemPrompt;
  if (typeof systemPrompt === 'string') {
    args.push('--system-prompt', systemPrompt);
  } else if (systemPrompt?.append) {
    args.push('--append-system-prompt', systemPrompt.append);
  }

  if (options.agents) {
    args.push('--agents', JSON.stringify(valuesForAgents(options.agents)));
  }
  if (options.mcpServers) {
    args.push('--mcp-config', JSON.stringify({ mcpServers: options.mcpServers }), '--strict-mcp-config');
  }
  if (options.outputFormat?.type === 'json_schema') {
    args.push('--json-schema', JSON.stringify(options.outputFormat.schema));
  }
  if (options.resume) {
    args.push('--resume', options.resume);
  }

  return args;
}

export function formatCommand(command, args) {
  return [command, ...args].map((arg) => {
    if (arg === '') {
      return '""';
    }
    return /[\s"'\\]/.test(arg) ? JSON.stringify(arg) : arg;
  }).join(' ');
}

export async function runClaudeCode({ command, prompt, options, onEvent }) {
  const args = toClaudeArgs(prompt, options);
  const child = spawn(command, args, {
    cwd: options.cwd,
    env: process.env,
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stderr = '';
  let sessionId = null;
  let result = null;

  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk) => {
    stderr += chunk;
  });

  const exitPromise = new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (code, signal) => resolve({ code, signal }));
  });

  const lines = createInterface({ input: child.stdout });
  for await (const line of lines) {
    if (!line.trim()) {
      continue;
    }
    const event = JSON.parse(line);
    sessionId = event.session_id ?? event.sessionId ?? sessionId;
    onEvent(event);
    if (event.type === 'result') {
      result = event.structured_output ?? event.result ?? null;
    }
  }

  const { code, signal } = await exitPromise;
  if (code !== 0) {
    throw new Error(stderr.trim() || `claude exited with ${code ?? signal}`);
  }
  return { sessionId, result };
}
