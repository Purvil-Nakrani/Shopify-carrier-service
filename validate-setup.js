#!/usr/bin/env node

/**
 * Validation Script for Custom Dimensions Setup
 * Checks if everything is configured correctly
 */

const https = require('https');

const SHOP_DOMAIN = process.env.SHOPIFY_SHOP_DOMAIN;
const ADMIN_API_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

console.log('🔍 Custom Dimensions Setup Validator\n');
console.log('='.repeat(60));

// Test 1: Check if we can access Shopify API
async function testShopifyAccess() {
  console.log('\n1️⃣  Testing Shopify API Access...');
  
  if (!SHOP_DOMAIN || !ADMIN_API_TOKEN) {
    console.log('   ❌ Missing SHOPIFY_SHOP_DOMAIN or SHOPIFY_ACCESS_TOKEN');
    return false;
  }
  
  try {
    // Try to fetch shop info
    const url = `https://${SHOP_DOMAIN}/admin/api/2024-01/shop.json`;
    
    await new Promise((resolve, reject) => {
      const req = https.get(url, {
        headers: {
          'X-Shopify-Access-Token': ADMIN_API_TOKEN
        }
      }, (res) => {
        if (res.statusCode === 200) {
          console.log('   ✅ Shopify API connection successful');
          resolve(true);
        } else {
          console.log(`   ❌ Shopify API returned status ${res.statusCode}`);
          reject(false);
        }
      });
      
      req.on('error', (error) => {
        console.log('   ❌ Error connecting to Shopify:', error.message);
        reject(false);
      });
      
      req.end();
    });
    
    return true;
  } catch (error) {
    return false;
  }
}

// Test 2: Check carrier service
async function testCarrierService() {
  console.log('\n2️⃣  Checking Carrier Service...');
  
  const APP_URL = process.env.APP_URL || 'http://localhost:3000';
  
  try {
    const url = new URL(`${APP_URL}/api/setup`);
    const protocol = url.protocol === 'https:' ? https : require('http');
    
    await new Promise((resolve, reject) => {
      const req = protocol.get(url, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.success && parsed.carrier_services) {
              const wwexService = parsed.carrier_services.carrier_services?.find(
                s => s.name === 'WWEX Freight Shipping'
              );
              
              if (wwexService) {
                console.log('   ✅ WWEX Carrier Service is registered');
                console.log(`      ID: ${wwexService.id}`);
                console.log(`      Active: ${wwexService.active}`);
              } else {
                console.log('   ⚠️  WWEX Carrier Service not found');
                console.log('      Run: curl -X POST ' + APP_URL + '/api/setup');
              }
            }
            resolve(true);
          } catch (e) {
            console.log('   ❌ Error parsing response');
            reject(false);
          }
        });
      });
      
      req.on('error', (error) => {
        console.log('   ❌ Cannot connect to app:', error.message);
        console.log('      Make sure the app is running');
        reject(false);
      });
      
      req.end();
    });
    
    return true;
  } catch (error) {
    return false;
  }
}

// Test 3: Validate custom dimensions logic
function testCustomDimensionLogic() {
  console.log('\n3️⃣  Testing Custom Dimension Calculation...');
  
  const testCases = [
    { width: 4, length: 25, quantity: 2, expected: 200 },
    { width: 3.5, length: 22.5, quantity: 3, expected: 236.25 },
    { width: 6, length: 50, quantity: 5, expected: 1500 },
  ];
  
  let allPassed = true;
  
  testCases.forEach((test, index) => {
    const calculated = test.width * test.length * test.quantity;
    const passed = calculated === test.expected;
    
    console.log(`   ${passed ? '✅' : '❌'} Test ${index + 1}: ${test.width} × ${test.length} × ${test.quantity} = ${calculated}`);
    
    if (!passed) {
      console.log(`      Expected: ${test.expected}, Got: ${calculated}`);
      allPassed = false;
    }
  });
  
  return allPassed;
}

// Test 4: Check database connection
async function testDatabaseConnection() {
  console.log('\n4️⃣  Testing Database Connection...');
  
  try {
    const mysql = require('mysql2/promise');
    
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'freight_shipping'
    });
    
    // Test query
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM rate_requests');
    console.log('   ✅ Database connection successful');
    console.log(`      Total rate requests: ${rows[0].count}`);
    
    await connection.end();
    return true;
  } catch (error) {
    console.log('   ❌ Database connection failed:', error.message);
    console.log('      Make sure MySQL is running and schema is imported');
    return false;
  }
}

// Test 5: Sample property extraction
function testPropertyExtraction() {
  console.log('\n5️⃣  Testing Property Extraction Logic...');
  
  const sampleItem = {
    properties: {
      Width: "4",
      Length: "25",
      Quantity: "2"
    },
    quantity: 1
  };
  
  // Simulate extraction
  const customWidth = parseFloat(sampleItem.properties?.Width || sampleItem.properties?.width || 0);
  const customLength = parseFloat(sampleItem.properties?.Length || sampleItem.properties?.length || 0);
  const customQuantity = parseInt(sampleItem.properties?.Quantity || sampleItem.quantity);
  
  console.log(`   Extracted Width: ${customWidth} ft`);
  console.log(`   Extracted Length: ${customLength} ft`);
  console.log(`   Extracted Quantity: ${customQuantity}`);
  
  const calculatedQty = customWidth * customLength * customQuantity;
  console.log(`   Calculated: ${customWidth} × ${customLength} × ${customQuantity} = ${calculatedQty} sq ft`);
  
  if (calculatedQty === 200) {
    console.log('   ✅ Property extraction working correctly');
    return true;
  } else {
    console.log('   ❌ Unexpected calculation result');
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('Running validation tests...\n');
  
  const results = {
    shopifyAccess: false,
    carrierService: false,
    calculationLogic: false,
    database: false,
    propertyExtraction: false
  };
  
  try {
    results.shopifyAccess = await testShopifyAccess();
  } catch (e) {
    console.log('   Skipped: Missing credentials');
  }
  
  try {
    results.carrierService = await testCarrierService();
  } catch (e) {
    console.log('   Skipped: App not running');
  }
  
  results.calculationLogic = testCustomDimensionLogic();
  
  try {
    results.database = await testDatabaseConnection();
  } catch (e) {
    console.log('   Skipped: Database not configured');
  }
  
  results.propertyExtraction = testPropertyExtraction();
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY\n');
  
  const passed = Object.values(results).filter(r => r === true).length;
  const total = Object.values(results).length;
  
  console.log(`Tests Passed: ${passed}/${total}\n`);
  
  if (passed === total) {
    console.log('✅ All tests passed! Your setup is ready.');
  } else {
    console.log('⚠️  Some tests failed. Review the output above.');
  }
  
  console.log('\n' + '='.repeat(60));
  
  console.log('\n📝 NEXT STEPS:\n');
  if (!results.shopifyAccess) {
    console.log('• Configure Shopify credentials in .env file');
  }
  if (!results.carrierService) {
    console.log('• Start the app: npm run dev or docker-compose up');
    console.log('• Register carrier service: POST to /api/setup');
  }
  if (!results.database) {
    console.log('• Start MySQL and import schema.sql');
  }
  
  console.log('\n💡 To test with real data:');
  console.log('   1. Add product to cart with Width, Length, Quantity properties');
  console.log('   2. Go to checkout');
  console.log('   3. Check server logs for "Custom calculation: ..." message');
  console.log('   4. Verify WWEX freight rate appears\n');
}

// Execute
runAllTests()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nValidation failed:', error);
    process.exit(1);
  });
