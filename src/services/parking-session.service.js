import { StatusCodes } from 'http-status-codes'

import { prisma } from '../config/prisma.js'
import ApiError from '../utils/ApiError.js'

const STAFF_ROLES = ['ADMIN', 'MANAGER', 'STAFF']

const isStaffRole = (role) => STAFF_ROLES.includes(role)

const parkingSessionSelect = {
  id: true,
  vehicleId: true,
  userId: true,
  slotId: true,
  entryTime: true,
  exitTime: true,
  entryGate: true,
  exitGate: true,
  status: true,
  totalFee: true,
  note: true,
  createdAt: true,
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
    },
  },
  user: {
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
    },
  },
}

export const buildParkingSessionCheckInData = (payload, currentUserId) => ({
  vehicleId: payload.vehicleId,
  userId: currentUserId,
  slotId: payload.slotId,
  entryTime: new Date(),
  entryGate: payload.entryGate,
  status: 'ACTIVE',
})

export const buildParkingSessionCheckOutData = (payload) => ({
  exitTime: new Date(),
  exitGate: payload.exitGate,
  status: 'COMPLETED',
})

export const canViewParkingSession = (currentUser, session, role) => {
  const actorId = currentUser?._id || currentUser?.userId
  const ownerId = session?.userId

  if (isStaffRole(role)) {
    return true
  }

  return Boolean(actorId && ownerId && actorId === ownerId)
}

const getParkingSessions = async (currentUser, query = {}) => {
  const where = {}

  if (!isStaffRole(currentUser.role)) {
    where.userId = currentUser._id
  }

  if (query.status) {
    where.status = query.status
  }

  return prisma.parkingSession.findMany({
    where,
    select: parkingSessionSelect,
    orderBy: {
      createdAt: 'desc',
    },
  })
}

const getParkingSessionById = async (currentUser, parkingSessionId) => {
  const session = await prisma.parkingSession.findUnique({
    where: { id: parkingSessionId },
    select: parkingSessionSelect,
  })

  if (!session) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Parking session not found')
  }

  if (!canViewParkingSession(currentUser, session, currentUser.role)) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You do not have permission to access this parking session')
  }

  return session
}

const checkInParkingSession = async (currentUser, payload) => {
  const { vehicleId, slotId, entryGate } = payload

  if (!vehicleId || !slotId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'vehicleId and slotId are required')
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

  if (slot.status !== 'AVAILABLE') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Parking slot is not available')
  }

  const sessionData = buildParkingSessionCheckInData(payload, currentUser._id)

  return prisma.parkingSession.create({
    data: sessionData,
    select: parkingSessionSelect,
  })
}

const checkOutParkingSession = async (currentUser, parkingSessionId, payload) => {
  const session = await getParkingSessionById(currentUser, parkingSessionId)

  if (session.status === 'COMPLETED') {
    return session
  }

  const updateData = buildParkingSessionCheckOutData(payload)

  return prisma.parkingSession.update({
    where: { id: parkingSessionId },
    data: updateData,
    select: parkingSessionSelect,
  })
}

export const parkingSessionService = {
  getParkingSessions,
  getParkingSessionById,
  checkInParkingSession,
  checkOutParkingSession,
  buildParkingSessionCheckInData,
  buildParkingSessionCheckOutData,
  canViewParkingSession,
}
