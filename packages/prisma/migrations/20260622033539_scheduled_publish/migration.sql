-- AlterTable
ALTER TABLE "InterviewNotice" ADD COLUMN     "scheduledPublishAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "NewsPost" ADD COLUMN     "scheduledPublishAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Vacancy" ADD COLUMN     "scheduledPublishAt" TIMESTAMP(3);
