import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

test('board and post readers select the author relationship when reaction actors also relate to fellows', async () => {
  const author = { name: 'Post author' }
  const reactor = { name: 'Different fellow' }
  const queries = []
  const db = { from(table) {
    let selection = ''
    const query = {
      select(value) { selection = value; queries.push({ table, selection }); return query },
      order() { return query }, range() { return query }, eq() { return query },
      maybeSingle() { return Promise.resolve(result(true)) },
      then(resolve, reject) { return Promise.resolve(result(false)).then(resolve, reject) },
    }
    function result(single) {
      if (!selection.includes(`fellows!${table}_user_id_fkey(`)) return { data: null, error: { code: 'PGRST201' } }
      const row = { id: 'post', fellow: author }
      return { data: single ? row : [row], error: null }
    }
    return query
  } }
  const source = fs.readFileSync('src/lib/board-data.ts', 'utf8')
  const exports = {}
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, require(name) {
      if (name === '@/lib/post-story') { const result = {}; vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/post-story.ts', 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText, {exports:result}); return result }
      if (name === 'server-only' || name === '@/lib/preview') return {}
      if (name === '@/lib/runtime') return { isPreviewMode: () => false }
      if (name === '@/lib/supabase/server') return { getSupabaseServerClient: async () => db }
      throw new Error(`Unexpected dependency: ${name}`)
    },
  })
  assert.equal((await exports.loadPosts())[0].fellow.name, author.name)
  assert.equal((await exports.loadPost('post')).fellow.name, author.name)
  assert.notEqual((await exports.loadPost('post')).fellow.name, reactor.name)
  assert.equal((await exports.loadResponses('post', 'viewer', false))[0].fellow.name, author.name)
  assert.equal(queries.length, 4)
})
