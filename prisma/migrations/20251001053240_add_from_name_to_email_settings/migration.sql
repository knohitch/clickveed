/*
  Warnings:

  - Added the required column `fromName` to the `EmailSettings` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "EmailSettings" ADD COLUMN     "fromName" TEXT NOT NULL DEFAULT 'ClickVid Pro';
