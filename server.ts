/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Check if tsx loader or TypeScript support is active
const isTsxActive =
  process.execArgv.some((arg) => arg.includes('tsx')) ||
  process.env.TSX_ACTIVE === '1';

if (!isTsxActive) {
  // When executed directly with `node server.ts` (in production container or Cloud Run),
  // re-spawn with `--import tsx` so TypeScript modules resolve cleanly.
  const child = spawn(
    process.execPath,
    ['--import', 'tsx', fileURLToPath(import.meta.url), ...process.argv.slice(2)],
    {
      stdio: 'inherit',
      env: { ...process.env, TSX_ACTIVE: '1' },
    }
  );

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
    } else {
      process.exit(code ?? 0);
    }
  });

  process.on('SIGTERM', () => child.kill('SIGTERM'));
  process.on('SIGINT', () => child.kill('SIGINT'));
} else {
  // tsx loader is active; load and start the server
  await import('./src/server/app');
}

