-- CreateTable
CREATE TABLE "rate_requests" (
    "id" SERIAL NOT NULL,
    "request_id" VARCHAR(255) NOT NULL,
    "origin_postal_code" VARCHAR(20) NOT NULL,
    "destination_postal_code" VARCHAR(20) NOT NULL,
    "destination_country" VARCHAR(5) NOT NULL,
    "destination_province" VARCHAR(50) NOT NULL,
    "destination_city" VARCHAR(100) NOT NULL,
    "total_weight" DECIMAL(10,2) NOT NULL,
    "total_price" DECIMAL(10,2) NOT NULL,
    "items" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rate_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wwex_responses" (
    "id" SERIAL NOT NULL,
    "request_id" VARCHAR(255) NOT NULL,
    "wwex_quote_id" VARCHAR(255),
    "shipping_rate" DECIMAL(10,2),
    "transit_days" INTEGER,
    "service_level" VARCHAR(100),
    "response_time_ms" INTEGER NOT NULL,
    "error_message" TEXT,
    "raw_response" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wwex_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_cache" (
    "id" SERIAL NOT NULL,
    "cache_key" VARCHAR(255) NOT NULL,
    "origin_postal_code" VARCHAR(20) NOT NULL,
    "destination_postal_code" VARCHAR(20) NOT NULL,
    "weight_range_min" DECIMAL(10,2) NOT NULL,
    "weight_range_max" DECIMAL(10,2) NOT NULL,
    "shipping_rate" DECIMAL(10,2) NOT NULL,
    "transit_days" INTEGER NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rate_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_freight_data" (
    "id" SERIAL NOT NULL,
    "shopify_product_id" BIGINT NOT NULL,
    "shopify_variant_id" BIGINT,
    "weight_lbs" DECIMAL(10,2),
    "length_in" DECIMAL(10,2),
    "width_in" DECIMAL(10,2),
    "height_in" DECIMAL(10,2),
    "freight_class" VARCHAR(10),
    "is_freight_item" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_freight_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "error_logs" (
    "id" SERIAL NOT NULL,
    "error_type" VARCHAR(100),
    "error_message" TEXT,
    "stack_trace" TEXT,
    "request_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "error_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinalShippingRate" (
    "id" SERIAL NOT NULL,
    "request_id" VARCHAR(255) NOT NULL,
    "shipping_rate" DECIMAL(10,2),
    "transit_days" INTEGER,
    "destination" JSONB NOT NULL,
    "items" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinalShippingRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_tokens" (
    "id" SERIAL NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "access_token" TEXT NOT NULL,
    "expires_at" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rate_requests_request_id_key" ON "rate_requests"("request_id");

-- CreateIndex
CREATE INDEX "idx_postal_codes" ON "rate_requests"("origin_postal_code", "destination_postal_code");

-- CreateIndex
CREATE INDEX "idx_rate_request_created_at" ON "rate_requests"("created_at");

-- CreateIndex
CREATE INDEX "idx_request_id" ON "wwex_responses"("request_id");

-- CreateIndex
CREATE INDEX "idx_wwex_response_created_at" ON "wwex_responses"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "rate_cache_cache_key_key" ON "rate_cache"("cache_key");

-- CreateIndex
CREATE INDEX "idx_cache_key" ON "rate_cache"("cache_key");

-- CreateIndex
CREATE INDEX "idx_expires_at" ON "rate_cache"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "product_freight_data_shopify_product_id_key" ON "product_freight_data"("shopify_product_id");

-- CreateIndex
CREATE INDEX "idx_product_id" ON "product_freight_data"("shopify_product_id");

-- CreateIndex
CREATE INDEX "idx_variant_id" ON "product_freight_data"("shopify_variant_id");

-- CreateIndex
CREATE INDEX "idx_error_type" ON "error_logs"("error_type");

-- CreateIndex
CREATE INDEX "idx_error_log_created_at" ON "error_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "api_tokens_provider_key" ON "api_tokens"("provider");

-- CreateIndex
CREATE INDEX "idx_api_token_provider" ON "api_tokens"("provider");

-- CreateIndex
CREATE INDEX "idx_api_token_expires_at" ON "api_tokens"("expires_at");

-- AddForeignKey
ALTER TABLE "wwex_responses" ADD CONSTRAINT "wwex_responses_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "rate_requests"("request_id") ON DELETE RESTRICT ON UPDATE CASCADE;
