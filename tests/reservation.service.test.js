import test from 'node:test'
import assert from 'node:assert/strict'

import { buildReservationCreateData, canCancelReservation } from '../src/services/reservation.service.js'

test('buildReservationCreateData uses the current user and preserves valid dates', () => {
  const payload = buildReservationCreateData(
    {
      vehicleId: 'vehicle_1',
      slotId: 'slot_1',
      startTime: '2026-06-25T10:00:00.000Z',
      endTime: '2026-06-25T12:00:00.000Z',
    },
    'user_1',
  )

  assert.equal(payload.userId, 'user_1')
  assert.equal(payload.vehicleId, 'vehicle_1')
  assert.equal(payload.slotId, 'slot_1')
  assert.deepEqual(payload.startTime, new Date('2026-06-25T10:00:00.000Z'))
  assert.deepEqual(payload.endTime, new Date('2026-06-25T12:00:00.000Z'))
})

test('canCancelReservation allows owners and staff roles', () => {
  assert.equal(canCancelReservation({ userId: 'user_1' }, { id: 'user_1' }, 'USER'), true)
  assert.equal(canCancelReservation({ userId: 'user_1' }, { id: 'another_user' }, 'ADMIN'), true)
  assert.equal(canCancelReservation({ userId: 'user_1' }, { id: 'another_user' }, 'USER'), false)
})
