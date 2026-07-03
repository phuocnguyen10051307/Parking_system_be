import { StatusCodes } from 'http-status-codes'

import { prisma } from '../config/prisma.js'
import ApiError from '../utils/ApiError.js'
import { formatLicensePlate } from '../utils/license-plate.js'

const STAFF_ROLES = ['ADMIN', 'MANAGER', 'STAFF']

const isStaffRole = (role) => STAFF_ROLES.includes(role)

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

export const canCancelReservation = (currentUser, reservation, role) => {
  const reservationOwnerId = reservation?.userId || reservation?.id
  const actorId = currentUser?.userId || currentUser?._id

  if (isStaffRole(role)) {
    return true
  }

  return Boolean(actorId && reservationOwnerId && actorId === reservationOwnerId)
}

const getReservations = async (currentUser, query = {}) => {
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

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'startTime and endTime must be valid dates')
  }

  if (start >= end) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'endTime must be later than startTime')
  }

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
  canCancelReservation,
}
