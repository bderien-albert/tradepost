-- CreateTable
CREATE TABLE "public"."PostMessage" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PostMessage_postId_participantId_createdAt_idx" ON "public"."PostMessage"("postId", "participantId", "createdAt");

-- CreateIndex
CREATE INDEX "PostMessage_createdAt_idx" ON "public"."PostMessage"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."PostMessage" ADD CONSTRAINT "PostMessage_postId_fkey" FOREIGN KEY ("postId") REFERENCES "public"."Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PostMessage" ADD CONSTRAINT "PostMessage_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PostMessage" ADD CONSTRAINT "PostMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
