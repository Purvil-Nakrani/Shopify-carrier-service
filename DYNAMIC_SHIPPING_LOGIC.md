# Dynamic Shipping Logic Guide - FedEx + WWEX

## Overview

The app now intelligently determines which shipping methods to show based on **per-item weight**:

- **Per-item weight < 150 lbs** → Show both FedEx (split) + WWEX (combined)
- **Per-item weight ≥ 150 lbs** → Show only WWEX

## Product Types Supported

### 1. Roll Products (Custom Dimensions)
Customer enters width and length, app calculates weight based on area.

### 2. Fixed Weight Products  
Standard products with a fixed weight per item.

---

## Logic Breakdown

### Roll Products

**Properties in cart:**
- `Width` - Width in feet (e.g., "4")
- `Length` - Length in feet (e.g., "50")
- `weight_per_sqft` - Weight per square foot (e.g., "1.60")

**Calculation:**
```
Area = Width × Length
Per-item Weight = Area × weight_per_sqft
Total Weight = Per-item Weight × Quantity
```

**Example 1: Small Roll (Per-item < 150 lbs)**
```
Width: 4 ft
Length: 10 ft
Weight per sq ft: 1.60 lbs
Quantity: 10

Calculation:
Area = 4 × 10 = 40 sq ft
Per-item weight = 40 × 1.60 = 64 lbs
Total weight = 64 × 10 = 640 lbs

Result: Per-item (64 lbs) < 150 lbs
→ Show both FedEx + WWEX
```

**Example 2: Large Roll (Per-item ≥ 150 lbs)**
```
Width: 4 ft
Length: 50 ft
Weight per sq ft: 1.60 lbs
Quantity: 1

Calculation:
Area = 4 × 50 = 200 sq ft
Per-item weight = 200 × 1.60 = 320 lbs
Total weight = 320 × 1 = 320 lbs

Result: Per-item (320 lbs) >= 150 lbs
→ Show only WWEX
```

---

### Fixed Weight Products

**Properties in cart:**
- `fixed_weight` - Weight per item in pounds (e.g., "32.30")

**Calculation:**
```
Per-item Weight = fixed_weight
Total Weight = fixed_weight × Quantity
```

**Example 1: Light Item (Per-item < 150 lbs)**
```
Fixed weight: 32.30 lbs
Quantity: 4

Calculation:
Per-item weight = 32.30 lbs
Total weight = 32.30 × 4 = 129.2 lbs

Result: Per-item (32.30 lbs) < 150 lbs
→ Show both FedEx + WWEX
```

**Example 2: Many Light Items**
```
Fixed weight: 32.30 lbs
Quantity: 10

Calculation:
Per-item weight = 32.30 lbs
Total weight = 32.30 × 10 = 323 lbs

Result: Per-item (32.30 lbs) < 150 lbs
→ Show both FedEx + WWEX
```

---

## Shipping Options in Checkout

### Scenario 1: Per-item weight < 150 lbs

**Customer sees TWO options:**

```
○ FedEx Freight (10 packages)
  $487.50
  Estimated 5 business days - Split into 10 shipments
  
○ WWEX Freight Shipping (Single Shipment)
  $645.00
  Estimated 7 business days
```

**FedEx Option:**
- Splits order into individual packages
- Each package under 150 lbs
- Faster transit (typically 5 days)
- May be more expensive due to multiple packages

**WWEX Option:**
- Single combined shipment
- Freight LTL shipping
- Slower transit (typically 7 days)
- Often more economical for total weight

---

### Scenario 2: Per-item weight ≥ 150 lbs

**Customer sees ONE option:**

```
○ WWEX Freight Shipping (Single Shipment)
  $425.00
  Estimated 7 business days
```

**Why only WWEX?**
- Items over 150 lbs require freight shipping
- FedEx standard cannot handle 150+ lbs packages
- WWEX specializes in heavy freight

---

## API Integration Flow

```
CHECKOUT REQUEST
       ↓
Extract cart items
       ↓
FOR EACH ITEM:
  ├─ Roll product?
  │  ├─ Calculate: Width × Length × weight_per_sqft
  │  └─ Store per-item weight
  │
  └─ Fixed product?
     ├─ Use fixed_weight value
     └─ Store per-item weight
       ↓
CHECK per-item weight:
  ├─ < 150 lbs?
  │  ├─ Call FedEx API (split shipment)
  │  └─ Call WWEX API (combined shipment)
  │  └─ Return BOTH rates
  │
  └─ >= 150 lbs?
     └─ Call WWEX API only
     └─ Return WWEX rate
       ↓
DISPLAY OPTIONS IN CHECKOUT
```

---

## Code Implementation

### Carrier Service Endpoint

```typescript
// Calculate per-item weight
for (const item of items) {
  const customWidth = parseFloat(item.properties?.Width || 0);
  const customLength = parseFloat(item.properties?.Length || 0);
  const weightPerSqFt = parseFloat(item.properties?.weight_per_sqft || 1.60);
  const fixedWeight = parseFloat(item.properties?.fixed_weight || 0);
  
  let perItemWeight = 0;
  
  // Roll product
  if (customWidth > 0 && customLength > 0) {
    const area = customWidth * customLength;
    perItemWeight = area * weightPerSqFt;
  }
  // Fixed weight product
  else if (fixedWeight > 0) {
    perItemWeight = fixedWeight;
  }
  
  // Determine shipping methods
  if (perItemWeight < 150) {
    requiresFedEx = true;
    requiresWWEX = true;
  } else {
    requiresWWEX = true;
  }
}

// Call appropriate APIs
if (requiresFedEx) {
  fedexRate = await fedexClient.getSplitShipmentRate(...);
  rates.push(fedexRate);
}

if (requiresWWEX) {
  wwexRate = await wwexClient.getFreightRate(...);
  rates.push(wwexRate);
}

return { rates };
```

---

## Product Setup in Shopify

### Roll Products

**Product page must pass these properties:**

```liquid
<!-- Width input -->
<input type="number" 
       name="properties[Width]" 
       step="0.1" 
       placeholder="Width in feet"
       required>

<!-- Length input -->
<input type="number" 
       name="properties[Length]" 
       step="0.1" 
       placeholder="Length in feet"
       required>

<!-- Hidden: Weight per square foot -->
<input type="hidden" 
       name="properties[weight_per_sqft]" 
       value="1.60">
```

### Fixed Weight Products

**Product page must pass this property:**

```liquid
<!-- Hidden: Fixed weight -->
<input type="hidden" 
       name="properties[fixed_weight]" 
       value="32.30">
```

---

## Configuration

### Environment Variables

```env
# FedEx API
FEDEX_API_URL=https://apis.fedex.com/ship/v1
FEDEX_API_KEY=your_fedex_api_key
FEDEX_ACCOUNT_NUMBER=your_fedex_account_number

# WWEX API
WWEX_API_URL=https://api.wwex.com/v1
WWEX_API_KEY=your_wwex_api_key
WWEX_ACCOUNT_NUMBER=your_wwex_account_number
```

### Weight Threshold

Default: 150 lbs

To change, modify in `app/api/carrier-service/route.ts`:
```typescript
const MAX_PACKAGE_WEIGHT = 150; // Change this value
```

---

## Testing

### Test Script

```bash
node test-carrier-service.js
```

**Expected output:**
```
Roll Product: 4ft × 10ft = 40 sq ft
Weight: 40 sq ft × 1.60 lbs/sqft = 64 lbs per item
Total: 64 lbs × 10 qty = 640 lbs
Per-item weight (64.00 lbs) < 150 lbs → Show both FedEx + WWEX

Roll Product: 4ft × 50ft = 200 sq ft
Weight: 200 sq ft × 1.60 lbs/sqft = 320 lbs per item
Total: 320 lbs × 1 qty = 320 lbs
Per-item weight (320.00 lbs) ≥ 150 lbs → Show only WWEX

Fixed Product: 32.3 lbs × 4 qty = 129.2 lbs
Per-item weight (32.30 lbs) < 150 lbs → Show both FedEx + WWEX

✓ SUCCESS: Received 3 shipping rates!
  - FedEx Freight (10 packages): $487.50
  - WWEX Freight (Single): $645.00
  - WWEX Freight (Single): $425.00
```

### Database Verification

```sql
SELECT 
  request_id,
  JSON_EXTRACT(items, '$[0].productType') as type,
  JSON_EXTRACT(items, '$[0].calculatedWeight') as weight,
  JSON_EXTRACT(items, '$[0].shippingMethod') as method,
  total_weight
FROM rate_requests
ORDER BY created_at DESC
LIMIT 5;
```

---

## Troubleshooting

### Issue: Only WWEX showing for light items

**Check:**
1. Is `per-item weight` actually < 150 lbs?
2. Server logs: Look for "Per-item weight (X lbs) < 150 lbs"
3. FedEx API credentials configured?

### Issue: FedEx rate not appearing

**Check:**
1. FedEx API response in logs
2. FedEx credentials in .env
3. `requiresFedEx` flag in logs
4. Database: Check error_logs table

### Issue: Wrong weight calculation

**Check:**
1. Properties being passed correctly?
2. `weight_per_sqft` or `fixed_weight` in properties?
3. Server logs for calculation details
4. Database: View items JSON in rate_requests

---

## Performance

**Response time targets:**
- FedEx API: < 3 seconds
- WWEX API: < 3 seconds
- Total (both): < 6 seconds

**Optimization:**
- Parallel API calls (FedEx + WWEX)
- Rate caching for WWEX
- Fallback rates if timeout

---

## Decision Matrix

| Per-Item Weight | Total Weight | Quantity | FedEx | WWEX | Why |
|----------------|--------------|----------|-------|------|-----|
| 64 lbs | 64 lbs | 1 | ✅ | ✅ | Light enough for both |
| 64 lbs | 640 lbs | 10 | ✅ | ✅ | Split into 10 packages |
| 320 lbs | 320 lbs | 1 | ❌ | ✅ | Too heavy for FedEx |
| 32 lbs | 129 lbs | 4 | ✅ | ✅ | Each item < 150 lbs |
| 200 lbs | 2000 lbs | 10 | ❌ | ✅ | Freight only |

---

## Summary

✅ **Roll products**: Automatic area-based weight calculation  
✅ **Fixed products**: Simple weight × quantity  
✅ **Smart logic**: Shows appropriate shipping options  
✅ **Customer choice**: FedEx (fast/split) vs WWEX (economical/combined)  
✅ **Production ready**: Error handling, logging, caching included  

Your customers get the best shipping options based on their actual order weight!
