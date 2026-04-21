-- DropForeignKey: OrderItem.batchId → StockBatch (needs to be dropped before altering column nullability)
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_batchId_fkey";

-- AlterTable: OrderItem — batchId becomes nullable (预售单创建时批次未分配), add imageUrl snapshot
ALTER TABLE "OrderItem" ALTER COLUMN "batchId" DROP NOT NULL;
ALTER TABLE "OrderItem" ADD COLUMN "imageUrl" TEXT;

-- AlterTable: Order — add preorder fields
ALTER TABLE "Order" ADD COLUMN "receiverName"      TEXT;
ALTER TABLE "Order" ADD COLUMN "receiverPhone"     TEXT;
ALTER TABLE "Order" ADD COLUMN "cardMessage"       TEXT;
ALTER TABLE "Order" ADD COLUMN "sourceChannel"     TEXT;
ALTER TABLE "Order" ADD COLUMN "reminderStage"     TEXT DEFAULT 'none';
ALTER TABLE "Order" ADD COLUMN "reminderUpdatedAt" TIMESTAMP(3);

-- Recreate FK with nullable column
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_batchId_fkey"
  FOREIGN KEY ("batchId") REFERENCES "StockBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex: speed up preorder lookup by (orderType, deliveryTime)
CREATE INDEX "Order_orderType_deliveryTime_idx" ON "Order"("orderType", "deliveryTime");
