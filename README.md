# Parking System - Backend

## Overview

Backend REST API cho hệ thống quản lý bãi đỗ xe, phục vụ khách hàng, nhân viên, quản lý và quản trị viên. Hỗ trợ xác thực, phân quyền, quản lý bãi đỗ và phương tiện, ghi nhận xe vào/ra, đặt chỗ, vé tháng, tính phí, thanh toán và phản hồi.

## Tech Stack

- Node.js (ES Modules), Express.js 5
- PostgreSQL, Prisma ORM 7
- JWT, bcrypt
- Zod
- Swagger UI
- Cloudinary cho lưu trữ hình ảnh
- Nodemailer cho gửi email OTP
- PayOS cho thanh toán trực tuyến

## Requirements

- Node.js 22.13+ thuộc nhánh 22.x hoặc Node.js 24+ để tương thích các dependency hiện tại.
- npm.
- PostgreSQL đang chạy và một database dành cho dự án.
- Tài khoản SMTP, Cloudinary và PayOS để sử dụng các chức năng tương ứng.

## Installation

```bash
git clone https://github.com/phuocnguyen10051307/Parking_system_be.git
cd Parking_system_be
npm install
```

Nếu đã có source code, mở terminal trong thư mục `Parking_system_be` và chạy `npm install`.

## Environment Variables

Tạo file `.env` từ `.env.example` trong thư mục gốc backend. Với PowerShell:

```powershell
Copy-Item .env.example .env
```

Điền cấu hình phù hợp với môi trường của bạn:

```dotenv
HOST=localhost
PORT=3000
BUILD_MODE=development

DATABASE_URL="postgresql://user:password@localhost:5432/parking_db"

JWT_ACCESS_SECRET=replace_with_access_secret
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_SECRET=replace_with_refresh_secret
JWT_REFRESH_EXPIRATION=14d

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
OTP_EXPIRES_IN_MINUTES=5

APP_BASE_URL=http://localhost:5173

PAYOS_CLIENT_ID=
PAYOS_API_KEY=
PAYOS_CHECKSUM_KEY=
PAYOS_RETURN_URL=http://localhost:5173
PAYOS_CANCEL_URL=http://localhost:5173
PAYOS_SESSION_RETURN_URL=http://localhost:5173/vehicle-exit
PAYOS_SESSION_CANCEL_URL=http://localhost:5173/vehicle-exit
PAYOS_MONTHLY_RETURN_URL=http://localhost:5173/user/my-monthly-subscriptions
PAYOS_MONTHLY_CANCEL_URL=http://localhost:5173/user/my-monthly-subscriptions
```

`DATABASE_URL` phải trỏ đến database PostgreSQL của bạn. Dùng hai giá trị bí mật riêng cho access token và refresh token. Cấu hình SMTP trước khi thử đăng ký bằng OTP, Cloudinary trước khi tải ảnh và PayOS trước khi thử thanh toán trực tuyến.

## Database Setup

Chạy trong thư mục `Parking_system_be` sau khi cấu hình `.env`:

```bash
npx prisma generate
npx prisma migrate dev
```

Prisma đọc kết nối database từ `prisma.config.ts`; schema và migrations nằm trong `prisma/`.

Có thể tạo dữ liệu mẫu trong database phát triển:

```bash
npm run seed:slots
npm run seed:test-data
```

`seed:slots` tạo dữ liệu mẫu cho tòa nhà, tầng, khu vực và chỗ đỗ. `seed:test-data` tạo thêm dữ liệu phục vụ kiểm thử.

## Run Project

Chế độ phát triển, tự khởi động lại khi thay đổi code:

```bash
npm run dev
```

Chạy bằng Node.js:

```bash
npm start
```

Server: <http://localhost:3000>

API base URL: <http://localhost:3000/v1>

Kiểm tra trạng thái: `GET http://localhost:3000/v1/status`.

Server khởi động sau khi kết nối database thành công. Địa chỉ và cổng phụ thuộc vào `HOST`, `PORT` trong `.env`.

## API Documentation

Swagger UI: <http://localhost:3000/api-docs>

Đặc tả API nằm trong `src/swagger.json`.

## Project Structure

```text
Parking_system_be/
├── prisma/
│   ├── migrations/          # Các phiên bản thay đổi database
│   └── schema.prisma       # Models và enums
├── scripts/                # Scripts tạo dữ liệu mẫu
├── src/
│   ├── config/             # Database, môi trường, CORS, cookie, Cloudinary
│   ├── controllers/        # Xử lý request và response
│   ├── middlewares/        # Xác thực, upload, validation, xử lý lỗi
│   ├── providers/          # JWT provider
│   ├── routes/v1/          # Khai báo các endpoint
│   ├── services/           # Logic nghiệp vụ và truy cập dữ liệu
│   ├── utils/              # Hàm tiện ích và hằng số
│   ├── validations/        # Schema kiểm tra dữ liệu
│   ├── swagger.json        # Đặc tả API
│   └── server.js           # Điểm khởi chạy server
├── tests/                  # Kiểm thử với node:test
├── .env.example            # Cấu hình môi trường mẫu
├── prisma.config.ts        # Cấu hình Prisma CLI
└── package.json
```

## Main APIs

Các đường dẫn dưới đây đều có tiền tố `/v1`. Quyền truy cập tùy endpoint và vai trò `ADMIN`, `MANAGER`, `STAFF`, `USER`.

| API | Chức năng |
| --- | --- |
| `/auth` | Đăng ký, đăng nhập, OTP, làm mới token và đăng xuất |
| `/users` | Thông tin người dùng |
| `/vehicles` | Quản lý phương tiện |
| `/slots` | Tra cứu chỗ đỗ |
| `/parking-map` | Dữ liệu bản đồ bãi đỗ |
| `/parking` | Nghiệp vụ xe vào/ra |
| `/parking-sessions` | Quản lý phiên gửi xe |
| `/reservations` | Đặt chỗ đỗ xe |
| `/monthly-subscriptions` | Đăng ký và quản lý vé tháng |
| `/pricing-policies` | Chính sách giá |
| `/payments` | Thanh toán và webhook |
| `/feedbacks` | Phản hồi của người dùng |
| `/admin/buildings` | Quản lý tòa nhà/bãi đỗ |
| `/admin/floors` | Quản lý tầng |
| `/admin/zones` | Quản lý khu vực |
| `/admin/slots` | Quản lý chỗ đỗ |
| `/admin/users` | Quản lý người dùng |
| `/admin/roles` | Quản lý vai trò |
| `/admin/settings` | Cài đặt hệ thống |

## Scripts

| Lệnh | Chức năng |
| --- | --- |
| `npm run dev` | Chạy server bằng nodemon |
| `npm start` | Chạy server bằng Node.js |
| `npm run lint` | Kiểm tra code bằng ESLint |
| `npm run format` | Định dạng code bằng Prettier |
| `npm run seed:slots` | Tạo dữ liệu mẫu cho bãi đỗ |
| `npm run seed:test-data` | Tạo dữ liệu kiểm thử |

Chạy các file kiểm thử hiện có trực tiếp bằng Node.js:

```bash
node --test "tests/*.test.js"
```

Backend hiện chưa khai báo script `build` hoặc `test` trong `package.json`.
