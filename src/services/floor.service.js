import { prisma } from '../config/prisma.js'

const floorInclude = {
  building: true,
  _count: {
    select: {
      zones: true,
    },
  },
}

const ensureBuildingSupportsFloor = async (buildingId, floorNumber, excludeId) => {
  const building = await prisma.parkingBuilding.findUnique({
    where: { id: buildingId },
  })

  if (!building) {
    const error = new Error('Building not found')
    error.statusCode = 404
    throw error
  }

  if (floorNumber > 0 && floorNumber > building.totalFloors) {
    const error = new Error('floorNumber cannot be greater than building totalFloors')
    error.statusCode = 400
    throw error
  }

  const duplicatedFloor = await prisma.floor.findFirst({
    where: {
      buildingId,
      floorNumber,
      id: excludeId ? { not: excludeId } : undefined,
    },
  })

  if (duplicatedFloor) {
    const error = new Error('Floor number already exists in this building')
    error.statusCode = 400
    throw error
  }
}

const getFloors = async () => {
  return await prisma.floor.findMany({
    orderBy: [
      {
        building: {
          name: 'asc',
        },
      },
      {
        floorNumber: 'asc',
      },
    ],
    include: floorInclude,
  })
}

const createFloor = async (data) => {
  await ensureBuildingSupportsFloor(data.buildingId, Number(data.floorNumber))

  return await prisma.floor.create({
    data: {
      buildingId: data.buildingId,
      floorNumber: Number(data.floorNumber),
      vehicleType: data.vehicleType,
    },
    include: floorInclude,
  })
}

const updateFloor = async (id, data) => {
  await ensureBuildingSupportsFloor(data.buildingId, Number(data.floorNumber), id)

  return await prisma.floor.update({
    where: { id },
    data: {
      buildingId: data.buildingId,
      floorNumber: Number(data.floorNumber),
      vehicleType: data.vehicleType,
    },
    include: floorInclude,
  })
}

const deleteFloor = async (id) => {
  const zoneCount = await prisma.zone.count({
    where: {
      floorId: id,
    },
  })

  if (zoneCount > 0) {
    const error = new Error('Cannot delete floor because it has zones')
    error.statusCode = 400
    throw error
  }

  return await prisma.floor.delete({
    where: { id },
  })
}

export const floorService = {
  getFloors,
  createFloor,
  updateFloor,
  deleteFloor,
}
