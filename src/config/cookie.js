import { env } from './environment.js'

export const refreshTokenCookieOptions = {
  httpOnly: true,
  secure: env.BUILD_MODE !== 'development',
  sameSite: env.BUILD_MODE === 'development' ? 'lax' : 'none',
}
