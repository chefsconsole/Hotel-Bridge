import { defineConfig } from 'vitest/config';
import path from 'node:path';
import os from 'node:os';

/* Every test file spins up its own embedded Postgres, which is CPU-heavy. Left
 * unbounded, vitest starts a worker per core, they fight each other for CPU and
 * tests that normally finish in under a second blow a 30s timeout — a green
 * suite then looks broken for reasons that have nothing to do with the code.
 *
 * So: cap the workers well below the core count, and give each test enough room
 * that a busy machine slows the suite down instead of failing it. */
const WORKERS = Math.max(2, Math.min(4, Math.floor(os.cpus().length / 2)));

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname) } },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 120_000,
    hookTimeout: 120_000,
    pool: 'forks',
    poolOptions: { forks: { minForks: 1, maxForks: WORKERS } },
  },
});
