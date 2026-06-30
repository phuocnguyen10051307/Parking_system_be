import asyncHandler from 'express-async-handler'
import { StatusCodes } from 'http-status-codes'
import { accessTokenCookieOptions, refreshTokenCookieOptions } from '../config/cookie.js'
import { authService } from '../services/auth.service.js'

const requestSignupOtp = asyncHandler(async (req, res) => {
  const result = await authService.requestSignupOtp(req.body)
  res.status(StatusCodes.OK).json(result)
})

const signup = asyncHandler(async (req, res) => {
  const createdUser = await authService.signup(req.body)
  res.status(StatusCodes.CREATED).json(createdUser)
})

const signin = asyncHandler(async (req, res) => {
  const { accessToken, accessTokenMaxAge, refreshToken, refreshTokenMaxAge, user } = await authService.signin(req.body)

  res.cookie('accessToken', accessToken, {
    ...accessTokenCookieOptions,
    maxAge: accessTokenMaxAge,
  })

  res.cookie('refreshToken', refreshToken, {
    ...refreshTokenCookieOptions,
    maxAge: refreshTokenMaxAge,
  })

  res.status(StatusCodes.OK).json({
    success: true,
    message: 'Ðang nh?p thành công',
    data: {
      user,
    },
  })
})

const signout = asyncHandler(async (req, res) => {
  await authService.signout(req.cookies?.refreshToken)

  res.clearCookie('accessToken', {
    ...accessTokenCookieOptions,
  })
  res.clearCookie('refreshToken', {
    ...refreshTokenCookieOptions,
  })
  res.status(StatusCodes.OK).json({ success: true, message: 'Signed out successfully' })
})

const refreshToken = asyncHandler(async (req, res) => {
  const { accessToken, accessTokenMaxAge } = await authService.refreshToken(req.cookies?.refreshToken)

  res.cookie('accessToken', accessToken, {
    ...accessTokenCookieOptions,
    maxAge: accessTokenMaxAge,
  })

  res.status(StatusCodes.OK).json({ success: true })
})

const me = asyncHandler(async (req, res) => {
  res.status(StatusCodes.OK).json({ user: req.user })
})

export const authController = {
  requestSignupOtp,
  signup,
  signin,
  signout,
  refreshToken,
  me,
}
