import crypto from 'crypto'
import bcrypt from 'bcrypt'
import { StatusCodes } from 'http-status-codes'
import ms from 'ms'

import { env } from '../config/environment.js'
import { prisma } from '../config/prisma.js'
import { JwtProvider } from '../providers/jwt.provider.js'
import ApiError from '../utils/ApiError.js'
import { mailService } from './mail.service.js'

const normalizeEmail = (email) => email.trim().toLowerCase()

const getOtpExpiresInMinutes = () => {
  const expiresInMinutes = Number(env.OTP_EXPIRES_IN_MINUTES || 5)

  if (!Number.isInteger(expiresInMinutes) || expiresInMinutes <= 0) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Invalid OTP expiration'
    )
  }

  return expiresInMinutes
}

const generateOtpCode = () => String(crypto.randomInt(100000, 1000000))

const ensureSignupAvailable = async ({ email, phone }) => {
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
}

const requestSignupOtp = async (userData) => {
  const { fullName, phone, password } = userData
  const email = normalizeEmail(userData.email)

  if (!fullName || !email || !password) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Full name, email and password are required'
    )
  }

  await ensureSignupAvailable({ email, phone })

  const expiresInMinutes = getOtpExpiresInMinutes()
  const otpCode = generateOtpCode()
  const [passwordHash, otpHash] = await Promise.all([
    bcrypt.hash(password, 10),
    bcrypt.hash(otpCode, 10),
  ])

  await prisma.registrationOtp.deleteMany({
    where: {
      email,
      consumedAt: null,
    },
  })

  await prisma.registrationOtp.create({
    data: {
      fullName,
      email,
      phone,
      passwordHash,
      otpHash,
      expiresAt: new Date(Date.now() + expiresInMinutes * 60 * 1000),
    },
  })

  await mailService.sendSignupOtp({
    to: email,
    fullName,
    otpCode,
    expiresInMinutes,
  })

  return {
    success: true,
    message: 'OTP has been sent to your email',
    expiresInMinutes,
  }
}

const signup = async (userData) => {
  const email = normalizeEmail(userData.email)
  const otpCode = userData.otpCode

  if (!email || !otpCode) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Email and OTP code are required'
    )
  }

  const otpRecord = await prisma.registrationOtp.findFirst({
    where: {
      email,
      consumedAt: null,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  if (!otpRecord) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Please request a new OTP code'
    )
  }

  if (otpRecord.expiresAt < new Date()) {
    await prisma.registrationOtp.delete({
      where: { id: otpRecord.id },
    })

    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'OTP code has expired'
    )
  }

  if (otpRecord.attempts >= 5) {
    throw new ApiError(
      StatusCodes.TOO_MANY_REQUESTS,
      'Too many failed OTP attempts. Please request a new code'
    )
  }

  const isOtpMatch = await bcrypt.compare(otpCode, otpRecord.otpHash)

  if (!isOtpMatch) {
    await prisma.registrationOtp.update({
      where: { id: otpRecord.id },
      data: { attempts: { increment: 1 } },
    })

    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Invalid OTP code'
    )
  }

  await ensureSignupAvailable({ email, phone: otpRecord.phone })

  const createdUser = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        fullName: otpRecord.fullName,
        email: otpRecord.email,
        phone: otpRecord.phone,
        passwordHash: otpRecord.passwordHash,
      },
    })

    await tx.registrationOtp.update({
      where: { id: otpRecord.id },
      data: { consumedAt: new Date() },
    })

    await tx.registrationOtp.deleteMany({
      where: {
        email,
        consumedAt: null,
        id: { not: otpRecord.id },
      },
    })

    return user
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
  const { password } = userData
  const email = normalizeEmail(userData.email)

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

  const accessTokenMaxAge = ms(
    env.JWT_ACCESS_EXPIRATION
  )
  const refreshTokenMaxAge = ms(
    env.JWT_REFRESH_EXPIRATION
  )

  if (!accessTokenMaxAge || !refreshTokenMaxAge) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Invalid token expiration'
    )
  }

  await prisma.session.create({
    data: {
      userId: user.id,
      refreshToken,
      expiresAt: new Date(Date.now() + refreshTokenMaxAge),
    },
  })

  return {
    accessToken,
    accessTokenMaxAge,
    refreshToken,
    refreshTokenMaxAge,
    user: {
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

  const accessTokenMaxAge = ms(env.JWT_ACCESS_EXPIRATION)

  if (!accessTokenMaxAge) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Invalid token expiration'
    )
  }

  return {
    accessToken,
    accessTokenMaxAge
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
  requestSignupOtp,
  signup,
  signin,
  signout,
  refreshToken,
}