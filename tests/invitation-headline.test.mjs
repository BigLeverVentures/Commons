import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
const exports = {}
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/invitation-headline.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports })
const { invitationHeadline, INVITATION_HEADLINE_LIMITS } = exports

test('intro headings preserve short text and shorten long invitations at a word boundary', () => {
  const text = 'Have a body of work you’d like an assistant to answer from? Let’s build one together.'
  assert.equal(invitationHeadline('A short invitation', 40), 'A short invitation')
  for (const limit of Object.values(INVITATION_HEADLINE_LIMITS)) {
    const shown = invitationHeadline(text, limit)
    assert.ok(Array.from(shown).length <= limit)
    assert.ok(shown.endsWith('…'))
    assert.ok(text.startsWith(shown.slice(0, -1)))
  }
  assert.equal(invitationHeadline('One two three four', 14), 'One two three…')
})
test('intro headings handle pasted whitespace and unbroken Unicode without splitting surrogate pairs', () => {
  assert.equal(invitationHeadline('  One\n two\tthree  ', 40), 'One two three')
  assert.equal(invitationHeadline('🚀'.repeat(50), 40), '🚀'.repeat(39) + '…')
})
