import bcrypt from 'bcrypt'
import { StatusCodes } from 'http-status-codes'
import ms from 'ms'

import { env } from '../config/environment.js'
import { prisma } from '../config/prisma.js'
import { JwtProvider } from '../providers/jwt.provider.js'
import ApiError from '../utils/ApiError.js'
import { authController } from '../controllers/auth.controller.js'

const signup = async (userData) => {
  const { fullName, email, phone, password } = userData

  if (!fullName || !email || !password) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Full name, email and password are required'
    )
  }

  const existedEmail = await prisma.user.findUnique({
    where: { email },
  })

  if (existedEmail) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Email already exists'
    )
  }

  if (phone) {
    const existedPhone = await prisma.user.findUnique({
      where: { phone },
    })

    if (existedPhone) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Phone number already exists'
      )
    }
  }

  const passwordHash = await bcrypt.hash(password, 10)

  const createdUser = await prisma.user.create({
    data: {
      fullName,
      email,
      phone,
      passwordHash,
    },
  })

  return {
    id: createdUser.id,
    fullName: createdUser.fullName,
    email: createdUser.email,
    phone: createdUser.phone,
    avatarUrl: createdUser.avatarUrl,
    role: createdUser.role,
    isActive: createdUser.isActive,
    createdAt: createdUser.createdAt,
    updatedAt: createdUser.updatedAt,
  }
}

const signin = async (userData) => {
  const { email, password } = userData

  if (!email || !password) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Email and password are required'
    )
  }

  const user = await prisma.user.findUnique({
    where: { email },
  })

  if (!user) {
    throw new ApiError(
      StatusCodes.UNAUTHORIZED,
      'Invalid email or password'
    )
  }

  if (!user.isActive) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'User account is blocked'
    )
  }

  const isMatch = await bcrypt.compare(
    password,
    user.passwordHash
  )

  if (!isMatch) {
    throw new ApiError(
      StatusCodes.UNAUTHORIZED,
      'Invalid email or password'
    )
  }

  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
  }

  const accessToken = await JwtProvider.generateToken(
    payload,
    env.JWT_ACCESS_SECRET,
    env.JWT_ACCESS_EXPIRATION
  )

  const refreshToken = await JwtProvider.generateToken(
    payload,
    env.JWT_REFRESH_SECRET,
    env.JWT_REFRESH_EXPIRATION
  )

  const refreshTokenMaxAge = ms(
    env.JWT_REFRESH_EXPIRATION
  )

  if (!refreshTokenMaxAge) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Invalid refresh token expiration'
    )
  }

  // Lưu session ở đây nếu schema Session tồn tại

  return {
    accessToken,
    refreshToken,
    refreshTokenMaxAge,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      role: user.role,
      isActive: user.isActive,
    },
  }
}
const refreshToken = async (token) => {
  if (!token) {
    throw new ApiError(
      StatusCodes.UNAUTHORIZED,
      'Refresh token is required'
    )
  }

  const session = await prisma.session.findUnique({
    where: {
      refreshToken: token
    }
  })

  if (!session) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Invalid refresh token'
    )
  }

  if (session.expiresAt < new Date()) {
    await prisma.session.delete({
      where: {
        refreshToken: token
      }
    })

    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Refresh token has expired'
    )
  }

  let decoded

  try {
    decoded = await JwtProvider.verifyToken(
      token,
      env.JWT_REFRESH_SECRET
    )
  } catch {
    await prisma.session.deleteMany({
      where: {
        refreshToken: token
      }
    })

    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Invalid refresh token'
    )
  }
  

  const user = await prisma.user.findUnique({
    where: {
      id: decoded.id
    }
  })

  if (!user || !user.isActive) {
    throw new ApiError(
      StatusCodes.UNAUTHORIZED,
      'User is not available'
    )
  }

  const payload = {
    id: user.id,
    email: user.email,
    role: user.role
  }

  const accessToken = await JwtProvider.generateToken(
    payload,
    env.JWT_ACCESS_SECRET,
    env.JWT_ACCESS_EXPIRATION
  )

  return {
    accessToken
  }
}
const signout = async (refreshToken) => {
  if (!refreshToken) return

  await prisma.session.deleteMany({
    where: {
      refreshToken
    }
  })
}

export const authService = {
  signup,
  signin,
  signout,
  refreshToken,
}