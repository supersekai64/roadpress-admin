-- CreateEnum
CREATE TYPE "LicenseStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'EXPIRED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "licenses" (
    "id" TEXT NOT NULL,
    "license_key" TEXT NOT NULL,
    "api_token" TEXT,
    "client_name" TEXT NOT NULL,
    "status" "LicenseStatus" NOT NULL DEFAULT 'INACTIVE',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "site_url" TEXT,
    "is_associated" BOOLEAN NOT NULL DEFAULT false,
    "last_update" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "licenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_stats" (
    "id" TEXT NOT NULL,
    "license_id" TEXT NOT NULL,
    "emails_sent" INTEGER NOT NULL DEFAULT 0,
    "last_update" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_stats_monthly" (
    "id" TEXT NOT NULL,
    "license_id" TEXT NOT NULL,
    "stat_year" INTEGER NOT NULL,
    "stat_month" INTEGER NOT NULL,
    "emails_sent" INTEGER NOT NULL DEFAULT 0,
    "last_update" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_stats_monthly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_logs" (
    "id" TEXT NOT NULL,
    "license_id" TEXT NOT NULL,
    "email_to" TEXT NOT NULL,
    "subject" TEXT,
    "status" TEXT NOT NULL,
    "send_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sms_stats" (
    "id" TEXT NOT NULL,
    "license_id" TEXT NOT NULL,
    "sms_sent" INTEGER NOT NULL DEFAULT 0,
    "total_cost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "last_update" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sms_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sms_stats_monthly" (
    "id" TEXT NOT NULL,
    "license_id" TEXT NOT NULL,
    "stat_year" INTEGER NOT NULL,
    "stat_month" INTEGER NOT NULL,
    "sms_sent" INTEGER NOT NULL DEFAULT 0,
    "total_cost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "last_update" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sms_stats_monthly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sms_logs" (
    "id" TEXT NOT NULL,
    "license_id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "country" TEXT,
    "status" TEXT NOT NULL,
    "cost" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "send_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sms_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deepl_stats" (
    "id" TEXT NOT NULL,
    "license_id" TEXT NOT NULL,
    "translations_count" INTEGER NOT NULL DEFAULT 0,
    "characters_translated" INTEGER NOT NULL DEFAULT 0,
    "last_update" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deepl_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deepl_stats_monthly" (
    "id" TEXT NOT NULL,
    "license_id" TEXT NOT NULL,
    "stat_year" INTEGER NOT NULL,
    "stat_month" INTEGER NOT NULL,
    "translations_count" INTEGER NOT NULL DEFAULT 0,
    "characters_translated" INTEGER NOT NULL DEFAULT 0,
    "last_update" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deepl_stats_monthly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "openai_stats" (
    "id" TEXT NOT NULL,
    "license_id" TEXT NOT NULL,
    "requests_count" INTEGER NOT NULL DEFAULT 0,
    "prompt_tokens" INTEGER NOT NULL DEFAULT 0,
    "completion_tokens" INTEGER NOT NULL DEFAULT 0,
    "total_tokens" INTEGER NOT NULL DEFAULT 0,
    "total_cost" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "last_update" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "openai_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "openai_stats_monthly" (
    "id" TEXT NOT NULL,
    "license_id" TEXT NOT NULL,
    "stat_year" INTEGER NOT NULL,
    "stat_month" INTEGER NOT NULL,
    "requests_count" INTEGER NOT NULL DEFAULT 0,
    "prompt_tokens" INTEGER NOT NULL DEFAULT 0,
    "completion_tokens" INTEGER NOT NULL DEFAULT 0,
    "total_tokens" INTEGER NOT NULL DEFAULT 0,
    "total_cost" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "last_update" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "openai_stats_monthly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pois" (
    "id" TEXT NOT NULL,
    "license_id" TEXT NOT NULL,
    "poi_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "address" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "visit_count" INTEGER NOT NULL DEFAULT 0,
    "season_data" TEXT,
    "sync_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pois_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_push" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "licenses_license_key_key" ON "licenses"("license_key");

-- CreateIndex
CREATE UNIQUE INDEX "licenses_api_token_key" ON "licenses"("api_token");

-- CreateIndex
CREATE INDEX "email_stats_license_id_idx" ON "email_stats"("license_id");

-- CreateIndex
CREATE INDEX "email_stats_created_at_idx" ON "email_stats"("created_at");

-- CreateIndex
CREATE INDEX "email_stats_monthly_license_id_idx" ON "email_stats_monthly"("license_id");

-- CreateIndex
CREATE UNIQUE INDEX "email_stats_monthly_license_id_stat_year_stat_month_key" ON "email_stats_monthly"("license_id", "stat_year", "stat_month");

-- CreateIndex
CREATE INDEX "email_logs_license_id_idx" ON "email_logs"("license_id");

-- CreateIndex
CREATE INDEX "email_logs_send_date_idx" ON "email_logs"("send_date");

-- CreateIndex
CREATE INDEX "sms_stats_license_id_idx" ON "sms_stats"("license_id");

-- CreateIndex
CREATE INDEX "sms_stats_created_at_idx" ON "sms_stats"("created_at");

-- CreateIndex
CREATE INDEX "sms_stats_monthly_license_id_idx" ON "sms_stats_monthly"("license_id");

-- CreateIndex
CREATE UNIQUE INDEX "sms_stats_monthly_license_id_stat_year_stat_month_key" ON "sms_stats_monthly"("license_id", "stat_year", "stat_month");

-- CreateIndex
CREATE INDEX "sms_logs_license_id_idx" ON "sms_logs"("license_id");

-- CreateIndex
CREATE INDEX "sms_logs_send_date_idx" ON "sms_logs"("send_date");

-- CreateIndex
CREATE INDEX "sms_logs_country_idx" ON "sms_logs"("country");

-- CreateIndex
CREATE INDEX "deepl_stats_license_id_idx" ON "deepl_stats"("license_id");

-- CreateIndex
CREATE INDEX "deepl_stats_created_at_idx" ON "deepl_stats"("created_at");

-- CreateIndex
CREATE INDEX "deepl_stats_monthly_license_id_idx" ON "deepl_stats_monthly"("license_id");

-- CreateIndex
CREATE UNIQUE INDEX "deepl_stats_monthly_license_id_stat_year_stat_month_key" ON "deepl_stats_monthly"("license_id", "stat_year", "stat_month");

-- CreateIndex
CREATE INDEX "openai_stats_license_id_idx" ON "openai_stats"("license_id");

-- CreateIndex
CREATE INDEX "openai_stats_created_at_idx" ON "openai_stats"("created_at");

-- CreateIndex
CREATE INDEX "openai_stats_monthly_license_id_idx" ON "openai_stats_monthly"("license_id");

-- CreateIndex
CREATE UNIQUE INDEX "openai_stats_monthly_license_id_stat_year_stat_month_key" ON "openai_stats_monthly"("license_id", "stat_year", "stat_month");

-- CreateIndex
CREATE INDEX "pois_license_id_idx" ON "pois"("license_id");

-- CreateIndex
CREATE INDEX "pois_latitude_longitude_idx" ON "pois"("latitude", "longitude");

-- CreateIndex
CREATE UNIQUE INDEX "pois_license_id_poi_id_key" ON "pois"("license_id", "poi_id");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_service_key" ON "api_keys"("service");

-- AddForeignKey
ALTER TABLE "email_stats" ADD CONSTRAINT "email_stats_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "licenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_stats_monthly" ADD CONSTRAINT "email_stats_monthly_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "licenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "licenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sms_stats" ADD CONSTRAINT "sms_stats_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "licenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sms_stats_monthly" ADD CONSTRAINT "sms_stats_monthly_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "licenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sms_logs" ADD CONSTRAINT "sms_logs_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "licenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deepl_stats" ADD CONSTRAINT "deepl_stats_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "licenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deepl_stats_monthly" ADD CONSTRAINT "deepl_stats_monthly_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "licenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "openai_stats" ADD CONSTRAINT "openai_stats_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "licenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "openai_stats_monthly" ADD CONSTRAINT "openai_stats_monthly_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "licenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pois" ADD CONSTRAINT "pois_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "licenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
