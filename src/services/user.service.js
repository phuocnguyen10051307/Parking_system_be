import bcrypt from 'bcrypt'
import { StatusCodes } from 'http-status-codes'

import { prisma } from '../config/prisma.js'
import ApiError from '../utils/ApiError.js'

const formatUser = (user) => {
  return {
    _id: user.id,
    phone: user.phone,
    email: user.email,
    displayName: user.fullName,
    role: user.role || 'USER',
    avatarUrl: user.avatarUrl,
    avatarId: null,
    loyaltyPoints: 0,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}

const getProfile = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found')
  }

  return formatUser(user)
}

const updateProfile = async (userId, userData) => {
  const { fullName, phone, avatarUrl } = userData

  if (!fullName && !phone && avatarUrl === undefined) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'No data to update')
  }

  if (phone) {
    const existedPhone = await prisma.user.findUnique({
      where: { phone },
    })

    if (existedPhone && existedPhone.id !== userId) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Phone number already exists')
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(fullName && { fullName }),
      ...(phone && { phone }),
      ...(avatarUrl !== undefined && { avatarUrl }),
    },
  })

  return formatUser(updatedUser)
}

const changePassword = async (userId, passwordData) => {
  const { currentPassword, newPassword } = passwordData

  if (!currentPassword || !newPassword) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Current password and new password are required')
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found')
  }

  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash)

  if (!isMatch) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Current password is incorrect')
  }

  const newPasswordHash = await bcrypt.hash(newPassword, 10)

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: newPasswordHash,
    },
  })

  return true
}

export const userService = {
  getProfile,
  updateProfile,
  changePassword,
}