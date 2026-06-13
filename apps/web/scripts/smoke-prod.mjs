// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero
//
// Smoke test post-despliegue: comprueba que la `apikey` de Supabase horneada
// en el bundle de PRODUCCIÓN es válida. Caza el fallo de configuración que
// tuvimos (valor erróneo en VITE_SUPABASE_PUBLISHABLE_KEY en Cloudflare):
// con una clave inválida `/auth/v1/user` responde 401; con la correcta, 403.
//
// Uso:  node scripts/smoke-prod.mjs [url]
//   o:  SMOKE_URL=https://... node scripts/smoke-prod.mjs

const PROD_URL =
  process.argv[2] ??
  process.env.SMOKE_URL ??
  'https://mantenketa.a-guerrero-lasarte.workers.dev'

function fail(msg) {
  console.error(`✗ ${msg}`)
  process.exit(1)
}

function mask(key) {
  if (key.length <= 12) return '…'
  return `${key.slice(0, 10)}…${key.slice(-4)} (${String(key.length)} chars)`
}

console.log(`Smoke test de producción → ${PROD_URL}`)

// 1) Descargar el HTML y localizar el bundle JS
const htmlRes = await fetch(PROD_URL, { redirect: 'follow' })
if (!htmlRes.ok) fail(`la home respondió ${String(htmlRes.status)}`)
const html = await htmlRes.text()
const bundlePath = /\/assets\/index-[^"']+\.js/.exec(html)?.[0]
if (!bundlePath) fail('no se encontró el bundle /assets/index-*.js en el HTML')
console.log(`✓ bundle: ${bundlePath}`)

// 2) Extraer la URL de Supabase y la apikey horneadas en el bundle
const bundle = await (await fetch(new URL(bundlePath, PROD_URL))).text()
const supabaseUrl = /https:\/\/[a-z0-9]+\.supabase\.co/.exec(bundle)?.[0]
if (!supabaseUrl) fail('no se encontró la URL de Supabase en el bundle')
// La key es el literal que sigue a la URL en la llamada createClient(url, key)
const keyMatch = /supabase\.co["'`]\s*,\s*[\w$]+\s*=\s*["'`]([^"'`]+)["'`]/.exec(bundle)
const apikey = keyMatch?.[1]
if (!apikey) fail('no se pudo extraer la apikey del bundle (¿cambió el minificado?)')
console.log(`✓ Supabase URL: ${supabaseUrl}`)
console.log(`✓ apikey desplegada: ${mask(apikey)}`)

// Aviso (no bloqueante) si el formato no es el de una clave publishable
if (!apikey.startsWith('sb_publishable_') && !apikey.startsWith('eyJ')) {
  console.warn(
    '⚠ la apikey no parece una clave de Supabase (ni sb_publishable_… ni JWT) — sospechoso',
  )
}

// 3) Comprobación funcional: ¿Supabase acepta esa apikey?
//    Con bearer inválido: clave válida → 403; clave inválida → 401.
const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
  headers: { apikey, Authorization: 'Bearer smoke-test-invalid-token' },
})

if (res.status === 401) {
  fail(
    `Supabase RECHAZA la apikey desplegada (401). La variable ` +
      `VITE_SUPABASE_PUBLISHABLE_KEY del despliegue es incorrecta.`,
  )
}
if (res.status !== 403) {
  console.warn(`⚠ estado inesperado ${String(res.status)} (se esperaba 403); revisar manualmente`)
}

console.log(`✓ Supabase acepta la apikey (HTTP ${String(res.status)} con token de prueba)`)
console.log('\n✅ Smoke test OK: el despliegue puede autenticarse contra Supabase.')
