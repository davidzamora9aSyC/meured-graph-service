CREATE SCHEMA IF NOT EXISTS "meured_graph";

CREATE TYPE "meured_graph"."MeuredFriendRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELED');
CREATE TYPE "meured_graph"."MeuredSuggestionReasonType" AS ENUM ('MUTUALS', 'SAME_ENTITY', 'SAME_SPECIALTY', 'TRENDING', 'OTHER');

CREATE TABLE "meured_graph"."MeuredFollow" (
  "id" TEXT NOT NULL,
  "followerAuthUserId" TEXT NOT NULL,
  "followeeAuthUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MeuredFollow_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "meured_graph"."MeuredFriendRequest" (
  "id" TEXT NOT NULL,
  "fromAuthUserId" TEXT NOT NULL,
  "toAuthUserId" TEXT NOT NULL,
  "status" "meured_graph"."MeuredFriendRequestStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MeuredFriendRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "meured_graph"."MeuredFriendship" (
  "id" TEXT NOT NULL,
  "userAAuthUserId" TEXT NOT NULL,
  "userBAuthUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MeuredFriendship_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "meured_graph"."MeuredBlock" (
  "id" TEXT NOT NULL,
  "blockerAuthUserId" TEXT NOT NULL,
  "blockedAuthUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MeuredBlock_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "meured_graph"."MeuredGraphSuggestion" (
  "id" TEXT NOT NULL,
  "authUserId" TEXT NOT NULL,
  "suggestedAuthUserId" TEXT NOT NULL,
  "score" INTEGER NOT NULL DEFAULT 0,
  "reasonType" "meured_graph"."MeuredSuggestionReasonType" NOT NULL DEFAULT 'OTHER',
  "reasonMetaJson" JSONB,
  "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MeuredGraphSuggestion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MeuredFollow_followerAuthUserId_followeeAuthUserId_key" ON "meured_graph"."MeuredFollow"("followerAuthUserId", "followeeAuthUserId");
CREATE INDEX "MeuredFollow_followeeAuthUserId_idx" ON "meured_graph"."MeuredFollow"("followeeAuthUserId");
CREATE INDEX "MeuredFollow_followerAuthUserId_idx" ON "meured_graph"."MeuredFollow"("followerAuthUserId");

CREATE INDEX "MeuredFriendRequest_fromAuthUserId_idx" ON "meured_graph"."MeuredFriendRequest"("fromAuthUserId");
CREATE INDEX "MeuredFriendRequest_toAuthUserId_idx" ON "meured_graph"."MeuredFriendRequest"("toAuthUserId");
CREATE INDEX "MeuredFriendRequest_status_idx" ON "meured_graph"."MeuredFriendRequest"("status");

CREATE UNIQUE INDEX "MeuredFriendship_userAAuthUserId_userBAuthUserId_key" ON "meured_graph"."MeuredFriendship"("userAAuthUserId", "userBAuthUserId");
CREATE INDEX "MeuredFriendship_userAAuthUserId_idx" ON "meured_graph"."MeuredFriendship"("userAAuthUserId");
CREATE INDEX "MeuredFriendship_userBAuthUserId_idx" ON "meured_graph"."MeuredFriendship"("userBAuthUserId");

CREATE UNIQUE INDEX "MeuredBlock_blockerAuthUserId_blockedAuthUserId_key" ON "meured_graph"."MeuredBlock"("blockerAuthUserId", "blockedAuthUserId");
CREATE INDEX "MeuredBlock_blockerAuthUserId_idx" ON "meured_graph"."MeuredBlock"("blockerAuthUserId");
CREATE INDEX "MeuredBlock_blockedAuthUserId_idx" ON "meured_graph"."MeuredBlock"("blockedAuthUserId");

CREATE UNIQUE INDEX "MeuredGraphSuggestion_authUserId_suggestedAuthUserId_key" ON "meured_graph"."MeuredGraphSuggestion"("authUserId", "suggestedAuthUserId");
CREATE INDEX "MeuredGraphSuggestion_authUserId_idx" ON "meured_graph"."MeuredGraphSuggestion"("authUserId");
CREATE INDEX "MeuredGraphSuggestion_score_idx" ON "meured_graph"."MeuredGraphSuggestion"("score");

