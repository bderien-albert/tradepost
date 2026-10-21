-- CreateEnum
CREATE TYPE "public"."WoodSize" AS ENUM ('SMALL', 'MEDIUM', 'BIG', 'SMALL_TRUCKLOAD', 'LONG_TRUCKLOAD');

-- AlterTable
ALTER TABLE "public"."Post" ADD COLUMN     "size" "public"."WoodSize";

-- AlterTable
ALTER TABLE "public"."Trade" ADD COLUMN     "size" "public"."WoodSize";

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "avatarColor" TEXT,
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "failedLogins" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lockedUntil" TIMESTAMP(3),
ADD COLUMN     "passwordHash" TEXT,
ALTER COLUMN "robloxUserId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "public"."SavedPost" (
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedPost_pkey" PRIMARY KEY ("userId","postId")
);

-- AddForeignKey
ALTER TABLE "public"."SavedPost" ADD CONSTRAINT "SavedPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SavedPost" ADD CONSTRAINT "SavedPost_postId_fkey" FOREIGN KEY ("postId") REFERENCES "public"."Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
