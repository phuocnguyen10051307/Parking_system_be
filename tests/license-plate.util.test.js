import test from 'node:test'
import assert from 'node:assert/strict'

import { compactLicensePlate, formatLicensePlate } from '../src/utils/license-plate.js'

test('compactLicensePlate removes separators and uppercases the value', () => {
  assert.equal(compactLicensePlate(' 51a-234.44 '), '51A23444')
})

test('formatLicensePlate converts compact input to the standard display format', () => {
  assert.equal(formatLicensePlate('51A23444'), '51A-234.44')
  assert.equal(formatLicensePlate('29t112345'), '29T1-123.45')
  assert.equal(formatLicensePlate('43-LD12345'), '43LD-123.45')
})

test('formatLicensePlate keeps unknown input safe', () => {
  assert.equal(formatLicensePlate('ABC123'), 'ABC123')
  assert.equal(formatLicensePlate(''), '')
})
