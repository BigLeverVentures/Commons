import { communityConfig } from './helpers/community.mjs'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import MiniSearch from 'minisearch'

function load(file, dependencies = {}) {
 dependencies = {'@/config/community': communityConfig, ...dependencies}

  const exports = {}
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, { exports, require: name => {
    if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`)
    return dependencies[name]
  } })
  return exports
}
const topics = load('src/lib/topics.ts')
const { createBoardSearch } = load('src/lib/board-search.ts', { minisearch: MiniSearch, './topics': topics })
const post = (id, fields = {}) => ({ id, title: '', description: '', tags: [], collaborators: [], fellow: null, topic: 'open', ...fields })
const posts = [
  post('mentor', { title: 'Startup mentoring: idea to exit', fellow: { name: 'José Rivera' }, topic: 'technology' }),
  post('institute', { title: 'Community Institute', description: 'Education for everyone', collaborators: ['Alex Fellow'], tags: ['learning'], topic: 'learning' }),
  post('body', { title: 'Community resources', description: 'Startup mentoring for new founders' }),
]
const search = createBoardSearch(posts)
const ids = query => Array.from(search(query), p => p.id)

test('case, prefixes, accents, and startup variants find the same post', () => {
  for (const query of ['START', 'STARTUP', 'start up', 'start-up', 'Jose Rivera']) {
    assert.equal(ids(query)[0], 'mentor', query)
  }
})
test('one typo is tolerated in longer words but short terms do not fuzzy match', () => {
  assert.deepEqual(ids('institue'), ['institute'])
  assert.deepEqual(ids('zxy'), [])
  assert.deepEqual(ids('zzzzzzzz'), [])
})
test('multiple terms must match, in any order, including across fields', () => {
  assert.deepEqual(ids('exit startup'), ['mentor'])
  assert.deepEqual(ids('rivera mentoring'), ['mentor'])
  assert.deepEqual(ids('startup institute'), [])
})
test('search includes collaborator names, tags, and the displayed topic heading', () => {
  assert.deepEqual(ids('Alex Fellow'), ['institute'])
  assert.deepEqual(ids('learning'), ['institute'])
  assert.deepEqual(ids('tools possibility'), ['mentor'])
})
test('title hits rank above description hits; clearing search preserves original order', () => {
  assert.deepEqual(ids('mentoring'), ['mentor', 'body'])
  assert.equal(search('   '), posts)
})
test('a newly created index reflects current posts without retaining removed records', () => {
  const changed = createBoardSearch([post('new', { title: 'Ocean restoration' })])
  assert.equal(changed('startup').length, 0)
  assert.equal(changed('ocean')[0].id, 'new')
  assert.equal(createBoardSearch([])('ocean').length, 0)
})

test('browsing avoids indexing; first search builds once and subsequent searches reuse it', () => {
  let builds = 0
  class CountingSearch extends MiniSearch {
    constructor(options) {
      super(options)
      builds += 1
    }
  }
  const { createBoardSearch: createLazySearch } = load('src/lib/board-search.ts', {
    minisearch: CountingSearch, './topics': topics,
  })
  const find = createLazySearch(posts)
  assert.equal(builds, 0)
  assert.equal(find(''), posts)
  assert.equal(find('   '), posts)
  assert.equal(builds, 0)
  assert.equal(find('startup')[0].id, 'mentor')
  assert.equal(builds, 1)
  assert.equal(find('institute')[0].id, 'institute')
  assert.equal(find(''), posts)
  assert.equal(builds, 1)
})
