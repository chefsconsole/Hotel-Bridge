/* CLI scripts don't get Next's .env loading; read .env.local ourselves. */
import fs from 'node:fs';
try {
  for (const line of fs.readFileSync(process.cwd() + '/.env.local', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch { /* none */ }
