// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { defineConfig } from 'vitest/config'

// Tests de aislamiento RLS (Principio IV/VIII): corren contra un Supabase
// en marcha (local `supabase start` o remoto) — por eso van aparte del
// `pnpm test` unitario. Secuenciales: comparten estado de base de datos.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 15000,
  },
})
