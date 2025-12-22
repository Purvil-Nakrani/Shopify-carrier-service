-- Database schema for Shopify Freight Carrier Service

CREATE DATABASE IF NOT EXISTS freight_shipping;
USE freight_shipping;

-- Table to store shipping rate requests and responses
CREATE TABLE IF NOT EXISTS rate_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    request_id VARCHAR(255) UNIQUE,
    origin_postal_code VARCHAR(20),
    destination_postal_code VARCHAR(20),
    destination_country VARCHAR(5),
    destination_province VARCHAR(50),
    destination_city VARCHAR(100),
    total_weight DECIMAL(10,2),
    total_price DECIMAL(10,2),
    items JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_postal_codes (origin_postal_code, destination_postal_code),
    INDEX idx_created_at (created_at)
);

-- Table to store WWEX API responses
CREATE TABLE IF NOT EXISTS wwex_responses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    request_id VARCHAR(255),
    wwex_quote_id VARCHAR(255),
    shipping_rate DECIMAL(10,2),
    transit_days INT,
    service_level VARCHAR(100),
    response_time_ms INT,
    error_message TEXT,
    raw_response JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES rate_requests(request_id),
    INDEX idx_request_id (request_id),
    INDEX idx_created_at (created_at)
);

-- Table to cache rates for similar requests (optional optimization)
CREATE TABLE IF NOT EXISTS rate_cache (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cache_key VARCHAR(255) UNIQUE,
    origin_postal_code VARCHAR(20),
    destination_postal_code VARCHAR(20),
    weight_range_min DECIMAL(10,2),
    weight_range_max DECIMAL(10,2),
    shipping_rate DECIMAL(10,2),
    transit_days INT,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_cache_key (cache_key),
    INDEX idx_expires_at (expires_at)
);

-- Table to store product dimensions and weights
CREATE TABLE IF NOT EXISTS product_freight_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    shopify_product_id BIGINT UNIQUE,
    shopify_variant_id BIGINT,
    weight_lbs DECIMAL(10,2),
    length_in DECIMAL(10,2),
    width_in DECIMAL(10,2),
    height_in DECIMAL(10,2),
    freight_class VARCHAR(10),
    is_freight_item BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_product_id (shopify_product_id),
    INDEX idx_variant_id (shopify_variant_id)
);

-- Table to log errors and debugging
CREATE TABLE IF NOT EXISTS error_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    error_type VARCHAR(100),
    error_message TEXT,
    stack_trace TEXT,
    request_data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_error_type (error_type),
    INDEX idx_created_at (created_at)
);
