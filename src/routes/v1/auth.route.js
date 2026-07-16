import express from 'express'
import { validate } from '../../middlewares/validation.middleware.js'
import { authValidation } from '../../validations/auth.validation.js'
import { authController } from '../../controllers/auth.controller.js'
import { authMiddleware } from '../../middlewares/auth.middleware.js'

const Router = express.Router()

// Send OTP before creating a new user
Router.post('/signup/request-otp', validate(authValidation.requestSignupOtpSchema), authController.requestSignupOtp)

// Verify OTP and register a new user
Router.post('/signup', validate(authValidation.signupSchema), authController.signup)

// Login
Router.post('/signin', validate(authValidation.signinSchema), authController.signin)

// Current user
Router.get('/me', authMiddleware.protectedRoute, authController.me)

// Logout
Router.post('/signout', authController.signout)

// Refresh access token
Router.post('/refresh-token', authController.refreshToken)

export const authRoute = Router
