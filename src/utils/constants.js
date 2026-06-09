// Những domain được phép truy cập tới tài nguyên của Server
export const WHITELIST_DOMAINS = ['http://localhost:5173']

// Các role của user
export const USER_ROLES = {
  CUSTOMER: 'customer',
  STAFF: 'staff',
  ADMIN: 'admin',
}

// Các loại phương tiện
export const VEHICLE_TYPES = {
  CAR: 'car',
  MOTORBIKE: 'motorbike',
}

// Các loại dịch vụ
export const SERVICE_CATEGORIES = {
  WASH: 'wash',
  DETAILING: 'detailing',
  MAINTENANCE: 'maintenance',
  REPAIR: 'repair',
  INSPECTION: 'inspection',
  OTHER: 'other',
}

// Trạng thái của cuộc hẹn
export const APPOINTMENT_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
}

// Phương thức thanh toán
export const PAYMENT_METHODS = {
  CASH: 'cash',
  CARD: 'card',
  ONLINE: 'online',
}

// Trạng thái thanh toán
export const PAYMENT_STATUS = {
  UNPAID: 'unpaid',
  PAID: 'paid',
  REFUNDED: 'refunded',
}

// Loại giao dịch điểm thưởng
export const LOYALTY_TRANSACTION_TYPES = {
  EARN: 'earn',
  REDEEM: 'redeem',
  EXPIRE: 'expire',
}

// Các loại thông báo
export const NOTIFICATION_TYPES = {
  BOOKING: 'booking',
  PROMOTION: 'promotion',
  MAINTENANCE: 'maintenance',
  LOYALTY: 'loyalty',
}
