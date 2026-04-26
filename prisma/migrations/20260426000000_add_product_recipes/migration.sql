-- CreateTable
CREATE TABLE "ProductRecipe" (
  "id" SERIAL NOT NULL,
  "productId" INTEGER NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProductRecipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductRecipeItem" (
  "id" SERIAL NOT NULL,
  "recipeId" INTEGER NOT NULL,
  "componentProductId" INTEGER NOT NULL,
  "qty" DOUBLE PRECISION NOT NULL,
  "unit" TEXT NOT NULL,
  "sort" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,

  CONSTRAINT "ProductRecipeItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductRecipe_productId_key" ON "ProductRecipe"("productId");

-- CreateIndex
CREATE INDEX "ProductRecipeItem_recipeId_idx" ON "ProductRecipeItem"("recipeId");

-- CreateIndex
CREATE INDEX "ProductRecipeItem_componentProductId_idx" ON "ProductRecipeItem"("componentProductId");

-- AddForeignKey
ALTER TABLE "ProductRecipe" ADD CONSTRAINT "ProductRecipe_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductRecipeItem" ADD CONSTRAINT "ProductRecipeItem_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "ProductRecipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductRecipeItem" ADD CONSTRAINT "ProductRecipeItem_componentProductId_fkey" FOREIGN KEY ("componentProductId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
