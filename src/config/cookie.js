import { env } from './environment.js'

const baseCookieOptions = {
  httpOnly: true,
  secure: env.BUILD_MODE !== 'development',
  sameSite: env.BUILD_MODE === 'development' ? 'lax' : 'none',
}

export const accessTokenCookieOptions = baseCookieOptions
export const refreshTokenCookieOptions = baseCookieOptions
