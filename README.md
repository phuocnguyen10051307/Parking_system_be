# salon-booking-server

Backend Node.js / Express cho hệ thống .

## Tổng quan dự án

Ứng dụng backend cung cấp API xác thực, quản lý session, và kết nối với cơ sở dữ liệu PostgreSQL thông qua Prisma.

## Cấu trúc dự án

Mã nguồn chính nằm trong thư mục `src/`.

### `src/server.js`

- Điểm vào của server.
- Khởi tạo Express, middleware, CORS, Swagger UI và các route.

### `src/config/`

Chứa cài đặt môi trường và cấu hình chung.

- `environment.js`: nạp biến môi trường.
- `cors.js`: cấu hình CORS.
- `cookie.js`: cấu hình cookie refresh token.
- `prisma.js`: khởi tạo Prisma client.

### `src/routes/`

Chứa định nghĩa route REST API.

- `v1/auth.route.js`: các endpoint auth như `signup`, `signin`, `signout`, `refresh-token`, `me`.
- `v1/index.js`: router chính cho API phiên bản 1.

### `src/controllers/`

Chứa controller xử lý yêu cầu đến từ route.

- `auth.controller.js`: controller cho auth và trả về dữ liệu user/token.

### `src/services/`

Chứa logic nghiệp vụ thực sự.

- `auth.service.js`: xử lý đăng ký, đăng nhập, signout và refresh token.

### `src/middlewares/`

Chứa middleware Express.

- `auth.middleware.js`: xác thực access token và gán `req.user`.
- `validation.middleware.js`: xác thực request body bằng Zod.

### `src/validations/`

Chứa schema Zod cho các payload.

- `auth.validation.js`: schema đăng ký và đăng nhập.

### `src/providers/`

Chứa logic cung cấp dịch vụ.

- `jwt.provider.js`: tạo và xác thực JWT.

### `src/utils/`

Chứa helper và util chung.

- `formatters.js`: định dạng dữ liệu user.
- `ApiError.js`: lớp custom error.
- `constants.js`: các hằng số dùng chung.

### `src/generated/`

Chứa mã tự động tạo từ Prisma.

### `src/models/`

Chứa định nghĩa mô hình hoặc helper liên quan đến dữ liệu.

## Chạy dự án

1. Cài đặt dependencies:

```bash
npm install
```

2. Sao chép file môi trường:

```bash
cp .env.example .env
```

3. Cấu hình biến môi trường trong `.env`.

4. Chạy server ở chế độ phát triển:

```bash
npm run dev
```

5. Hoặc chạy production:

```bash
npm start
```

## API auth chính

- `POST /v1/auth/signup`
- `POST /v1/auth/signin`
- `GET /v1/auth/me`
- `POST /v1/auth/signout`
- `POST /v1/auth/refresh-token`npx prisma db push

## Tài liệu API

Swagger UI được phục vụ tại `/api-docs` khi server đang chạy.

http://localhost:3000/api-docs

## Ghi chú

- Sử dụng PostgreSQL với Prisma.
- Access token được xác thực bằng middleware, refresh token được lưu trong cookie.
- Kiểm tra cấu hình CORS nếu frontend và backend chạy trên origin khác nhau.
