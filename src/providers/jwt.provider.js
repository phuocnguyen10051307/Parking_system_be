/* eslint-disable preserve-caught-error */
import JWT from 'jsonwebtoken'

/**
 * Function tạo mới token - cần 3 tham số đầu vào
 * userInfo: Những thông tin muốn đính kèm trong token
 * secretSignature: Chữ kí bí mật
 * tokenLife: Thời gian sống của token
 */
const generateToken = async (userInfo, secretSignature, tokenLife) => {
  try {
    return JWT.sign(userInfo, secretSignature, {
      algorithm: 'HS256',
      expiresIn: tokenLife,
    })
  } catch (error) {
    throw Error(error)
  }
}

/**
 * Function kiểm tra một token có hợp lệ hay không
 * Hợp lệ là cái token tạo ra có đúng với secretSignature hay không
 */
const verifyToken = async (token, secretSignature) => {
  try {
    // Hàm verify của thư viện JWT
    return JWT.verify(token, secretSignature)
  } catch (error) {
    throw Error(error)
  }
}

export const JwtProvider = {
  generateToken,
  verifyToken,
}
