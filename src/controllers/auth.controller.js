import asyncHandler from 'express-async-handler'
import { StatusCodes } from 'http-status-codes'
import { refreshTokenCookieOptions } from '../config/cookie.js'
import { authService } from '../services/auth.service.js'

const signup = asyncHandler(async (req, res) => {
  const createdUser = await authService.signup(req.body)
  res.status(StatusCodes.CREATED).json(createdUser)
})

const signin = asyncHandler(async (req, res) => {
  const { accessToken, refreshToken, refreshTokenMaxAge, user } = await authService.signin(req.body)

  res.cookie('refreshToken', refreshToken, {
    ...refreshTokenCookieOptions,
    maxAge: refreshTokenMaxAge,
  })

  res.status(StatusCodes.OK).json({
    success: true,
    message: 'Đăng nhập thành công',
    data: {
      user,
      accessToken,
    },
  })
})

const signout = asyncHandler(async (req, res) => {
  await authService.signout(req.cookies?.refreshToken)

  res.clearCookie('refreshToken', {
    ...refreshTokenCookieOptions,
  })
  res.status(StatusCodes.OK).json({ success: true, message: 'Signed out successfully' })
})

const refreshToken = asyncHandler(async (req, res) => {
  const { accessToken } = await authService.refreshToken(req.cookies?.refreshToken)

  res.status(StatusCodes.OK).json({ accessToken })
})

const me = asyncHandler(async (req, res) => {
  res.status(StatusCodes.OK).json({ user: req.user })
})

export const authController = {
  signup,
  signin,
  signout,
  refreshToken,
  me,
}
