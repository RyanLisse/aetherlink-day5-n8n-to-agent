import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverDirectory = path.dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => key.toLowerCase() !== 'npm_config_local_prefix'),
);
const npmCli = process.env.npm_execpath;
const [command, prefixArgs] = npmCli ? [process.execPath, [npmCli]] : ['npm', []];
const result = spawnSync(command, [...prefixArgs, 'install', '--no-audit', '--no-fund'], {
  cwd: serverDirectory,
  env,
  stdio: 'inherit',
  shell: !npmCli && process.platform === 'win32',
});
process.exit(result.status ?? 1);
