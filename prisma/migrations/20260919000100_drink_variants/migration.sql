ALTER TABLE "Product" ADD COLUMN "productType" TEXT NOT NULL DEFAULT 'standard';
CREATE TABLE "DrinkOptionGroup" (
  "id" TEXT NOT NULL PRIMARY KEY, "productId" INTEGER NOT NULL, "name" TEXT NOT NULL,
  "sort" INTEGER NOT NULL DEFAULT 0, "active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "DrinkOptionGroup_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "DrinkOptionGroup_productId_idx" ON "DrinkOptionGroup"("productId");
CREATE TABLE "DrinkOption" (
  "id" TEXT NOT NULL PRIMARY KEY, "groupId" TEXT NOT NULL, "name" TEXT NOT NULL,
  "sort" INTEGER NOT NULL DEFAULT 0, "active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "DrinkOption_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "DrinkOptionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "DrinkOption_groupId_idx" ON "DrinkOption"("groupId");
CREATE TABLE "DrinkVariant" (
  "id" TEXT NOT NULL PRIMARY KEY, "productId" INTEGER NOT NULL, "selectionKey" TEXT NOT NULL,
  "options" JSONB NOT NULL, "price" DECIMAL(12,2), "enabled" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "DrinkVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "DrinkVariant_valid_price" CHECK (("price" IS NULL OR "price" > 0) AND (NOT "enabled" OR "price" IS NOT NULL))
);
CREATE UNIQUE INDEX "DrinkVariant_productId_selectionKey_key" ON "DrinkVariant"("productId", "selectionKey");
ALTER TABLE "OrderItem" ADD COLUMN "variantId" TEXT,
  ADD COLUMN "productNameSnapshot" TEXT, ADD COLUMN "variantLabel" TEXT, ADD COLUMN "productTypeSnapshot" TEXT;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "DrinkVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
