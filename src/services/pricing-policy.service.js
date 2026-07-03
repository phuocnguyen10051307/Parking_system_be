import { StatusCodes } from 'http-status-codes'

import { prisma } from '../config/prisma.js'
import ApiError from '../utils/ApiError.js'

const MANAGEMENT_ROLES = ['ADMIN', 'MANAGER']
const VEHICLE_TYPES = ['MOTORBIKE', 'CAR', 'BICYCLE', 'ELECTRIC_BIKE']

const DEFAULT_PRICING_POLICIES = [
  {
    name: 'Apartment Car Pricing',
    vehicleType: 'CAR',
    monthlyFee: '1250000',
    daytimeBlockFee: '15000',
    eveningBlockFee: '20000',
    overnightFlatFee: '100000',
    blockDurationMinutes: 120,
    gracePeriodMinutes: 15,
    daytimeStartMinutes: 360,
    daytimeEndMinutes: 1049,
    eveningStartMinutes: 1080,
    eveningEndMinutes: 1439,
    firstHourFee: '15000',
    extraHourFee: '20000',
    lostTicketFee: '100000',
    isActive: true,
  },
]

const pricingPolicySelect = {
  id: true,
  name: true,
  vehicleType: true,
  monthlyFee: true,
  daytimeBlockFee: true,
  eveningBlockFee: true,
  overnightFlatFee: true,
  blockDurationMinutes: true,
  gracePeriodMinutes: true,
  daytimeStartMinutes: true,
  daytimeEndMinutes: true,
  eveningStartMinutes: true,
  eveningEndMinutes: true,
  firstHourFee: true,
  extraHourFee: true,
  lostTicketFee: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
}

const toNumber = (value) => Number(value)
const addMinutes = (date, minutes) => new Date(date.getTime() + minutes * 60000)

const getSegmentMinutes = (rangeStart, rangeEnd, segmentStart, segmentEnd) => {
  const start = Math.max(rangeStart.getTime(), segmentStart.getTime())
  const end = Math.min(rangeEnd.getTime(), segmentEnd.getTime())

  return end > start ? Math.ceil((end - start) / 60000) : 0
}

const normalizePolicy = (policy) => ({
  ...policy,
  monthlyFee: toNumber(policy.monthlyFee),
  daytimeBlockFee: toNumber(policy.daytimeBlockFee),
  eveningBlockFee: toNumber(policy.eveningBlockFee),
  overnightFlatFee: toNumber(policy.overnightFlatFee),
  firstHourFee: toNumber(policy.firstHourFee),
  extraHourFee: toNumber(policy.extraHourFee),
  lostTicketFee: toNumber(policy.lostTicketFee),
})

const getPolicySegmentWindows = (policy, currentDay) => {
  const daytimeStart = new Date(currentDay)
  daytimeStart.setHours(0, 0, 0, 0)
  daytimeStart.setMinutes(policy.daytimeStartMinutes)

  const daytimeEnd = new Date(currentDay)
  daytimeEnd.setHours(0, 0, 0, 0)
  daytimeEnd.setMinutes(policy.daytimeEndMinutes + 1)

  const eveningStart = new Date(currentDay)
  eveningStart.setHours(0, 0, 0, 0)
  eveningStart.setMinutes(policy.eveningStartMinutes)

  const nextDay = addMinutes(new Date(currentDay), 24 * 60)
  const eveningEnd = new Date(nextDay)
  eveningEnd.setHours(0, 0, 0, 0)

  const overnightStart = new Date(currentDay)
  overnightStart.setHours(0, 0, 0, 0)

  const overnightEnd = new Date(currentDay)
  overnightEnd.setHours(0, 0, 0, 0)
  overnightEnd.setMinutes(policy.daytimeStartMinutes)

  return {
    daytimeStart,
    daytimeEnd,
    eveningStart,
    eveningEnd,
    overnightStart,
    overnightEnd,
  }
}

const validateVehicleType = (vehicleType) => {
  if (!VEHICLE_TYPES.includes(vehicleType)) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Invalid vehicle type. Allowed values: MOTORBIKE, CAR, BICYCLE, ELECTRIC_BIKE'
    )
  }
}

const ensureManagementRole = (currentUser) => {
  if (!currentUser || !MANAGEMENT_ROLES.includes(currentUser.role)) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You do not have permission to manage pricing policies')
  }
}

const validatePricingPayload = (payload = {}) => {
  if (!payload.name?.trim()) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Pricing policy name is required')
  }

  validateVehicleType(payload.vehicleType)

  const requiredNumberFields = [
    'monthlyFee',
    'daytimeBlockFee',
    'eveningBlockFee',
    'overnightFlatFee',
    'blockDurationMinutes',
    'gracePeriodMinutes',
    'daytimeStartMinutes',
    'daytimeEndMinutes',
    'eveningStartMinutes',
    'eveningEndMinutes',
  ]

  for (const field of requiredNumberFields) {
    const value = Number(payload[field])

    if (!Number.isFinite(value) || value < 0) {
      throw new ApiError(StatusCodes.BAD_REQUEST, `${field} must be a non-negative number`)
    }
  }

  if (Number(payload.daytimeStartMinutes) >= Number(payload.daytimeEndMinutes)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'daytimeStartMinutes must be less than daytimeEndMinutes')
  }

  if (Number(payload.eveningStartMinutes) >= Number(payload.eveningEndMinutes)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'eveningStartMinutes must be less than eveningEndMinutes')
  }
}

const toPersistenceData = (payload) => ({
  name: payload.name.trim(),
  vehicleType: payload.vehicleType,
  monthlyFee: Number(payload.monthlyFee),
  daytimeBlockFee: Number(payload.daytimeBlockFee),
  eveningBlockFee: Number(payload.eveningBlockFee),
  overnightFlatFee: Number(payload.overnightFlatFee),
  blockDurationMinutes: Number(payload.blockDurationMinutes),
  gracePeriodMinutes: Number(payload.gracePeriodMinutes),
  daytimeStartMinutes: Number(payload.daytimeStartMinutes),
  daytimeEndMinutes: Number(payload.daytimeEndMinutes),
  eveningStartMinutes: Number(payload.eveningStartMinutes),
  eveningEndMinutes: Number(payload.eveningEndMinutes),
  firstHourFee: Number(payload.daytimeBlockFee),
  extraHourFee: Number(payload.eveningBlockFee),
  lostTicketFee: Number(payload.overnightFlatFee),
  isActive: payload.isActive !== false,
})

const ensureDefaultPricingPolicies = async () => {
  for (const policy of DEFAULT_PRICING_POLICIES) {
    const existingPolicy = await prisma.pricingPolicy.findFirst({
      where: {
        name: policy.name,
        vehicleType: policy.vehicleType,
      },
    })

    if (!existingPolicy) {
      await prisma.pricingPolicy.create({
        data: policy,
      })
      continue
    }

    const needsUpdate =
      Number(existingPolicy.monthlyFee ?? 0) !== Number(policy.monthlyFee) ||
      Number(existingPolicy.daytimeBlockFee ?? 0) !== Number(policy.daytimeBlockFee) ||
      Number(existingPolicy.eveningBlockFee ?? 0) !== Number(policy.eveningBlockFee) ||
      Number(existingPolicy.overnightFlatFee ?? 0) !== Number(policy.overnightFlatFee)

    if (needsUpdate) {
      await prisma.pricingPolicy.update({
        where: { id: existingPolicy.id },
        data: {
          monthlyFee: Number(policy.monthlyFee),
          daytimeBlockFee: Number(policy.daytimeBlockFee),
          eveningBlockFee: Number(policy.eveningBlockFee),
          overnightFlatFee: Number(policy.overnightFlatFee),
          blockDurationMinutes: policy.blockDurationMinutes,
          gracePeriodMinutes: policy.gracePeriodMinutes,
          daytimeStartMinutes: policy.daytimeStartMinutes,
          daytimeEndMinutes: policy.daytimeEndMinutes,
          eveningStartMinutes: policy.eveningStartMinutes,
          eveningEndMinutes: policy.eveningEndMinutes,
          firstHourFee: Number(policy.firstHourFee),
          extraHourFee: Number(policy.extraHourFee),
          lostTicketFee: Number(policy.lostTicketFee),
          isActive: true,
        },
      })
    }
  }
}

const getPricingPolicies = async () => {
  await ensureDefaultPricingPolicies()

  const policies = await prisma.pricingPolicy.findMany({
    select: pricingPolicySelect,
    orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
  })

  return policies.map(normalizePolicy)
}

const getActivePricingPolicy = async (vehicleType = 'CAR') => {
  await ensureDefaultPricingPolicies()
  validateVehicleType(vehicleType)

  const policy =
    (await prisma.pricingPolicy.findFirst({
      where: {
        vehicleType,
        isActive: true,
      },
      select: pricingPolicySelect,
      orderBy: {
        createdAt: 'desc',
      },
    })) ||
    (await prisma.pricingPolicy.findFirst({
      where: {
        vehicleType: 'CAR',
        isActive: true,
      },
      select: pricingPolicySelect,
      orderBy: {
        createdAt: 'desc',
      },
    }))

  if (!policy) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Active pricing policy not found')
  }

  return normalizePolicy(policy)
}

const calculateParkingFeeFromPolicy = (policy, entryTime, exitTime) => {
  const normalizedPolicy = normalizePolicy(policy)
  const normalizedEntryTime = new Date(entryTime)
  const normalizedExitTime = new Date(exitTime)
  const parkedMinutes = Math.max(0, Math.ceil((normalizedExitTime.getTime() - normalizedEntryTime.getTime()) / 60000))

  if (parkedMinutes <= normalizedPolicy.gracePeriodMinutes) {
    return 0
  }

  let total = 0
  const currentDay = new Date(normalizedEntryTime)
  currentDay.setHours(0, 0, 0, 0)

  while (currentDay < normalizedExitTime) {
    const { daytimeStart, daytimeEnd, eveningStart, eveningEnd, overnightStart, overnightEnd } =
      getPolicySegmentWindows(normalizedPolicy, currentDay)

    const overnightMinutes = getSegmentMinutes(normalizedEntryTime, normalizedExitTime, overnightStart, overnightEnd)
    const daytimeMinutes = getSegmentMinutes(normalizedEntryTime, normalizedExitTime, daytimeStart, daytimeEnd)
    const eveningMinutes = getSegmentMinutes(normalizedEntryTime, normalizedExitTime, eveningStart, eveningEnd)

    if (overnightMinutes > 0) {
      total += normalizedPolicy.overnightFlatFee
    }

    if (daytimeMinutes > 0) {
      total += Math.ceil(daytimeMinutes / normalizedPolicy.blockDurationMinutes) * normalizedPolicy.daytimeBlockFee
    }

    if (eveningMinutes > 0) {
      total += Math.ceil(eveningMinutes / normalizedPolicy.blockDurationMinutes) * normalizedPolicy.eveningBlockFee
    }

    currentDay.setDate(currentDay.getDate() + 1)
  }

  return total
}

const createPricingPolicy = async (currentUser, payload) => {
  ensureManagementRole(currentUser)
  validatePricingPayload(payload)

  if (payload.isActive !== false) {
    await prisma.pricingPolicy.updateMany({
      where: {
        vehicleType: payload.vehicleType,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    })
  }

  const createdPolicy = await prisma.pricingPolicy.create({
    data: toPersistenceData(payload),
    select: pricingPolicySelect,
  })

  return normalizePolicy(createdPolicy)
}

const updatePricingPolicy = async (currentUser, pricingPolicyId, payload) => {
  ensureManagementRole(currentUser)
  validatePricingPayload(payload)

  const existingPolicy = await prisma.pricingPolicy.findUnique({
    where: { id: pricingPolicyId },
    select: {
      id: true,
    },
  })

  if (!existingPolicy) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Pricing policy not found')
  }

  if (payload.isActive !== false) {
    await prisma.pricingPolicy.updateMany({
      where: {
        vehicleType: payload.vehicleType,
        isActive: true,
        NOT: {
          id: pricingPolicyId,
        },
      },
      data: {
        isActive: false,
      },
    })
  }

  const updatedPolicy = await prisma.pricingPolicy.update({
    where: { id: pricingPolicyId },
    data: toPersistenceData(payload),
    select: pricingPolicySelect,
  })

  return normalizePolicy(updatedPolicy)
}

export const pricingPolicyService = {
  getPricingPolicies,
  getActivePricingPolicy,
  calculateParkingFeeFromPolicy,
  createPricingPolicy,
  updatePricingPolicy,
}
