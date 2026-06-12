// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

// Tests de aislamiento RLS (Principio IV/VIII): corren contra un Supabase
// en marcha (local `supabase start` o el proyecto enlazado) — por eso van
// aparte del `pnpm test` unitario. Secuenciales: comparten la base de datos.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
    env: loadEnv('test', process.cwd(), ''),
  },
})
