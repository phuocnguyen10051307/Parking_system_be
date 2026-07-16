import test from 'node:test'
import assert from 'node:assert/strict'

import { buildFeedbackCreateData, canUpdateFeedback } from '../src/services/feedback.service.js'

test('buildFeedbackCreateData uses the authenticated user and preserves the supplied fields', () => {
  const payload = buildFeedbackCreateData(
    { title: 'Parking issue', content: 'The slot was blocked' },
    'user_1',
  )

  assert.equal(payload.userId, 'user_1')
  assert.equal(payload.title, 'Parking issue')
  assert.equal(payload.content, 'The slot was blocked')
  assert.equal(payload.status, 'OPEN')
})

test('canUpdateFeedback allows owners and staff roles', () => {
  assert.equal(canUpdateFeedback({ userId: 'user_1' }, { userId: 'user_1' }, 'USER'), true)
  assert.equal(canUpdateFeedback({ userId: 'user_1' }, { userId: 'another_user' }, 'ADMIN'), true)
  assert.equal(canUpdateFeedback({ userId: 'user_1' }, { userId: 'another_user' }, 'USER'), false)
})
