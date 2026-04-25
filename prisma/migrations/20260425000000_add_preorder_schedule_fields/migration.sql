-- AlterTable
ALTER TABLE "Order" ADD COLUMN "fulfillmentType" TEXT NOT NULL DEFAULT 'delivery';
ALTER TABLE "Order" ADD COLUMN "isMade" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN "isUrgent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN "sortIndex" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Order_orderType_deliveryTime_isMade_idx" ON "Order"("orderType", "deliveryTime", "isMade");

-- CreateIndex
CREATE INDEX "Order_orderType_status_idx" ON "Order"("orderType", "status");
