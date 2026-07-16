import { StatusCodes } from 'http-status-codes'

import { prisma } from '../config/prisma.js'
import ApiError from '../utils/ApiError.js'
import { formatLicensePlate } from '../utils/license-plate.js'

const STAFF_ROLES = ['ADMIN', 'MANAGER', 'STAFF']
const ACTIVE_RESERVATION_STATUSES = ['PENDING', 'CONFIRMED']
const EARLY_CHECK_IN_WINDOW_HOURS = 4
const LATE_CHECK_IN_GRACE_HOURS = 2
const RESERVATION_BOOKING_WINDOW_DAYS = 5
const HOUR_IN_MS = 60 * 60 * 1000
const DAY_IN_MS = 24 * HOUR_IN_MS

const isStaffRole = (role) => STAFF_ROLES.includes(role)
const addHours = (date, hours) => new Date(date.getTime() + hours * HOUR_IN_MS)
const addDays = (date, days) => new Date(date.getTime() + days * DAY_IN_MS)

const reservationSelect = {
  id: true,
  userId: true,
  vehicleId: true,
  slotId: true,
  startTime: true,
  endTime: true,
  status: true,
  createdAt: true,
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
      licensePlate: true,
      vehicleType: true,
      brand: true,
      color: true,
    },
  },
  slot: {
    select: {
      id: true,
      slotCode: true,
      vehicleType: true,
      status: true,
      zone: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
}

const normalizeReservation = (reservation) => {
  if (!reservation) {
    return reservation
  }

  return {
    ...reservation,
    vehicle: reservation.vehicle
      ? {
          ...reservation.vehicle,
          licensePlate: formatLicensePlate(reservation.vehicle.licensePlate),
        }
      : reservation.vehicle,
  }
}

export const buildReservationCreateData = (payload, currentUserId) => {
  const { vehicleId, slotId, startTime, endTime } = payload

  return {
    userId: currentUserId,
    vehicleId,
    slotId,
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    status: 'PENDING',
  }
}

export const getReservationBookingWindow = (baseTime = new Date()) => ({
  minStartTime: baseTime,
  maxEndTime: addDays(baseTime, RESERVATION_BOOKING_WINDOW_DAYS),
})

export const getReservationCheckInWindow = (reservationOrStartTime) => {
  const startTime = reservationOrStartTime instanceof Date
    ? reservationOrStartTime
    : new Date(reservationOrStartTime?.startTime ?? reservationOrStartTime)

  return {
    opensAt: addHours(startTime, -EARLY_CHECK_IN_WINDOW_HOURS),
    expiresAt: addHours(startTime, LATE_CHECK_IN_GRACE_HOURS),
  }
}

export const canCheckInWithReservation = (reservation, checkInTime = new Date()) => {
  const { opensAt, expiresAt } = getReservationCheckInWindow(reservation)
  return checkInTime >= opensAt && checkInTime <= expiresAt
}

export const cleanupExpiredReservations = async (client = prisma, now = new Date()) => {
  const expiredStartTime = addHours(now, -LATE_CHECK_IN_GRACE_HOURS)

  return client.reservation.deleteMany({
    where: {
      status: {
        in: ACTIVE_RESERVATION_STATUSES,
      },
      startTime: {
        lt: expiredStartTime,
      },
    },
  })
}

export const findReservationForCheckIn = async (client, { slotId, vehicleId, checkInTime = new Date() }) => {
  await cleanupExpiredReservations(client, checkInTime)

  const reservation = await client.reservation.findFirst({
    where: {
      slotId,
      status: {
        in: ACTIVE_RESERVATION_STATUSES,
      },
    },
    orderBy: {
      startTime: 'asc',
    },
  })

  if (!reservation) {
    return null
  }

  if (reservation.vehicleId !== vehicleId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Parking slot is reserved for another vehicle')
  }

  const { opensAt } = getReservationCheckInWindow(reservation)

  if (checkInTime < opensAt) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `This reservation can only be checked in within ${EARLY_CHECK_IN_WINDOW_HOURS} hours before the start time`
    )
  }

  if (!canCheckInWithReservation(reservation, checkInTime)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'This reservation is no longer valid for check-in')
  }

  return reservation
}

export const removeReservationAfterCheckIn = async (client, reservationId) => {
  if (!reservationId) {
    return null
  }

  return client.reservation.delete({
    where: {
      id: reservationId,
    },
  })
}

export const canCancelReservation = (currentUser, reservation, role) => {
  const reservationOwnerId = reservation?.userId || reservation?.id
  const actorId = currentUser?.userId || currentUser?._id

  if (isStaffRole(role)) {
    return true
  }

  return Boolean(actorId && reservationOwnerId && actorId === reservationOwnerId)
}

const getReservations = async (currentUser, query = {}) => {
  await cleanupExpiredReservations(prisma)

  const where = {}

  if (!isStaffRole(currentUser.role)) {
    where.userId = currentUser._id
  }

  if (query.userId && isStaffRole(currentUser.role)) {
    where.userId = query.userId
  }

  if (query.status) {
    where.status = query.status
  }

  const reservations = await prisma.reservation.findMany({
    where,
    select: reservationSelect,
    orderBy: {
      createdAt: 'desc',
    },
  })

  return reservations.map(normalizeReservation)
}

const getReservationById = async (currentUser, reservationId) => {
  await cleanupExpiredReservations(prisma)

  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    select: reservationSelect,
  })

  if (!reservation) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Reservation not found')
  }

  if (!isStaffRole(currentUser.role) && reservation.userId !== currentUser._id) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You do not have permission to access this reservation')
  }

  return normalizeReservation(reservation)
}

const createReservation = async (currentUser, payload) => {
  const { vehicleId, slotId, startTime, endTime } = payload

  if (!vehicleId || !slotId || !startTime || !endTime) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'vehicleId, slotId, startTime and endTime are required')
  }

  const start = new Date(startTime)
  const end = new Date(endTime)
  const now = new Date()
  const { maxEndTime } = getReservationBookingWindow(now)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'startTime and endTime must be valid dates')
  }

  if (start >= end) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'endTime must be later than startTime')
  }

  if (start <= now) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'startTime must be later than the current time')
  }

  if (end <= now) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'endTime must be later than the current time')
  }

  if (start > maxEndTime || end > maxEndTime) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Reservations can only be created within ${RESERVATION_BOOKING_WINDOW_DAYS} days from now`
    )
  }

  await cleanupExpiredReservations(prisma, now)

  const vehicle = await prisma.vehicle.findFirst({
    where: {
      id: vehicleId,
      ownerId: currentUser._id,
    },
  })

  if (!vehicle) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Vehicle not found')
  }

  const slot = await prisma.parkingSlot.findUnique({
    where: { id: slotId },
  })

  if (!slot) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Parking slot not found')
  }

  if (!slot.isActive) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Parking slot is not active')
  }

  if (slot.status !== 'AVAILABLE') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Parking slot is not available')
  }

  const [activeSession, conflictingReservation] = await Promise.all([
    prisma.parkingSession.findFirst({
      where: {
        status: 'ACTIVE',
        OR: [{ vehicleId }, { slotId }],
      },
      select: { id: true },
    }),
    prisma.reservation.findFirst({
      where: {
        status: {
          in: ACTIVE_RESERVATION_STATUSES,
        },
        OR: [
          {
            slotId,
            startTime: { lt: end },
            endTime: { gt: start },
          },
          {
            vehicleId,
            startTime: { lt: end },
            endTime: { gt: start },
          },
        ],
      },
      select: { id: true },
    }),
  ])

  if (activeSession) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'The selected vehicle or slot already has an active parking session')
  }

  if (conflictingReservation) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'The selected vehicle or slot already has a conflicting reservation')
  }

  const reservationData = buildReservationCreateData(payload, currentUser._id)
  const reservation = await prisma.reservation.create({
    data: reservationData,
    select: reservationSelect,
  })

  return normalizeReservation(reservation)
}

const cancelReservation = async (currentUser, reservationId) => {
  const reservation = await getReservationById(currentUser, reservationId)

  if (!canCancelReservation(currentUser, reservation, currentUser.role)) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You do not have permission to cancel this reservation')
  }

  if (reservation.status === 'CANCELLED') {
    return reservation
  }

  const updatedReservation = await prisma.reservation.update({
    where: { id: reservationId },
    data: { status: 'CANCELLED' },
    select: reservationSelect,
  })

  return normalizeReservation(updatedReservation)
}

export const reservationService = {
  getReservations,
  getReservationById,
  createReservation,
  cancelReservation,
  buildReservationCreateData,
  getReservationBookingWindow,
  getReservationCheckInWindow,
  canCheckInWithReservation,
  cleanupExpiredReservations,
  findReservationForCheckIn,
  removeReservationAfterCheckIn,
  canCancelReservation,
}
