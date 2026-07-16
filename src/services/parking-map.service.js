import { prisma } from '../config/prisma.js'
import { formatLicensePlate } from '../utils/license-plate.js'

const STAFF_ROLES = ['ADMIN', 'MANAGER', 'STAFF']

const slotSelect = {
  id: true,
  zoneId: true,
  slotCode: true,
  vehicleType: true,
  status: true,
  isActive: true,
  createdAt: true,
  zone: {
    select: {
      id: true,
      name: true,
      floor: {
        select: {
          id: true,
          floorNumber: true,
          vehicleType: true,
          building: {
            select: {
              id: true,
              name: true,
              address: true,
            },
          },
        },
      },
    },
  },
}

const activeSessionSelect = {
  id: true,
  slotId: true,
  vehicle: {
    select: {
      ownerId: true,
      licensePlate: true,
      vehicleType: true,
      brand: true,
      color: true,
    },
  },
}

const activeReservationSelect = {
  id: true,
  slotId: true,
  startTime: true,
  endTime: true,
  status: true,
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
}

const sortFloors = (a, b) => a.floorNumber - b.floorNumber || a.building.name.localeCompare(b.building.name)

const isStaffRole = (role) => STAFF_ROLES.includes(role)

const buildParkingMapBuildings = (slots, slotStateBySlotId) => {
  const buildingsById = new Map()

  for (const slot of slots) {
    const building = slot.zone?.floor?.building

    if (!building) {
      continue
    }

    const slotState = slotStateBySlotId.get(slot.id) || {
      isOccupied: false,
      isReserved: false,
      isOwnedByCurrentUser: false,
      visiblePlate: null,
      activeSession: null,
      activeReservation: null,
    }
    const mapSlot = {
      ...slot,
      isOccupied: slotState.isOccupied,
      isReserved: slotState.isReserved,
      isOwnedByCurrentUser: slotState.isOwnedByCurrentUser,
      visiblePlate: slotState.visiblePlate,
      activeSession: slotState.activeSession,
      activeReservation: slotState.activeReservation,
    }

    let mapBuilding = buildingsById.get(building.id)

    if (!mapBuilding) {
      mapBuilding = {
        id: building.id,
        name: building.name,
        address: building.address,
        floors: [],
        occupiedCount: 0,
        totalCount: 0,
      }
      buildingsById.set(building.id, mapBuilding)
    }

    let floor = mapBuilding.floors.find((item) => item.id === slot.zone.floor.id)

    if (!floor) {
      floor = {
        id: slot.zone.floor.id,
        floorNumber: slot.zone.floor.floorNumber,
        building,
        slots: [],
        occupiedCount: 0,
        totalCount: 0,
      }
      mapBuilding.floors.push(floor)
    }

    floor.slots.push(mapSlot)
    floor.totalCount += 1
    mapBuilding.totalCount += 1

    if (mapSlot.isOccupied || mapSlot.isReserved) {
      floor.occupiedCount += 1
      mapBuilding.occupiedCount += 1
    }
  }

  return [...buildingsById.values()]
    .map((building) => ({
      ...building,
      floors: building.floors.sort(sortFloors),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

const getPublicParkingMap = async (currentUser) => {
  const now = new Date()
  const canViewAllPlates = isStaffRole(currentUser.role)
  const [slots, activeSessions, activeReservations] = await Promise.all([
    prisma.parkingSlot.findMany({
      where: { isActive: true },
      select: slotSelect,
      orderBy: { slotCode: 'asc' },
    }),
    prisma.parkingSession.findMany({
      where: { status: 'ACTIVE' },
      select: activeSessionSelect,
    }),
    prisma.reservation.findMany({
      where: {
        status: { in: ['PENDING', 'CONFIRMED'] },
        endTime: { gte: now },
      },
      select: activeReservationSelect,
      orderBy: [{ startTime: 'asc' }, { createdAt: 'asc' }],
    }),
  ])

  const slotStateBySlotId = new Map(
    activeSessions
      .filter((session) => session.slotId)
      .map((session) => {
        const isOwnedByCurrentUser = session.vehicle?.ownerId === currentUser._id
        const formattedPlate = formatLicensePlate(session.vehicle?.licensePlate || '')

        return [
          session.slotId,
          {
            isOccupied: true,
            isReserved: false,
            isOwnedByCurrentUser,
            visiblePlate: canViewAllPlates || isOwnedByCurrentUser ? formattedPlate : null,
            activeSession: session.vehicle
              ? {
                  ...session,
                  vehicle: {
                    ...session.vehicle,
                    licensePlate: formattedPlate,
                  },
                }
              : session,
            activeReservation: null,
          },
        ]
      })
  )

  for (const reservation of activeReservations) {
    if (!reservation.slotId || slotStateBySlotId.has(reservation.slotId)) {
      continue
    }

    const isOwnedByCurrentUser = reservation.vehicle?.ownerId === currentUser._id
    const formattedPlate = formatLicensePlate(reservation.vehicle?.licensePlate || '')

    slotStateBySlotId.set(reservation.slotId, {
      isOccupied: false,
      isReserved: true,
      isOwnedByCurrentUser,
      visiblePlate: canViewAllPlates || isOwnedByCurrentUser ? formattedPlate : null,
      activeSession: null,
      activeReservation: reservation.vehicle
        ? {
            ...reservation,
            vehicle: {
              ...reservation.vehicle,
              licensePlate: formattedPlate,
            },
          }
        : reservation,
    })
  }

  return buildParkingMapBuildings(slots, slotStateBySlotId)
}

export const parkingMapService = {
  getPublicParkingMap,
}
