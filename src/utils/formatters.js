import lodash from 'lodash'

// Lấy một vài dữ liệu cụ thể trong user để tránh trả về dữ liệu nhạy cảm như passwordHash
const { pick } = lodash

export const pickUser = (user) => {
  if (!user) return {}

  return pick(user, [
    '_id',
    'phone',
    'email',
    'displayName',
    'role',
    'avatarUrl',
    'avatarId',
    'isActive',
    'createdAt',
    'updatedAt',
  ])
}