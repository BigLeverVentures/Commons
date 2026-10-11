import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

function worker(fetch) {
  const exports = {}
  const app = { fetch }
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/worker.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, {
    exports, URL, Response,
    require: name => name === 'vinext/server/fetch-handler'
      ? { __esModule: true, default: app }
      : { dispatchNotificationJob() {} },
  })
  return exports.default
}

test('www links redirect to HTTPS canonical host with paths and query parameters intact', async () => {
  const app = worker(() => assert.fail('www must redirect before the application'))
  for (const source of [
    'https://www.commons.example.org/',
    'http://www.commons.example.org/posts/example?from=share',
    'https://www.commons.example.org/auth/confirm?token_hash=test-token&type=email',
  ]) {
    const expected = new URL(source)
    expected.protocol = 'https:'
    expected.hostname = 'commons.example.org'
    const response = await app.fetch(new Request(source), {}, {})
    assert.equal(response.status, 308)
    assert.equal(response.headers.get('location'), expected.href)
  }
})

test('canonical and development hosts retain the original application request and bindings', async () => {
  const env = { binding: 'test' }
  const context = {}
  for (const host of ['commons.example.org', 'localhost', 'commons.demo.workers.dev']) {
    const request = new Request(`https://${host}/board`)
    const app = worker((...args) => {
      assert.deepEqual(args, [request, env, context])
      return new Response('board')
    })
    assert.equal(await (await app.fetch(request, env, context)).text(), 'board')
  }
})

test('cleanup dispatch is independent of notifications and their failures',async()=>{
  for(const enabled of [false,true]) {
    const exports={},calls=[],promises=[]
    vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/worker.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{
      exports,URL,Response,require(name){
        if(name==='vinext/server/fetch-handler')return {__esModule:true,default:{fetch(){}}}
        if(name.includes('storage-cleanup'))return {dispatchStorageCleanupJob(config){calls.push(['cleanup',config]);return Promise.resolve()}}
        return {dispatchNotificationJob(){calls.push(['email']);return Promise.reject(new Error('email offline'))}}
      }
    })
    exports.default.scheduled(null,{APP_URL:'https://commons.example.org',CRON_SECRET:'test-secret',NOTIFICATIONS_ENABLED:String(enabled)},{waitUntil(p){promises.push(p)}})
    const results=await Promise.allSettled(promises)
    assert.equal(calls[0][0],'cleanup');assert.equal(results[0].status,'fulfilled')
    assert.equal(calls.length,enabled?2:1)
    if(enabled)assert.equal(results[1].status,'rejected')
  }
})
