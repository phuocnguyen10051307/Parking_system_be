import { WHITELIST_DOMAINS } from '../utils/constants.js'
import { StatusCodes } from 'http-status-codes'
import ApiError from '../utils/ApiError.js'
import { env } from './environment.js'

export const corsOptions = {
  origin: function (origin, callback) {
    // Nếu dev thì cho qua luôn
    if (env.BUILD_MODE === 'development') {
      return callback(null, true)
    }

    // Cho phép requests không có origin (mobile apps, curl, Postman, etc.)
    if (!origin) {
      return callback(null, true)
    }

    // Kiểm tra xem origin có phải là domain được chấp nhận hay không
    // Normalize origin by removing trailing slash for comparison
    const normalizedOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin
    const isAllowed = WHITELIST_DOMAINS.some((domain) => {
      const normalizedDomain = domain.endsWith('/') ? domain.slice(0, -1) : domain
      return normalizedDomain === normalizedOrigin
    })

    if (isAllowed) {
      return callback(null, true)
    }

    // Cuối cùng nếu domain không được chấp nhận thì trả về lỗi
    return callback(new ApiError(StatusCodes.FORBIDDEN, `${origin} not allowed by our CORS Policy.`))
  },

  // Some legacy browsers (IE11, various SmartTVs) choke on 204
  optionsSuccessStatus: 200,

  // CORS sẽ cho phép nhận cookies từ request
  credentials: true,
}
