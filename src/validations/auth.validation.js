import { z } from 'zod'
import {
  PASSWORD_RULE,
  PASSWORD_RULE_MESSAGE,
  PHONE_RULE,
  PHONE_RULE_MESSAGE,
} from '../utils/validators.js'

const signupBaseSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name is too long'),

  email: z.string().trim().email('Invalid email address'),

  phone: z.string().regex(PHONE_RULE, PHONE_RULE_MESSAGE).optional(),

  password: z.string().regex(PASSWORD_RULE, PASSWORD_RULE_MESSAGE),
})

const requestSignupOtpSchema = signupBaseSchema

const signupSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  otpCode: z.string().trim().regex(/^\d{6}$/, 'OTP code must be 6 digits'),
})

const signinSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z
    .string()
    .regex(PASSWORD_RULE, PASSWORD_RULE_MESSAGE)
    .min(8, 'Password must be at least 8 characters'),
})

export const authValidation = {
  requestSignupOtpSchema,
  signupSchema,
  signinSchema,
}