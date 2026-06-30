import nodemailer from 'nodemailer'
import { StatusCodes } from 'http-status-codes'

import { env } from '../config/environment.js'
import ApiError from '../utils/ApiError.js'

const createTransporter = () => {
  const port = Number(env.SMTP_PORT)

  if (!env.SMTP_HOST || !port || !env.SMTP_USER || !env.SMTP_PASS) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'SMTP configuration is missing'
    )
  }

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port,
    secure: env.SMTP_SECURE === 'true',
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  })
}

const sendSignupOtp = async ({ to, fullName, otpCode, expiresInMinutes }) => {
  const transporter = createTransporter()

  await transporter.sendMail({
    from: env.SMTP_USER,
    to,
    subject: 'Your parking account verification code',
    text: `Hi ${fullName}, your verification code is ${otpCode}. It expires in ${expiresInMinutes} minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <p>Hi ${fullName},</p>
        <p>Your verification code is:</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px;">${otpCode}</p>
        <p>This code expires in ${expiresInMinutes} minutes.</p>
      </div>
    `,
  })
}

export const mailService = {
  sendSignupOtp,
}