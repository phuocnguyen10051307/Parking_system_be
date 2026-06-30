import test from 'node:test'
import assert from 'node:assert/strict'

import { assertVehicleCanCheckIn, buildParkingSessionCheckInData, buildParkingSessionCheckOutData, calculateParkingFee, canViewParkingSession } from '../src/services/parking-session.service.js'

test('buildParkingSessionCheckInData sets the right defaults', () => {
  const payload = buildParkingSessionCheckInData({ vehicleId: 'veh_1', slotId: 'slot_1', entryGate: 'G1' }, 'user_1')

  assert.equal(payload.vehicleId, 'veh_1')
  assert.equal(payload.slotId, 'slot_1')
  assert.equal(payload.userId, 'user_1')
  assert.equal(payload.entryGate, 'G1')
  assert.equal(payload.status, 'ACTIVE')
})
test('buildParkingSessionCheckOutData requires exit image metadata', () => {
  const payload = buildParkingSessionCheckOutData(
    { exitGate: 'G2' },
    { secureUrl: 'https://res.cloudinary.com/demo/check-out.jpg', publicId: 'parking/check-outs/demo' }
  )

  assert.equal(payload.exitGate, 'G2')
  assert.equal(payload.exitImageUrl, 'https://res.cloudinary.com/demo/check-out.jpg')
  assert.equal(payload.exitImagePublicId, 'parking/check-outs/demo')
  assert.equal(payload.status, 'COMPLETED')
})

test('canViewParkingSession allows owners and staff roles', () => {
  assert.equal(canViewParkingSession({ _id: 'user_1' }, { userId: 'user_1' }, 'USER'), true)
  assert.equal(canViewParkingSession({ _id: 'user_1' }, { userId: 'user_2' }, 'ADMIN'), true)
  assert.equal(canViewParkingSession({ _id: 'user_1' }, { userId: 'user_2' }, 'USER'), false)
})
test('assertVehicleCanCheckIn allows vehicles without active sessions', async () => {
  const client = {
    parkingSession: {
      findFirst: async () => null,
    },
  }

  await assert.doesNotReject(() => assertVehicleCanCheckIn(client, 'veh_1'))
})

test('assertVehicleCanCheckIn rejects vehicles already checked in', async () => {
  const client = {
    parkingSession: {
      findFirst: async () => ({ id: 'session_1' }),
    },
  }

  await assert.rejects(
    () => assertVehicleCanCheckIn(client, 'veh_1'),
    (error) => error.statusCode === 400 && error.message === 'This vehicle is already checked in'
  )
})
test('calculateParkingFee uses grace period and hourly car rate', () => {
  const entryTime = new Date('2026-06-30T08:00:00.000Z')

  assert.equal(calculateParkingFee(entryTime, new Date('2026-06-30T08:10:00.000Z'), 'CAR'), 0)
  assert.equal(calculateParkingFee(entryTime, new Date('2026-06-30T08:20:00.000Z'), 'CAR'), 2)
  assert.equal(calculateParkingFee(entryTime, new Date('2026-06-30T10:01:00.000Z'), 'CAR'), 6)
})

