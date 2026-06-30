import dotenv from 'dotenv'

dotenv.config()

export const env = {
  HOST: process.env.HOST,
  PORT: process.env.PORT,
  BUILD_MODE: process.env.BUILD_MODE,

  // Database
  // MONGO_URI: process.env.MONGO_URI,
  DATABASE_URL: process.env.DATABASE_URL,

  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_ACCESS_EXPIRATION: process.env.JWT_ACCESS_EXPIRATION,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_REFRESH_EXPIRATION: process.env.JWT_REFRESH_EXPIRATION,
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,

  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_SECURE: process.env.SMTP_SECURE,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  OTP_EXPIRES_IN_MINUTES: process.env.OTP_EXPIRES_IN_MINUTES,
}
