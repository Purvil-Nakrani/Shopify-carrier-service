#!/usr/bin/env node

/**
 * Test script for Shopify Carrier Service
 * Simulates a rate request from Shopify
 */

const crypto = require('crypto');
const https = require('https');

const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET || '';

// Sample rate request payload
const rateRequest = {
  rate: {
    origin: {
      country: 'US',
      postal_code: '90210',
      province: 'CA',
      city: 'Beverly Hills',
      name: null,
      address1: null,
      address2: null,
      address3: null,
      phone: null,
      fax: null,
      email: null,
      address_type: null,
      company_name: 'Company Name'
    },
    destination: {
      country: 'US',
      postal_code: '10001',
      province: 'NY',
      city: 'New York',
      name: 'John Doe',
      address1: '123 Main St',
      address2: null,
      address3: null,
      phone: null,
      fax: null,
      email: null,
      address_type: null,
      company_name: null
    },
    items: [
      {
        name: 'Roll Product - Custom Dimensions (Per-item < 150 lbs)',
        sku: 'ROLL-001',
        quantity: 1,
        grams: 45359, // Not used for rolls, weight calculated from area
        price: 50000,
        vendor: 'Test Vendor',
        requires_shipping: true,
        taxable: true,
        fulfillment_service: 'manual',
        properties: {
          // Customer entered dimensions:
          Width: '4',           // 4 feet
          Length: '10',         // 10 feet
          // Weight calculation:
          // Area: 4 × 10 = 40 sq ft
          // Weight per sq ft: 1.60 lbs
          // Per-item weight: 40 × 1.60 = 64 lbs
          // Quantity: 10
          // Total weight: 64 × 10 = 640 lbs
          // Per-item weight (64 lbs) < 150 lbs → Show both FedEx + WWEX
          weight_per_sqft: '1.60',
          dimension_height: '48'
        },
        product_id: 123456789,
        variant_id: 987654321
      },
      {
        name: 'Roll Product - Custom Dimensions (Per-item >= 150 lbs)',
        sku: 'ROLL-002',
        quantity: 1,
        grams: 45359,
        price: 75000,
        vendor: 'Test Vendor',
        requires_shipping: true,
        taxable: true,
        fulfillment_service: 'manual',
        properties: {
          // Customer entered dimensions:
          Width: '4',           // 4 feet
          Length: '50',         // 50 feet
          // Weight calculation:
          // Area: 4 × 50 = 200 sq ft
          // Weight per sq ft: 1.60 lbs
          // Per-item weight: 200 × 1.60 = 320 lbs
          // Quantity: 1
          // Total weight: 320 × 1 = 320 lbs
          // Per-item weight (320 lbs) >= 150 lbs → Show only WWEX
          weight_per_sqft: '1.60',
          dimension_height: '48'
        },
        product_id: 123456790,
        variant_id: 987654322
      },
      {
        name: 'Fixed Weight Product (Per-item < 150 lbs)',
        sku: 'FIXED-001',
        quantity: 4,
        grams: 45359, // Not used, using fixed_weight
        price: 30000,
        vendor: 'Test Vendor',
        requires_shipping: true,
        taxable: true,
        fulfillment_service: 'manual',
        properties: {
          // Fixed weight product:
          fixed_weight: '32.30',  // 32.30 lbs per item
          // Per-item weight: 32.30 lbs
          // Quantity: 4
          // Total weight: 32.30 × 4 = 129.2 lbs
          // Per-item weight (32.30 lbs) < 150 lbs → Show both FedEx + WWEX
          dimension_height: '48',
          dimension_length: '40',
          dimension_width: '40'
        },
        product_id: 123456791,
        variant_id: 987654323
      },
      {
        name: 'Fixed Weight Product (Per-item >= 150 lbs)',
        sku: 'FIXED-002',
        quantity: 10,
        grams: 45359,
        price: 40000,
        vendor: 'Test Vendor',
        requires_shipping: true,
        taxable: true,
        fulfillment_service: 'manual',
        properties: {
          // Fixed weight product:
          fixed_weight: '32.30',  // 32.30 lbs per item
          // Per-item weight: 32.30 lbs
          // Quantity: 10
          // Total weight: 32.30 × 10 = 323 lbs
          // Per-item weight (32.30 lbs) < 150 lbs → Show both FedEx + WWEX
          dimension_height: '48',
          dimension_length: '40',
          dimension_width: '40'
        },
        product_id: 123456792,
        variant_id: 987654324
      }
    ],
    currency: 'USD',
    locale: 'en-US',
    subtotal_price: '1000.00'
  }
};

// Generate HMAC signature
function generateHMAC(body) {
  return crypto
    .createHmac('sha256', SHOPIFY_API_SECRET)
    .update(body)
    .digest('base64');
}

// Make request
async function testCarrierService() {
  console.log('🟢 Testing Carrier Service...');
  console.log('🟢 Target URL:', `${APP_URL}/api/carrier-service`);
  
  const body = JSON.stringify(rateRequest);
  const hmac = generateHMAC(body);

  const url = new URL(`${APP_URL}/api/carrier-service`);
  
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      'X-Shopify-Hmac-Sha256': hmac
    }
  };

  return new Promise((resolve, reject) => {
    const protocol = url.protocol === 'https:' ? https : require('http');
    
    const req = protocol.request(url, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log('\n🟢 === Response ===');
        console.log('🟢 Status:', res.statusCode);
        console.log('🟢 Headers:', res.headers);
        console.log('\n🟢 Body:');
        
        try {
          const parsed = JSON.parse(data);
          console.log(JSON.stringify(parsed, null, 2));
          
          if (parsed.rates && parsed.rates.length > 0) {
            console.log('\n✓ SUCCESS: Received shipping rates!');
            console.log(`Rate: $${(parseInt(parsed.rates[0].total_price) / 100).toFixed(2)}`);
          } else {
            console.log('\n⚠ WARNING: No rates returned');
          }
          
          resolve(parsed);
        } catch (e) {
          console.log(data);
          resolve(data);
        }
      });
    });

    req.on('error', (error) => {
      console.error('🔴 ✗ ERROR:', error.message);
      reject(error);
    });

    req.write(body);
    req.end();
  });
}

// Run test
console.log('🟢 Shopify Carrier Service Test - Dynamic Shipping Logic\n');
console.log('='.repeat(60));
console.log('Testing MULTIPLE scenarios:\n');
console.log('1. Roll Product (Per-item < 150 lbs):');
console.log('   Width: 4 ft × Length: 10 ft = 40 sq ft');
console.log('   40 sq ft × 1.60 lbs/sqft = 64 lbs per item');
console.log('   64 lbs × 10 qty = 640 lbs total');
console.log('   → Per-item: 64 lbs < 150 → Show both FedEx + WWEX\n');

console.log('2. Roll Product (Per-item >= 150 lbs):');
console.log('   Width: 4 ft × Length: 50 ft = 200 sq ft');
console.log('   200 sq ft × 1.60 lbs/sqft = 320 lbs per item');
console.log('   320 lbs × 1 qty = 320 lbs total');
console.log('   → Per-item: 320 lbs >= 150 → Show only WWEX\n');

console.log('3. Fixed Weight Product (Per-item < 150 lbs):');
console.log('   32.30 lbs × 4 qty = 129.2 lbs total');
console.log('   → Per-item: 32.30 lbs < 150 → Show both FedEx + WWEX\n');

console.log('4. Fixed Weight Product (Many items):');
console.log('   32.30 lbs × 10 qty = 323 lbs total');
console.log('   → Per-item: 32.30 lbs < 150 → Show both FedEx + WWEX\n');
console.log('='.repeat(60));
console.log('\nRequest payload:');
console.log(JSON.stringify(rateRequest, null, 2));
console.log('\n');

testCarrierService()
  .then(() => {
    console.log('\n🟢 Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('🔴 Test failed:', error);
    process.exit(1);
  });
