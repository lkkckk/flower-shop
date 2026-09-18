-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "trashedAt" TIMESTAMP(3),
ADD COLUMN     "trashedById" INTEGER;

-- CreateTable
CREATE TABLE "PreorderRegistration" (
    "id" SERIAL NOT NULL,
    "orderNo" TEXT NOT NULL,
    "contactPhone" TEXT,
    "deliveryTime" TIMESTAMP(3),
    "notes" TEXT,
    "cardMessage" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" INTEGER NOT NULL,
    "updatedById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "trashedAt" TIMESTAMP(3),
    "trashedById" INTEGER,

    CONSTRAINT "PreorderRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreorderRegistrationItem" (
    "id" SERIAL NOT NULL,
    "registrationId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "qty" DECIMAL(12,3) NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PreorderRegistrationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreorderRegistrationPhoto" (
    "id" SERIAL NOT NULL,
    "itemId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PreorderRegistrationPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PreorderRegistration_orderNo_idx" ON "PreorderRegistration"("orderNo");

-- CreateIndex
CREATE INDEX "PreorderRegistration_contactPhone_idx" ON "PreorderRegistration"("contactPhone");

-- CreateIndex
CREATE INDEX "PreorderRegistration_deliveryTime_idx" ON "PreorderRegistration"("deliveryTime");

-- CreateIndex
CREATE INDEX "PreorderRegistration_createdAt_idx" ON "PreorderRegistration"("createdAt");

-- CreateIndex
CREATE INDEX "PreorderRegistration_trashedAt_idx" ON "PreorderRegistration"("trashedAt");

-- CreateIndex
CREATE INDEX "PreorderRegistrationItem_registrationId_idx" ON "PreorderRegistrationItem"("registrationId");

-- CreateIndex
CREATE INDEX "PreorderRegistrationItem_name_idx" ON "PreorderRegistrationItem"("name");

-- CreateIndex
CREATE INDEX "PreorderRegistrationPhoto_itemId_idx" ON "PreorderRegistrationPhoto"("itemId");

-- CreateIndex
CREATE INDEX "Order_trashedAt_idx" ON "Order"("trashedAt");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_trashedById_fkey" FOREIGN KEY ("trashedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreorderRegistration" ADD CONSTRAINT "PreorderRegistration_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreorderRegistration" ADD CONSTRAINT "PreorderRegistration_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreorderRegistration" ADD CONSTRAINT "PreorderRegistration_trashedById_fkey" FOREIGN KEY ("trashedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreorderRegistrationItem" ADD CONSTRAINT "PreorderRegistrationItem_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "PreorderRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreorderRegistrationPhoto" ADD CONSTRAINT "PreorderRegistrationPhoto_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "PreorderRegistrationItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;