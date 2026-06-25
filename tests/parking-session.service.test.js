import test from 'node:test'
import assert from 'node:assert/strict'

import { buildParkingSessionCheckInData, buildParkingSessionCheckOutData, canViewParkingSession } from '../src/services/parking-session.service.js'

test('buildParkingSessionCheckInData sets the right defaults', () => {
  const payload = buildParkingSessionCheckInData({ vehicleId: 'veh_1', slotId: 'slot_1', entryGate: 'G1' }, 'user_1')

  assert.equal(payload.vehicleId, 'veh_1')
  assert.equal(payload.slotId, 'slot_1')
  assert.equal(payload.userId, 'user_1')
  assert.equal(payload.entryGate, 'G1')
  assert.equal(payload.status, 'ACTIVE')
})

test('canViewParkingSession allows owners and staff roles', () => {
  assert.equal(canViewParkingSession({ _id: 'user_1' }, { userId: 'user_1' }, 'USER'), true)
  assert.equal(canViewParkingSession({ _id: 'user_1' }, { userId: 'user_2' }, 'ADMIN'), true)
  assert.equal(canViewParkingSession({ _id: 'user_1' }, { userId: 'user_2' }, 'USER'), false)
})
