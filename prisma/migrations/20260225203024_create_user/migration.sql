-- CreateEnum
CREATE TYPE "ERole" AS ENUM ('User', 'Admin', 'Staff', 'Store_Manager');

-- CreateEnum
CREATE TYPE "ETask_Progress" AS ENUM ('Confirmed', 'Need_Stuff', 'Need_Human_Attention');

-- CreateEnum
CREATE TYPE "EBooking_Type" AS ENUM ('New', 'Existing', 'Urgent');

-- CreateEnum
CREATE TYPE "EBooking_Info" AS ENUM ('Confirmed', 'Decline');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "ERole" NOT NULL DEFAULT 'User',
    "password" TEXT NOT NULL,
    "contactNo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isBlocked" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
