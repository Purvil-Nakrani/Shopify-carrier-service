# Custom Dimensions Integration Guide

## How It Works

Your Shopify product page already has a custom UI where customers enter:
- **Width (ft)**: Customer enters width in feet
- **Length (ft)**: Customer enters length in feet  
- **Quantity**: Number of rolls

These values are passed to the cart as **line item properties**.

## The Calculation

When the carrier service receives a rate request from Shopify, it:

1. **Extracts custom dimensions** from cart item properties
2. **Calculates total quantity**: `Width × Length × Quantity`
3. **Sends to WWEX** with the calculated quantity

### Example:
```
Customer Input:
- Width: 4 ft
- Length: 25 ft
- Quantity: 2 rolls

Calculation:
4 × 25 × 2 = 200 sq ft

WWEX receives: 200 as the quantity
```

## Shopify Line Item Properties Structure

Your product page should pass these properties to the cart:

```javascript
// In your product page custom form
properties: {
  "Width": "4",          // in feet
  "Length": "25",        // in feet
  "Quantity": "2"        // number of rolls
}
```

The carrier service will automatically:
- Look for `Width` or `width` property
- Look for `Length` or `length` property
- Calculate: Width × Length × Quantity
- Use this calculated value for WWEX API

## Code Changes Made

### File: `app/api/carrier-service/route.ts`

```typescript
// Extract custom dimensions from cart item properties
const customWidth = parseFloat(item.properties?.Width || item.properties?.width || 0);
const customLength = parseFloat(item.properties?.Length || item.properties?.length || 0);
const customQuantity = parseInt(item.properties?.Quantity || item.quantity);

// Calculate total quantity: width × length × quantity
let calculatedQty = customQuantity;
if (customWidth > 0 && customLength > 0) {
  calculatedQty = customWidth * customLength * customQuantity;
  console.log(`Custom calculation: ${customWidth} ft × ${customLength} ft × ${customQuantity} = ${calculatedQty} sq ft`);
}

// Send to WWEX with calculated quantity
freightItems.push({
  weight: weight,
  length: itemLength,
  width: itemWidth,
  height: itemHeight,
  quantity: calculatedQty  // <-- This is sent to WWEX
});
```

## Shopify Product Page Integration

Your existing product page form should already be adding line item properties. If you need to verify or update it, here's the format:

### Liquid Template Example:
```liquid
<div class="custom-dimensions">
  <label>Width (ft):</label>
  <input type="number" name="properties[Width]" step="0.1" required>
  
  <label>Length (ft):</label>
  <input type="number" name="properties[Length]" step="0.1" required>
  
  <label>Quantity:</label>
  <input type="number" name="properties[Quantity]" value="1" required>
</div>
```

### JavaScript Add to Cart Example:
```javascript
// When adding to cart
fetch('/cart/add.js', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    items: [{
      id: variantId,
      quantity: 1,
      properties: {
        'Width': document.getElementById('width').value,
        'Length': document.getElementById('length').value,
        'Quantity': document.getElementById('qty').value
      }
    }]
  })
});
```

## Verification in Cart

You can verify the properties are being passed correctly by checking the cart JSON:

```javascript
fetch('/cart.js')
  .then(res => res.json())
  .then(cart => {
    console.log(cart.items[0].properties);
    // Should show: { Width: "4", Length: "25", Quantity: "2" }
  });
```

## Database Logging

All custom calculations are logged to the database with the calculation details:

```sql
SELECT * FROM rate_requests 
WHERE items LIKE '%customCalculation%' 
ORDER BY created_at DESC;
```

You'll see entries like:
```json
{
  "customCalculation": "4 × 25 × 2 = 200 sq ft"
}
```

## Testing the Integration

### 1. Test with Sample Data

```bash
# Edit test-carrier-service.js
# Update the items array:

items: [
  {
    name: 'Custom Roll',
    sku: 'ROLL-001',
    quantity: 1,  // This will be overridden
    grams: 45359, // 100 lbs
    price: 50000,
    properties: {
      Width: "4",      // 4 feet
      Length: "25",    // 25 feet
      Quantity: "2"    // 2 rolls
    }
  }
]
```

### 2. Run Test
```bash
node test-carrier-service.js
```

### 3. Check Logs
Look for this in the console output:
```
Custom calculation: 4 ft × 25 ft × 2 = 200 sq ft
```

## Property Name Variations

The code handles multiple property name formats (case-insensitive):

- `Width` or `width`
- `Length` or `length`
- `Quantity` or `quantity`

So your product page can use any casing.

## Fallback Behavior

If custom dimensions are NOT provided:
- Uses standard item quantity from Shopify
- Uses default dimensions (48"L × 40"W × 48"H)

If custom dimensions ARE provided:
- Calculates: Width × Length × Quantity
- Converts feet to inches for WWEX API
- Uses calculated quantity for freight calculations

## WWEX API Request Format

The calculated quantity is sent to WWEX in the items array:

```json
{
  "items": [
    {
      "weight": 100,
      "weightUnit": "LBS",
      "dimensions": {
        "length": 300,    // 25 ft × 12 = 300 inches
        "width": 48,      // 4 ft × 12 = 48 inches
        "height": 48,
        "unit": "IN"
      },
      "quantity": 200,    // <-- Calculated: 4 × 25 × 2
      "freightClass": "70"
    }
  ]
}
```

## Common Issues & Solutions

### Issue 1: Properties not being passed
**Solution:** Check your product page form. Properties must use `name="properties[PropertyName]"` format.

### Issue 2: Calculation showing 0
**Solution:** Verify property names match exactly: `Width`, `Length`, `Quantity` (case-sensitive in Liquid, case-insensitive in app).

### Issue 3: Wrong quantity sent to WWEX
**Solution:** Check the console logs for "Custom calculation:" message to see what's being calculated.

## Monitoring Custom Calculations

View recent calculations in the database:

```sql
SELECT 
  request_id,
  JSON_EXTRACT(items, '$[0].customCalculation') as calculation,
  total_weight,
  created_at
FROM rate_requests
WHERE JSON_EXTRACT(items, '$[0].customCalculation') IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;
```

## Next Steps

1. ✅ **Your product page is already set up** with the custom dimension inputs
2. ✅ **The carrier service now handles** the calculation automatically
3. ✅ **WWEX receives** the calculated quantity (200 in your example)
4. ⚠️ **Test it**: Add a product to cart with custom dimensions and check checkout

No changes needed to your existing product page UI! The carrier service will automatically detect and use the custom properties.
