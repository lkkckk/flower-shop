-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "memberPrice" DECIMAL(12,2),
ALTER COLUMN "defaultPrice" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "vipPrice" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "wholesalePrice" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "UnitConversion" ALTER COLUMN "toBaseQty" SET DATA TYPE DECIMAL(12,3);

-- AlterTable
ALTER TABLE "ProductRecipeItem" ALTER COLUMN "qty" SET DATA TYPE DECIMAL(12,3);

-- AlterTable
ALTER TABLE "StockBatch" ADD COLUMN     "specialPrice" DECIMAL(12,2),
ADD COLUMN     "specialQty" DECIMAL(12,3) NOT NULL DEFAULT 0,
ADD COLUMN     "specialUntil" TIMESTAMP(3),
ALTER COLUMN "inboundQty" SET DATA TYPE DECIMAL(12,3),
ALTER COLUMN "currentQty" SET DATA TYPE DECIMAL(12,3),
ALTER COLUMN "costPrice" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN     "operatorUserId" INTEGER,
ADD COLUMN     "sourceKey" TEXT,
ALTER COLUMN "qtyChange" SET DATA TYPE DECIMAL(12,3);

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "availablePoints" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "creditLimit" DECIMAL(12,2),
ADD COLUMN     "mergedIntoId" INTEGER,
ADD COLUMN     "preferences" TEXT,
ADD COLUMN     "receivableBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN     "storedValueBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
ALTER COLUMN "balance" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "totalOwed" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "Promotion" ALTER COLUMN "threshold" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "reduction" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "deliveryPerson" TEXT,
ADD COLUMN     "deliveryPhone" TEXT,
ADD COLUMN     "fulfillmentStatus" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "paymentStatus" TEXT NOT NULL DEFAULT 'unpaid',
ADD COLUMN     "pointsDiscount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "pointsRedeemed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "priceReason" TEXT,
ADD COLUMN     "refundedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ALTER COLUMN "totalAmount" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "paidAmount" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "owedAmount" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "discountRate" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "returnedQty" DECIMAL(12,3) NOT NULL DEFAULT 0,
ALTER COLUMN "qty" SET DATA TYPE DECIMAL(12,3),
ALTER COLUMN "baseQty" SET DATA TYPE DECIMAL(12,3),
ALTER COLUMN "unitPrice" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "originalPrice" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "subtotal" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "cashShiftId" INTEGER,
ADD COLUMN     "operatorUserId" INTEGER,
ADD COLUMN     "sourceKey" TEXT,
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(12,2);

-- CreateTable
CREATE TABLE "CustomerAccountEntry" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "account" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "balanceAfter" DECIMAL(12,2) NOT NULL,
    "type" TEXT NOT NULL,
    "orderId" INTEGER,
    "paymentId" INTEGER,
    "sourceKey" TEXT NOT NULL,
    "operatorUserId" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerAccountEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointEntry" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "orderId" INTEGER,
    "sourceKey" TEXT NOT NULL,
    "operatorUserId" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Operation" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "result" JSONB,
    "operatorUserId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Operation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "operatorUserId" INTEGER,
    "details" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderAdjustment" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reason" TEXT NOT NULL,
    "lines" JSONB NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "refundMethod" TEXT,
    "externalReference" TEXT,
    "requestedBy" INTEGER NOT NULL,
    "approvedBy" INTEGER,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderCostAllocation" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "orderItemId" INTEGER NOT NULL,
    "batchId" INTEGER NOT NULL,
    "baseQty" DECIMAL(12,3) NOT NULL,
    "unitCost" DECIMAL(12,2) NOT NULL,
    "totalCost" DECIMAL(12,2) NOT NULL,
    "adjustmentId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderCostAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerTag" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "CustomerTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerEvent" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "calendar" TEXT NOT NULL DEFAULT 'solar',
    "month" INTEGER NOT NULL,
    "day" INTEGER NOT NULL,
    "remindDays" INTEGER NOT NULL DEFAULT 3,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CustomerEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerContact" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "nextContactAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "operatorUserId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FulfillmentEvent" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "fromStatus" TEXT NOT NULL,
    "toStatus" TEXT NOT NULL,
    "operatorUserId" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FulfillmentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" SERIAL NOT NULL,
    "supplierId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "expectedAt" TIMESTAMP(3),
    "notes" TEXT,
    "operatorUserId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderItem" (
    "id" SERIAL NOT NULL,
    "purchaseOrderId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "qty" DECIMAL(12,3) NOT NULL,
    "receivedQty" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "unitCost" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "PurchaseOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoodsReceipt" (
    "id" SERIAL NOT NULL,
    "purchaseOrderId" INTEGER NOT NULL,
    "lines" JSONB NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "operatorUserId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoodsReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierAccountEntry" (
    "id" SERIAL NOT NULL,
    "supplierId" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "type" TEXT NOT NULL,
    "receiptId" INTEGER,
    "paymentMethod" TEXT,
    "sourceKey" TEXT NOT NULL,
    "operatorUserId" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierAccountEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashShift" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "openingCash" DECIMAL(12,2) NOT NULL,
    "expectedCash" DECIMAL(12,2),
    "countedCash" DECIMAL(12,2),
    "variance" DECIMAL(12,2),
    "notes" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "CashShift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashMovement" (
    "id" SERIAL NOT NULL,
    "shiftId" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "type" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "operatorUserId" INTEGER NOT NULL,
    "notes" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" SERIAL NOT NULL,
    "kind" TEXT NOT NULL,
    "rows" JSONB NOT NULL,
    "errors" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'validated',
    "operatorUserId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerAccountEntry_sourceKey_key" ON "CustomerAccountEntry"("sourceKey");

-- CreateIndex
CREATE INDEX "CustomerAccountEntry_customerId_account_createdAt_idx" ON "CustomerAccountEntry"("customerId", "account", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PointEntry_sourceKey_key" ON "PointEntry"("sourceKey");

-- CreateIndex
CREATE INDEX "PointEntry_customerId_createdAt_idx" ON "PointEntry"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_createdAt_idx" ON "AuditLog"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "OrderCostAllocation_orderId_idx" ON "OrderCostAllocation"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerTag_customerId_name_key" ON "CustomerTag"("customerId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "GoodsReceipt_sourceKey_key" ON "GoodsReceipt"("sourceKey");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierAccountEntry_sourceKey_key" ON "SupplierAccountEntry"("sourceKey");

-- CreateIndex
CREATE UNIQUE INDEX "CashMovement_sourceKey_key" ON "CashMovement"("sourceKey");

-- CreateIndex
CREATE UNIQUE INDEX "StockMovement_sourceKey_key" ON "StockMovement"("sourceKey");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_sourceKey_key" ON "Payment"("sourceKey");

-- AddForeignKey
ALTER TABLE "CustomerAccountEntry" ADD CONSTRAINT "CustomerAccountEntry_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointEntry" ADD CONSTRAINT "PointEntry_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderAdjustment" ADD CONSTRAINT "OrderAdjustment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderCostAllocation" ADD CONSTRAINT "OrderCostAllocation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderCostAllocation" ADD CONSTRAINT "OrderCostAllocation_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderCostAllocation" ADD CONSTRAINT "OrderCostAllocation_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "StockBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerTag" ADD CONSTRAINT "CustomerTag_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerEvent" ADD CONSTRAINT "CustomerEvent_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerContact" ADD CONSTRAINT "CustomerContact_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FulfillmentEvent" ADD CONSTRAINT "FulfillmentEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierAccountEntry" ADD CONSTRAINT "SupplierAccountEntry_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "CashShift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Preserve the source values before any financial reinterpretation.
INSERT INTO "AuditLog" ("action","entityType","entityId","details")
SELECT 'migration.snapshot','Customer',id::text,jsonb_build_object('balance',balance,'totalOwed',"totalOwed",'points',points) FROM "Customer";
UPDATE "Product" SET "memberPrice" = "vipPrice";
INSERT INTO "AuditLog" (action,"entityType","entityId",details)
SELECT 'migration.order.snapshot','Order',id::text,jsonb_build_object('customerId',"customerId",'orderType',"orderType",'status',status,'totalAmount',"totalAmount",'paidAmount',"paidAmount",'owedAmount',"owedAmount") FROM "Order";
UPDATE "Order" SET "fulfillmentStatus" = CASE
 WHEN status='cancelled' THEN 'cancelled'
 WHEN "orderType"='retail' OR status='completed' THEN 'completed'
 WHEN status='pending_confirm' THEN 'pending'
 WHEN status IN ('booked','scheduled') THEN 'confirmed'
 WHEN status='in_production' THEN 'in_production'
 WHEN status='ready_to_ship' THEN 'ready'
 ELSE 'pending' END;
UPDATE "Order" SET "completedAt"=CASE WHEN "fulfillmentStatus"='completed' THEN "createdAt" ELSE NULL END,
 "owedAmount"=CASE WHEN "orderType"='preorder' AND status<>'cancelled' THEN GREATEST(0,"totalAmount"-"paidAmount") ELSE "owedAmount" END;
DO $$
DECLARE c RECORD; o RECORD; payment RECORD; remaining NUMERIC; repay NUMERIC; part NUMERIC; stored NUMERIC; owed NUMERIC; original_balance NUMERIC; original_owed NUMERIC; preorder_diff NUMERIC; prior_owed NUMERIC; issue_id INTEGER;
BEGIN
 FOR c IN SELECT * FROM "Customer" ORDER BY id LOOP
  original_balance := c.balance; original_owed := c."totalOwed"; issue_id:=NULL;
  repay:=0;
  FOR payment IN SELECT * FROM "Payment" WHERE "customerId"=c.id AND type='repay' ORDER BY "createdAt",id LOOP
   remaining:=payment.amount;
   FOR o IN SELECT * FROM "Order" WHERE "customerId"=c.id AND "owedAmount">0 AND status<>'cancelled' ORDER BY "createdAt",id LOOP
    part:=LEAST(remaining,o."owedAmount");
    IF part>0 THEN
     UPDATE "Order" SET "owedAmount"="owedAmount"-part,"paidAmount"="paidAmount"+part WHERE id=o.id;
     INSERT INTO "AuditLog" (action,"entityType","entityId",details) VALUES ('migration.repay.allocate','Order',o.id::text,jsonb_build_object('customerId',c.id,'amount',part,'paymentId',payment.id,'paymentMethod',payment."paymentMethod"));
     remaining:=remaining-part;
    END IF;
   END LOOP;
   repay:=repay+remaining;
  END LOOP;
  SELECT COALESCE(SUM(CASE WHEN type='recharge' THEN amount WHEN "paymentMethod"='balance' AND type='income' THEN -amount ELSE 0 END),0)+repay INTO stored FROM "Payment" WHERE "customerId"=c.id;
  SELECT COALESCE(SUM("owedAmount"),0) INTO owed FROM "Order" WHERE "customerId"=c.id AND status<>'cancelled';
  -- Negative reconstructed stored value is not silently trusted. Block release via reconciliation.
  IF stored<0 OR original_balance<>stored OR original_owed<>owed THEN
   INSERT INTO "AuditLog" (action,"entityType","entityId",details) VALUES ('migration.discrepancy','Customer',c.id::text,jsonb_build_object('oldBalance',original_balance,'oldOwed',original_owed,'reconstructedStored',stored,'reconstructedOwed',owed)) RETURNING id INTO issue_id;
  END IF;
  stored:=GREATEST(0,stored);
  UPDATE "Customer" SET "storedValueBalance"=stored,"receivableBalance"=owed,"availablePoints"=points,balance=stored,"totalOwed"=owed WHERE id=c.id;
  INSERT INTO "CustomerAccountEntry" ("customerId",account,amount,"balanceAfter",type,"sourceKey",notes) VALUES
   (c.id,'stored_value',stored,stored,'opening','migration:'||c.id||':stored','历史充值减预存消费及超额还款'),
   (c.id,'receivable',owed,owed,'opening','migration:'||c.id||':receivable','历史订单应收经未分配还款核销');
  INSERT INTO "PointEntry" ("customerId",amount,"balanceAfter",type,"sourceKey") VALUES (c.id,c.points,c.points,'opening','migration:'||c.id||':points');
  -- The old preorder endpoint never booked receivables. Resolve only that provable defect;
  -- every other mismatch remains a release blocker requiring a documented review.
  SELECT COALESCE(SUM((details->>'owedAmount')::numeric),0),COALESCE(SUM(CASE WHEN details->>'orderType'='preorder' THEN GREATEST(0,(details->>'totalAmount')::numeric-(details->>'paidAmount')::numeric)-(details->>'owedAmount')::numeric ELSE 0 END),0)
   INTO prior_owed,preorder_diff FROM "AuditLog" WHERE action='migration.order.snapshot' AND details->>'customerId'=c.id::text AND details->>'status'<>'cancelled';
  IF issue_id IS NOT NULL AND stored=original_balance AND prior_owed=original_owed AND owed-original_owed=preorder_diff AND preorder_diff>0
   AND NOT EXISTS(SELECT 1 FROM "Payment" WHERE "customerId"=c.id AND type='repay') THEN
   UPDATE "CustomerAccountEntry" SET amount=original_owed,"balanceAfter"=original_owed WHERE "sourceKey"='migration:'||c.id||':receivable';
   INSERT INTO "CustomerAccountEntry" ("customerId",account,amount,"balanceAfter",type,"sourceKey",notes)
    VALUES(c.id,'receivable',preorder_diff,owed,'opening_adjustment','migration:'||c.id||':preorder-adjustment','按未付款预售单补记原系统遗漏的应收；原订单金额及收款未改变');
   INSERT INTO "AuditLog" (action,"entityType","entityId",details)
    VALUES('migration.resolve','Customer',c.id::text,jsonb_build_object('issueId',issue_id,'reason','untracked_preorder_receivable','amount',preorder_diff,'notes','旧预售创建接口没有确认应收，按订单原金额减原收款补记；保留期初调整流水'));
  END IF;
 END LOOP;
END $$;
UPDATE "Order" SET "paymentStatus"=CASE WHEN "owedAmount"=0 THEN 'paid' WHEN "paidAmount">0 THEN 'partial' ELSE 'unpaid' END;
INSERT INTO "OrderCostAllocation" ("orderId","orderItemId","batchId","baseQty","unitCost","totalCost")
 SELECT i."orderId",i.id,i."batchId",i."baseQty",b."costPrice",ROUND(i."baseQty"*b."costPrice",2)
 FROM "OrderItem" i JOIN "StockBatch" b ON b.id=i."batchId";
-- Recipe allocation cannot be invented from present-day recipes. Flag historical missing costs.
INSERT INTO "AuditLog" (action,"entityType","entityId",details)
 SELECT 'migration.cost_missing','Order',o.id::text,jsonb_build_object('reason','历史配方明细缺少逐行批次成本，需人工核对') FROM "Order" o
 WHERE o."fulfillmentStatus"='completed' AND EXISTS(SELECT 1 FROM "OrderItem" i WHERE i."orderId"=o.id AND i."batchId" IS NULL);
INSERT INTO "AuditLog" (action,"entityType","entityId",details)
 SELECT 'migration.points.in_opening','Order',id::text,jsonb_build_object('earnedPoints',FLOOR("totalAmount"),'customerId',"customerId")
 FROM "Order" WHERE "orderType"='retail' AND "customerId" IS NOT NULL AND status<>'cancelled';
CREATE UNIQUE INDEX "CashShift_one_open_per_user" ON "CashShift"("userId") WHERE status='open';
CREATE OR REPLACE FUNCTION prevent_ledger_mutation() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'Ledger rows are immutable; append a compensating entry'; END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER account_immutable BEFORE UPDATE OR DELETE ON "CustomerAccountEntry" FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();
CREATE TRIGGER points_immutable BEFORE UPDATE OR DELETE ON "PointEntry" FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();
CREATE TRIGGER audit_immutable BEFORE UPDATE OR DELETE ON "AuditLog" FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();
CREATE TRIGGER payment_immutable BEFORE UPDATE OR DELETE ON "Payment" FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();
CREATE TRIGGER movement_immutable BEFORE UPDATE OR DELETE ON "StockMovement" FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();
CREATE TRIGGER cost_immutable BEFORE UPDATE OR DELETE ON "OrderCostAllocation" FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();
CREATE TRIGGER supplier_immutable BEFORE UPDATE OR DELETE ON "SupplierAccountEntry" FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();
CREATE TRIGGER cash_immutable BEFORE UPDATE OR DELETE ON "CashMovement" FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();
