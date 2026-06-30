CREATE TABLE "RegistrationOtp" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistrationOtp_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RegistrationOtp_email_idx" ON "RegistrationOtp"("email");
CREATE INDEX "RegistrationOtp_expiresAt_idx" ON "RegistrationOtp"("expiresAt");