ALTER TYPE "MonthlySubscriptionStatus" ADD VALUE IF NOT EXISTS 'PENDING';

ALTER TABLE "Payment" ALTER COLUMN "sessionId" DROP NOT NULL;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "monthlySubscriptionId" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "provider" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "orderCode" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "providerPaymentId" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "checkoutUrl" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Payment_monthlySubscriptionId_key" ON "Payment"("monthlySubscriptionId");
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_monthlySubscriptionId_fkey" FOREIGN KEY ("monthlySubscriptionId") REFERENCES "MonthlySubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
