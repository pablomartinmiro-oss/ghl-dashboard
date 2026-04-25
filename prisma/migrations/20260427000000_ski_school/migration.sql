-- CreateTable
CREATE TABLE "Instructor" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "languages" JSONB NOT NULL,
    "specialties" JSONB,
    "level" TEXT,
    "bio" TEXT,
    "photoUrl" TEXT,
    "hourlyRate" INTEGER,
    "commissionPct" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'active',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Instructor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstructorCertification" (
    "id" TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "issuedBy" TEXT,
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "documentUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstructorCertification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstructorAvailability" (
    "id" TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,

    CONSTRAINT "InstructorAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonBooking" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "instructorId" TEXT,
    "destinationId" TEXT,
    "type" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "maxStudents" INTEGER NOT NULL DEFAULT 8,
    "currentStudents" INTEGER NOT NULL DEFAULT 0,
    "studentLevel" TEXT,
    "language" TEXT NOT NULL DEFAULT 'es',
    "priceCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonStudent" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT,
    "age" INTEGER,
    "level" TEXT,
    "notes" TEXT,
    "reservationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonStudent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentProgress" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "currentLevel" TEXT NOT NULL,
    "totalLessons" INTEGER NOT NULL DEFAULT 0,
    "totalHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "achievements" JSONB,
    "lastLessonDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Instructor_tenantId_idx" ON "Instructor"("tenantId");

-- CreateIndex
CREATE INDEX "Instructor_tenantId_status_idx" ON "Instructor"("tenantId", "status");

-- CreateIndex
CREATE INDEX "InstructorCertification_instructorId_idx" ON "InstructorCertification"("instructorId");

-- CreateIndex
CREATE INDEX "InstructorAvailability_instructorId_date_idx" ON "InstructorAvailability"("instructorId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "InstructorAvailability_instructorId_date_startTime_key" ON "InstructorAvailability"("instructorId", "date", "startTime");

-- CreateIndex
CREATE INDEX "LessonBooking_tenantId_idx" ON "LessonBooking"("tenantId");

-- CreateIndex
CREATE INDEX "LessonBooking_tenantId_date_idx" ON "LessonBooking"("tenantId", "date");

-- CreateIndex
CREATE INDEX "LessonBooking_instructorId_date_idx" ON "LessonBooking"("instructorId", "date");

-- CreateIndex
CREATE INDEX "LessonStudent_lessonId_idx" ON "LessonStudent"("lessonId");

-- CreateIndex
CREATE INDEX "StudentProgress_tenantId_idx" ON "StudentProgress"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProgress_tenantId_customerEmail_key" ON "StudentProgress"("tenantId", "customerEmail");

-- AddForeignKey
ALTER TABLE "Instructor" ADD CONSTRAINT "Instructor_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstructorCertification" ADD CONSTRAINT "InstructorCertification_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "Instructor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstructorAvailability" ADD CONSTRAINT "InstructorAvailability_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "Instructor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonBooking" ADD CONSTRAINT "LessonBooking_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonBooking" ADD CONSTRAINT "LessonBooking_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "Instructor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonBooking" ADD CONSTRAINT "LessonBooking_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonStudent" ADD CONSTRAINT "LessonStudent_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "LessonBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProgress" ADD CONSTRAINT "StudentProgress_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
