import { prisma } from '../config/prisma.js'

const getBuildings = async () => {
  return await prisma.parkingBuilding.findMany({
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      _count: {
        select: {
          floors: true,
        },
      },
    },
  })
}

const createBuilding = async (data) => {
  return await prisma.parkingBuilding.create({
    data: {
      name: data.name,
      address: data.address,
      totalFloors: Number(data.totalFloors),
    },
  })
}

const updateBuilding = async (id, data) => {
  const highestFloor = await prisma.floor.findFirst({
    where: {
      buildingId: id,
      floorNumber: {
        gt: 0,
      },
    },
    orderBy: {
      floorNumber: 'desc',
    },
  })

  if (highestFloor && Number(data.totalFloors) < highestFloor.floorNumber) {
    const error = new Error('totalFloors cannot be less than the highest existing floorNumber')
    error.statusCode = 400
    throw error
  }

  return await prisma.parkingBuilding.update({
    where: { id },
    data: {
      name: data.name,
      address: data.address,
      totalFloors: Number(data.totalFloors),
    },
  })
}

const deleteBuilding = async (id) => {
  const floorCount = await prisma.floor.count({
    where: {
      buildingId: id,
    },
  })

  if (floorCount > 0) {
    const error = new Error('Cannot delete building because it has floors')
    error.statusCode = 400
    throw error
  }

  return await prisma.parkingBuilding.delete({
    where: { id },
  })
}

export const buildingService = {
  getBuildings,
  createBuilding,
  updateBuilding,
  deleteBuilding,
}
