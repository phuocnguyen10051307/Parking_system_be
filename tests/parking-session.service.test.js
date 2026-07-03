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

test('calculateParkingFee applies apartment daytime pricing for cars', () => {
  const entryTime = new Date(2026, 5, 30, 8, 0, 0)

  assert.equal(calculateParkingFee(entryTime, new Date(2026, 5, 30, 9, 0, 0), 'CAR'), 15000)
  assert.equal(calculateParkingFee(entryTime, new Date(2026, 5, 30, 10, 1, 0), 'CAR'), 30000)
})

test('calculateParkingFee applies apartment evening pricing for cars', () => {
  const entryTime = new Date(2026, 5, 30, 18, 0, 0)

  assert.equal(calculateParkingFee(entryTime, new Date(2026, 5, 30, 19, 0, 0), 'CAR'), 20000)
  assert.equal(calculateParkingFee(entryTime, new Date(2026, 5, 30, 21, 5, 0), 'CAR'), 40000)
})

test('calculateParkingFee applies overnight flat pricing for cars', () => {
  const entryTime = new Date(2026, 5, 30, 1, 0, 0)

  assert.equal(calculateParkingFee(entryTime, new Date(2026, 5, 30, 2, 0, 0), 'CAR'), 100000)
  assert.equal(calculateParkingFee(entryTime, new Date(2026, 5, 30, 5, 59, 0), 'CAR'), 100000)
})

test('calculateParkingFee combines time bands for cars', () => {
  const entryTime = new Date(2026, 5, 30, 16, 30, 0)
  const exitTime = new Date(2026, 5, 30, 19, 0, 0)

  assert.equal(calculateParkingFee(entryTime, exitTime, 'CAR'), 35000)
})

test('calculateParkingFee keeps grace period for non-car vehicles', () => {
  const entryTime = new Date('2026-06-30T08:00:00.000Z')

  assert.equal(calculateParkingFee(entryTime, new Date('2026-06-30T08:10:00.000Z'), 'MOTORBIKE'), 0)
  assert.equal(calculateParkingFee(entryTime, new Date('2026-06-30T08:20:00.000Z'), 'MOTORBIKE'), 0.5)
})

