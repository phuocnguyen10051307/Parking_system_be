import multer from 'multer'
import { StatusCodes } from 'http-status-codes'

import ApiError from '../utils/ApiError.js'

const storage = multer.memoryStorage()

const imageFileFilter = (_req, file, cb) => {
  if (file.mimetype?.startsWith('image/')) {
    cb(null, true)
    return
  }

  cb(new ApiError(StatusCodes.BAD_REQUEST, 'Only image uploads are allowed'), false)
}

export const upload = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
})
