-- CreateTable
CREATE TABLE `rate_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `request_id` VARCHAR(255) NOT NULL,
    `origin_postal_code` VARCHAR(20) NOT NULL,
    `destination_postal_code` VARCHAR(20) NOT NULL,
    `destination_country` VARCHAR(5) NOT NULL,
    `destination_province` VARCHAR(50) NOT NULL,
    `destination_city` VARCHAR(100) NOT NULL,
    `total_weight` DECIMAL(10, 2) NOT NULL,
    `total_price` DECIMAL(10, 2) NOT NULL,
    `items` JSON NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `rate_requests_request_id_key`(`request_id`),
    INDEX `idx_postal_codes`(`origin_postal_code`, `destination_postal_code`),
    INDEX `idx_rate_request_created_at`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wwex_responses` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `request_id` VARCHAR(255) NOT NULL,
    `wwex_quote_id` VARCHAR(255) NULL,
    `shipping_rate` DECIMAL(10, 2) NULL,
    `transit_days` INTEGER NULL,
    `service_level` VARCHAR(100) NULL,
    `response_time_ms` INTEGER NOT NULL,
    `error_message` TEXT NULL,
    `raw_response` JSON NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_request_id`(`request_id`),
    INDEX `idx_wwex_response_created_at`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rate_cache` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cache_key` VARCHAR(255) NOT NULL,
    `origin_postal_code` VARCHAR(20) NOT NULL,
    `destination_postal_code` VARCHAR(20) NOT NULL,
    `weight_range_min` DECIMAL(10, 2) NOT NULL,
    `weight_range_max` DECIMAL(10, 2) NOT NULL,
    `shipping_rate` DECIMAL(10, 2) NOT NULL,
    `transit_days` INTEGER NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `rate_cache_cache_key_key`(`cache_key`),
    INDEX `idx_cache_key`(`cache_key`),
    INDEX `idx_expires_at`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_freight_data` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `shopify_product_id` BIGINT NOT NULL,
    `shopify_variant_id` BIGINT NULL,
    `weight_lbs` DECIMAL(10, 2) NULL,
    `length_in` DECIMAL(10, 2) NULL,
    `width_in` DECIMAL(10, 2) NULL,
    `height_in` DECIMAL(10, 2) NULL,
    `freight_class` VARCHAR(10) NULL,
    `is_freight_item` BOOLEAN NOT NULL DEFAULT false,
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `product_freight_data_shopify_product_id_key`(`shopify_product_id`),
    INDEX `idx_product_id`(`shopify_product_id`),
    INDEX `idx_variant_id`(`shopify_variant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `error_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `error_type` VARCHAR(100) NULL,
    `error_message` TEXT NULL,
    `stack_trace` TEXT NULL,
    `request_data` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_error_type`(`error_type`),
    INDEX `idx_error_log_created_at`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FinalShippingRate` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `request_id` VARCHAR(255) NOT NULL,
    `shipping_rate` DECIMAL(10, 2) NULL,
    `transit_days` INTEGER NULL,
    `destination` JSON NOT NULL,
    `items` JSON NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `api_tokens` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `provider` VARCHAR(50) NOT NULL,
    `access_token` TEXT NOT NULL,
    `expires_at` BIGINT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `api_tokens_provider_key`(`provider`),
    INDEX `idx_api_token_provider`(`provider`),
    INDEX `idx_api_token_expires_at`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `wwex_responses` ADD CONSTRAINT `wwex_responses_request_id_fkey` FOREIGN KEY (`request_id`) REFERENCES `rate_requests`(`request_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
