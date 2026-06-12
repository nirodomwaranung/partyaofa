-- CreateEnum
CREATE TYPE "ResultMode" AS ENUM ('random', 'weight', 'lock');

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "nick" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT NOT NULL DEFAULT '',
    "dept" TEXT NOT NULL DEFAULT '',
    "role" TEXT,
    "color" TEXT NOT NULL DEFAULT '#FF7A59',
    "photo" TEXT,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "drinks" INTEGER NOT NULL DEFAULT 0,
    "prize" INTEGER NOT NULL DEFAULT 0,
    "plays" INTEGER NOT NULL DEFAULT 0,
    "createdAt" INTEGER NOT NULL DEFAULT 0,
    "createdAtTs" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "cover" TEXT,
    "p1" INTEGER NOT NULL DEFAULT 0,
    "p2" INTEGER NOT NULL DEFAULT 0,
    "p3" INTEGER NOT NULL DEFAULT 0,
    "loserDrink" BOOLEAN NOT NULL DEFAULT true,
    "tigerImg" TEXT,
    "dragonImg" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Reward" (
    "id" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'gift',
    "label" TEXT NOT NULL,
    "img" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Reward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL DEFAULT 'live',
    "eventName" TEXT NOT NULL DEFAULT 'งานเลี้ยง AOFA 2026',
    "resultMode" "ResultMode" NOT NULL DEFAULT 'random',
    "roundIds" TEXT[],
    "spotlightId" TEXT,
    "weights" JSONB NOT NULL DEFAULT '{}',
    "lock" JSONB NOT NULL DEFAULT '{}',
    "activeGameKey" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoundResult" (
    "id" TEXT NOT NULL,
    "gameKey" TEXT NOT NULL,
    "playerId" TEXT,
    "outcome" TEXT NOT NULL,
    "rank" INTEGER,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "drink" BOOLEAN NOT NULL DEFAULT false,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoundResult_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "RoundResult" ADD CONSTRAINT "RoundResult_gameKey_fkey" FOREIGN KEY ("gameKey") REFERENCES "Game"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundResult" ADD CONSTRAINT "RoundResult_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
