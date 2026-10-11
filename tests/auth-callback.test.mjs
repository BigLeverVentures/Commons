import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { NextRequest, NextResponse } from 'next/server.js'

function loadCallback(error = null) {
  const source = fs.readFileSync('src/app/auth/confirm/route.ts', 'utf8')
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  const exports = {}
  vm.runInNewContext(js, {
    exports, process,
    require(name) {
      if (name === 'next/server') return { NextResponse }
      if (name === '@supabase/ssr') return {
        createServerClient(_url, _key, options) {
          return { auth: { async verifyOtp() {
            if (!error) options.cookies.setAll([{ name: 'sb-session', value: 'verified-session', options: { httpOnly: true, path: '/' } }])
            return { error }
          } } }
        },
      }
      throw new Error(`Unexpected dependency: ${name}`)
    },
  })
  return exports.GET
}

test('a verified magic link preserves the session cookie on the redirect', async () => {
  const response = await loadCallback()(new NextRequest('http://localhost/auth/confirm?type=email&token_hash=valid'))
  assert.equal(response.headers.get('location'), 'http://localhost/board')
  assert.equal(response.cookies.get('sb-session').value, 'verified-session')
  assert.match(response.headers.get('set-cookie'), /HttpOnly/)
})

test('an expired magic link returns to login without leaking its token', async () => {
  const response = await loadCallback({ message: 'Token expired' })(new NextRequest('http://localhost/auth/confirm?type=email&token_hash=secret'))
  assert.equal(response.headers.get('location'), 'http://localhost/login?error=expired')
  assert.equal(response.cookies.get('sb-session'), undefined)
})

test('invalid callback parameters do not establish a session', async () => {
  const response = await loadCallback()(new NextRequest('http://localhost/auth/confirm?type=signup&token_hash=secret'))
  assert.equal(response.headers.get('location'), 'http://localhost/login?error=expired')
  assert.equal(response.cookies.get('sb-session'), undefined)
})
