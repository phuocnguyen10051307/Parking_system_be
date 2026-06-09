import { StatusCodes } from 'http-status-codes'
import ApiError from '../utils/ApiError.js'

export const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const result = schema.safeParse(req[source])

    if (!result.success) {
      const message = result.error.issues.map((issue) => issue.message).join(', ')
      next(new ApiError(StatusCodes.BAD_REQUEST, message))
      return
    }

    req[source] = result.data
    next()
  }
}
