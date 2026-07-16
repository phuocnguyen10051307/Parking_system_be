import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildReservationCreateData,
  canCancelReservation,
  canCheckInWithReservation,
  getReservationBookingWindow,
  getReservationCheckInWindow,
} from '../src/services/reservation.service.js'

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

test('getReservationBookingWindow limits reservations to the next 5 days', () => {
  const baseTime = new Date('2026-06-25T10:00:00.000Z')
  const window = getReservationBookingWindow(baseTime)

  assert.deepEqual(window.minStartTime, baseTime)
  assert.deepEqual(window.maxEndTime, new Date('2026-06-30T10:00:00.000Z'))
})

test('getReservationCheckInWindow opens 4 hours early and expires 2 hours late', () => {
  const window = getReservationCheckInWindow({ startTime: '2026-06-25T10:00:00.000Z' })

  assert.deepEqual(window.opensAt, new Date('2026-06-25T06:00:00.000Z'))
  assert.deepEqual(window.expiresAt, new Date('2026-06-25T12:00:00.000Z'))
})

test('canCheckInWithReservation only allows the reservation inside the business window', () => {
  const reservation = { startTime: '2026-06-25T10:00:00.000Z' }

  assert.equal(canCheckInWithReservation(reservation, new Date('2026-06-25T05:59:59.000Z')), false)
  assert.equal(canCheckInWithReservation(reservation, new Date('2026-06-25T06:00:00.000Z')), true)
  assert.equal(canCheckInWithReservation(reservation, new Date('2026-06-25T12:00:00.000Z')), true)
  assert.equal(canCheckInWithReservation(reservation, new Date('2026-06-25T12:00:01.000Z')), false)
})

test('canCancelReservation allows owners and staff roles', () => {
  assert.equal(canCancelReservation({ userId: 'user_1' }, { id: 'user_1' }, 'USER'), true)
  assert.equal(canCancelReservation({ userId: 'user_1' }, { id: 'another_user' }, 'ADMIN'), true)
  assert.equal(canCancelReservation({ userId: 'user_1' }, { id: 'another_user' }, 'USER'), false)
})
