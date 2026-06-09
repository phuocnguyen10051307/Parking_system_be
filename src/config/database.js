import { prisma } from './prisma.js'

export const connectDB = async () => {
  try {
    await prisma.$connect()
  } catch (err) {
    console.error('Prisma connect error:', err)
    throw err
  }
}

export const closeDB = async () => {
  try {
    await prisma.$disconnect()
  } catch (err) {
    console.error('Prisma disconnect error:', err)
    throw err
  }
}
