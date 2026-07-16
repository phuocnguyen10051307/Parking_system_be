CREATE TYPE "MonthlySubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED');

CREATE TABLE "MonthlySubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "pricingPolicyId" TEXT,
    "vehicleType" "VehicleType" NOT NULL,
    "durationMonths" INTEGER NOT NULL,
    "monthlyFee" DECIMAL(10,2) NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "MonthlySubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "paymentMethod" "PaymentMethod" NOT NULL,
    "paidAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlySubscription_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MonthlySubscription_userId_idx" ON "MonthlySubscription"("userId");
CREATE INDEX "MonthlySubscription_vehicleId_idx" ON "MonthlySubscription"("vehicleId");
CREATE INDEX "MonthlySubscription_status_idx" ON "MonthlySubscription"("status");
CREATE INDEX "MonthlySubscription_startDate_endDate_idx" ON "MonthlySubscription"("startDate", "endDate");

ALTER TABLE "MonthlySubscription" ADD CONSTRAINT "MonthlySubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MonthlySubscription" ADD CONSTRAINT "MonthlySubscription_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MonthlySubscription" ADD CONSTRAINT "MonthlySubscription_pricingPolicyId_fkey" FOREIGN KEY ("pricingPolicyId") REFERENCES "PricingPolicy"("id") ON DELETE SET NULL ON UPDATE CASCADE;
