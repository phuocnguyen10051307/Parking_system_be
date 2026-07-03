import { StatusCodes } from 'http-status-codes'

import { prisma } from '../config/prisma.js'
import ApiError from '../utils/ApiError.js'
import { pricingPolicyService } from './pricing-policy.service.js'
import { formatLicensePlate } from '../utils/license-plate.js'

const STAFF_ROLES = ['ADMIN', 'MANAGER', 'STAFF']
const PAYMENT_METHODS = ['CASH', 'BANKING', 'E_WALLET']
const SUBSCRIPTION_STATUSES = ['ACTIVE', 'EXPIRED', 'CANCELLED']

const monthlySubscriptionSelect = {
  id: true,
  userId: true,
  vehicleId: true,
  pricingPolicyId: true,
  vehicleType: true,
  durationMonths: true,
  monthlyFee: true,
  totalAmount: true,
  startDate: true,
  endDate: true,
  status: true,
  paymentMethod: true,
  paidAt: true,
  note: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
    },
  },
  vehicle: {
    select: {
      id: true,
      ownerId: true,
      licensePlate: true,
      vehicleType: true,
      brand: true,
      color: true,
    },
  },
  pricingPolicy: {
    select: {
      id: true,
      name: true,
      vehicleType: true,
      monthlyFee: true,
      isActive: true,
    },
  },
}

const isStaffRole = (role) => STAFF_ROLES.includes(role)
const toNumber = (value) => Number(value)

const addMonths = (date, months) => {
  const nextDate = new Date(date)
  nextDate.setMonth(nextDate.getMonth() + months)
  return nextDate
}

const normalizeMonthlySubscription = (subscription) => {
  if (!subscription) {
    return subscription
  }

  return {
    ...subscription,
    monthlyFee: toNumber(subscription.monthlyFee),
    totalAmount: toNumber(subscription.totalAmount),
    vehicle: subscription.vehicle
      ? {
          ...subscription.vehicle,
          licensePlate: formatLicensePlate(subscription.vehicle.licensePlate),
        }
      : subscription.vehicle,
    pricingPolicy: subscription.pricingPolicy
      ? {
          ...subscription.pricingPolicy,
          monthlyFee: toNumber(subscription.pricingPolicy.monthlyFee),
        }
      : subscription.pricingPolicy,
  }
}

const validatePaymentMethod = (paymentMethod = 'CASH') => {
  if (!PAYMENT_METHODS.includes(paymentMethod)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid payment method. Allowed values: CASH, BANKING, E_WALLET')
  }

  return paymentMethod
}

const validateSubscriptionStatus = (status) => {
  if (status && !SUBSCRIPTION_STATUSES.includes(status)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid status. Allowed values: ACTIVE, EXPIRED, CANCELLED')
  }
}

const validateDurationMonths = (durationMonths) => {
  const normalizedDuration = Number(durationMonths)

  if (!Number.isInteger(normalizedDuration) || normalizedDuration <= 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'durationMonths must be a positive integer')
  }

  return normalizedDuration
}

const validateDate = (value, fieldName) => {
  const date = value ? new Date(value) : new Date()

  if (Number.isNaN(date.getTime())) {
    throw new ApiError(StatusCodes.BAD_REQUEST, `${fieldName} must be a valid date`)
  }

  return date
}

const syncExpiredSubscriptions = async (client = prisma) => {
  await client.monthlySubscription.updateMany({
    where: {
      status: 'ACTIVE',
      endDate: {
        lte: new Date(),
      },
    },
    data: {
      status: 'EXPIRED',
    },
  })
}

const getVehicleForSubscription = async (currentUser, vehicleId) => {
  if (!vehicleId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'vehicleId is required')
  }

  const where = { id: vehicleId }

  if (!isStaffRole(currentUser.role)) {
    where.ownerId = currentUser._id
  }

  const vehicle = await prisma.vehicle.findFirst({
    where,
    select: {
      id: true,
      ownerId: true,
      licensePlate: true,
      vehicleType: true,
      brand: true,
      color: true,
    },
  })

  if (!vehicle) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Vehicle not found')
  }

  return vehicle
}

const getAccessibleMonthlySubscription = async (currentUser, subscriptionId) => {
  await syncExpiredSubscriptions()

  const subscription = await prisma.monthlySubscription.findUnique({
    where: { id: subscriptionId },
    select: monthlySubscriptionSelect,
  })

  if (!subscription) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Monthly subscription not found')
  }

  if (!isStaffRole(currentUser.role) && subscription.userId !== currentUser._id) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You do not have permission to access this monthly subscription')
  }

  return subscription
}

const findActiveMonthlySubscription = async (client, vehicleId, targetDate = new Date()) => {
  return client.monthlySubscription.findFirst({
    where: {
      vehicleId,
      status: 'ACTIVE',
      startDate: {
        lte: targetDate,
      },
      endDate: {
        gt: targetDate,
      },
    },
    select: monthlySubscriptionSelect,
    orderBy: {
      endDate: 'desc',
    },
  })
}

const findOverlappingMonthlySubscription = async (client, vehicleId, startDate, endDate, excludeSubscriptionId = null) => {
  return client.monthlySubscription.findFirst({
    where: {
      vehicleId,
      status: 'ACTIVE',
      startDate: {
        lt: endDate,
      },
      endDate: {
        gt: startDate,
      },
      ...(excludeSubscriptionId
        ? {
            NOT: {
              id: excludeSubscriptionId,
            },
          }
        : {}),
    },
    select: monthlySubscriptionSelect,
    orderBy: {
      endDate: 'desc',
    },
  })
}

const hasActiveMonthlySubscription = async (client, vehicleId, targetDate = new Date()) => {
  const subscription = await findActiveMonthlySubscription(client, vehicleId, targetDate)
  return Boolean(subscription)
}

const getMonthlySubscriptions = async (currentUser, query = {}) => {
  await syncExpiredSubscriptions()
  validateSubscriptionStatus(query.status)

  const where = {}

  if (!isStaffRole(currentUser.role)) {
    where.userId = currentUser._id
  }

  if (query.ownerId && isStaffRole(currentUser.role)) {
    where.userId = query.ownerId
  }

  if (query.vehicleId) {
    where.vehicleId = query.vehicleId
  }

  if (query.status) {
    where.status = query.status
  }

  const subscriptions = await prisma.monthlySubscription.findMany({
    where,
    select: monthlySubscriptionSelect,
    orderBy: [{ status: 'asc' }, { endDate: 'desc' }, { createdAt: 'desc' }],
  })

  return subscriptions.map(normalizeMonthlySubscription)
}

const getMonthlySubscriptionById = async (currentUser, subscriptionId) => {
  const subscription = await getAccessibleMonthlySubscription(currentUser, subscriptionId)
  return normalizeMonthlySubscription(subscription)
}

const createMonthlySubscription = async (currentUser, payload = {}) => {
  const durationMonths = validateDurationMonths(payload.durationMonths || 1)
  const paymentMethod = validatePaymentMethod(payload.paymentMethod || 'CASH')
  const startDate = validateDate(payload.startDate, 'startDate')
  const vehicle = await getVehicleForSubscription(currentUser, payload.vehicleId)

  await syncExpiredSubscriptions()

  const pricingPolicy = await pricingPolicyService.getActivePricingPolicy(vehicle.vehicleType)
  const monthlyFee = toNumber(pricingPolicy.monthlyFee)
  const totalAmount = monthlyFee * durationMonths
  const endDate = addMonths(startDate, durationMonths)
  const overlappedSubscription = await findOverlappingMonthlySubscription(prisma, vehicle.id, startDate, endDate)

  if (overlappedSubscription) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'This vehicle already has an active monthly subscription for that period')
  }

  const subscription = await prisma.monthlySubscription.create({
    data: {
      userId: vehicle.ownerId,
      vehicleId: vehicle.id,
      pricingPolicyId: pricingPolicy.id,
      vehicleType: vehicle.vehicleType,
      durationMonths,
      monthlyFee,
      totalAmount,
      startDate,
      endDate,
      status: 'ACTIVE',
      paymentMethod,
      paidAt: new Date(),
      note: payload.note?.trim() || null,
    },
    select: monthlySubscriptionSelect,
  })

  return normalizeMonthlySubscription(subscription)
}

const renewMonthlySubscription = async (currentUser, subscriptionId, payload = {}) => {
  const subscription = await getAccessibleMonthlySubscription(currentUser, subscriptionId)

  if (subscription.status === 'CANCELLED') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Cancelled monthly subscriptions cannot be renewed')
  }

  const durationMonths = validateDurationMonths(payload.durationMonths || 1)
  const paymentMethod = validatePaymentMethod(payload.paymentMethod || subscription.paymentMethod || 'CASH')
  const renewalBaseDate = subscription.endDate > new Date() ? subscription.endDate : new Date()
  const pricingPolicy = await pricingPolicyService.getActivePricingPolicy(subscription.vehicleType)
  const monthlyFee = toNumber(pricingPolicy.monthlyFee)
  const additionalAmount = monthlyFee * durationMonths
  const nextEndDate = addMonths(renewalBaseDate, durationMonths)
  const overlappedSubscription = await findOverlappingMonthlySubscription(
    prisma,
    subscription.vehicleId,
    renewalBaseDate,
    nextEndDate,
    subscriptionId
  )

  if (overlappedSubscription) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'This renewal overlaps another active monthly subscription')
  }

  const renewedSubscription = await prisma.monthlySubscription.update({
    where: { id: subscriptionId },
    data: {
      pricingPolicyId: pricingPolicy.id,
      durationMonths: subscription.durationMonths + durationMonths,
      monthlyFee,
      totalAmount: toNumber(subscription.totalAmount) + additionalAmount,
      endDate: nextEndDate,
      status: 'ACTIVE',
      paymentMethod,
      paidAt: new Date(),
      note: payload.note?.trim() || subscription.note,
    },
    select: monthlySubscriptionSelect,
  })

  return normalizeMonthlySubscription(renewedSubscription)
}

const cancelMonthlySubscription = async (currentUser, subscriptionId, payload = {}) => {
  const subscription = await getAccessibleMonthlySubscription(currentUser, subscriptionId)

  if (subscription.status === 'CANCELLED') {
    return normalizeMonthlySubscription(subscription)
  }

  const cancelledSubscription = await prisma.monthlySubscription.update({
    where: { id: subscriptionId },
    data: {
      status: 'CANCELLED',
      note: payload.note?.trim() || subscription.note,
    },
    select: monthlySubscriptionSelect,
  })

  return normalizeMonthlySubscription(cancelledSubscription)
}

export const monthlySubscriptionService = {
  getMonthlySubscriptions,
  getMonthlySubscriptionById,
  createMonthlySubscription,
  renewMonthlySubscription,
  cancelMonthlySubscription,
  findActiveMonthlySubscription,
  findOverlappingMonthlySubscription,
  hasActiveMonthlySubscription,
  syncExpiredSubscriptions,
}
