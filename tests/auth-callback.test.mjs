import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { NextRequest, NextResponse } from 'next/server.js'

function loadCallback(error = null, communityName = "Commons") {
  const source = fs.readFileSync('src/app/auth/confirm/route.ts', 'utf8')
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  const exports = {}, calls = []
  vm.runInNewContext(js, {
    exports, process, URL,
    require(name) {
      if (name === '@/config/community') return { COMMUNITY: { name: communityName } }
      if (name === 'next/server') return { NextResponse }
      if (name === '@supabase/ssr') return {
        createServerClient(_url, _key, options) {
          return { auth: { async verifyOtp(args) {
            calls.push(args)
            if (error instanceof Error) throw error
            if (!error) options.cookies.setAll([{ name: 'sb-session', value: 'verified-session', options: { httpOnly: true, path: '/' } }])
            return { error }
          } } }
        },
      }
      throw new Error(`Unexpected dependency: ${name}`)
    },
  })
  return { ...exports, calls }
}

const request = (token = 'valid', origin = 'http://localhost', type = 'email') => new NextRequest('http://localhost/auth/confirm', {
  method:'POST', headers:{origin,'Content-Type':'application/x-www-form-urlencoded'}, body:new URLSearchParams({token_hash:token,type}),
})

test('GET and HEAD previews never consume a magic link or establish a session', async () => {
  const api=loadCallback()
  const response=await api.GET(new NextRequest('http://localhost/auth/confirm?type=email&token_hash=valid'))
  assert.equal(response.status,200)
  assert.match(await response.text(),/method="post"/)
  assert.equal(response.cookies.get('sb-session'),undefined)
  assert.equal(response.headers.get('cache-control'),'private, no-store')
  assert.equal(response.headers.get('referrer-policy'),'strict-origin')
  assert.match(response.headers.get('content-security-policy'),/form-action 'self'/)
  assert.equal((await api.HEAD()).status,204)
  assert.equal(api.calls.length,0)
})

test('explicit verification preserves session cookies on a clean redirect', async () => {
  const api=loadCallback(), response=await api.POST(request())
  assert.equal(response.status,303)
  assert.equal(response.headers.get('location'),'http://localhost/board')
  assert.equal(response.cookies.get('sb-session').value,'verified-session')
  assert.match(response.headers.get('set-cookie'),/HttpOnly/)
  assert.equal(api.calls.length,1)
  assert.equal(api.calls[0].token_hash,'valid')
})

test('expired tokens return to login without leaking the token', async () => {
  const response=await loadCallback({code:'otp_expired',message:'Token expired'}).POST(request('secret'))
  assert.equal(response.headers.get('location'),'http://localhost/login?error=expired')
  assert.equal(response.cookies.get('sb-session'),undefined)
})

test('invalid parameters and cross-origin submissions never verify a token', async () => {
  const api=loadCallback()
  for (const input of [request('secret','http://localhost','signup'),request('<script>')]) {
    assert.equal((await api.POST(input)).headers.get('location'),'http://localhost/login?error=expired')
  }
  for(const origin of ['https://elsewhere.example','null','']) {
    assert.equal((await api.POST(request('valid',origin))).status,403)
  }
  for (const url of ['?type=signup&token_hash=secret','?type=email&token_hash=%22%3E%3Cscript%3E','']) {
    assert.equal((await api.GET(new NextRequest('http://localhost/auth/confirm'+url))).headers.get('location'),'http://localhost/login?error=expired')
  }
  assert.equal(api.calls.length,0)
})

test('service failures are not mislabeled as expired links', async () => {
  for(const error of [{code:'unexpected_failure',message:'Service unavailable'},new Error('Network failure')]) {
    assert.equal((await loadCallback(error).POST(request())).headers.get('location'),'http://localhost/login?error=unavailable')
  }
})

test('configured community names remain text in the confirmation HTML', async () => {
  const api = loadCallback(null, '<img src=x onerror=alert(1)> & Community')
  const response = await api.GET(new NextRequest('http://localhost/auth/confirm?type=email&token_hash=valid'))
  const html = await response.text()
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt; &amp; Community/)
  assert.doesNotMatch(html, /<img src=x/)
  assert.equal(api.calls.length, 0)
})

test('confirmation referrer protection wins over app-wide header configuration', async () => {
  const exports = {}
  const js = ts.transpileModule(fs.readFileSync('next.config.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText
  vm.runInNewContext(js, { exports })
  const rules = await exports.default.headers()
  const headers = new Map()
  for (const rule of rules) {
    if (rule.source === '/(.*)' || rule.source === '/auth/confirm') {
      for (const header of rule.headers) headers.set(header.key.toLowerCase(), header.value)
    }
  }
  assert.equal(headers.get('referrer-policy'), 'strict-origin')
})
