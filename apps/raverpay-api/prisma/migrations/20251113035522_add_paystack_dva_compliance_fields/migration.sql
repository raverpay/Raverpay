-- AlterTable
ALTER TABLE "users" ADD COLUMN "paystackCustomerCode" TEXT;

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN "channel" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_paystackCustomerCode_key" ON "users"("paystackCustomerCode");
