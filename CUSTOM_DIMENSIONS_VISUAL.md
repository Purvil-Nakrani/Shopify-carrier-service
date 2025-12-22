# Custom Dimensions Flow - Visual Guide

## 📊 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  SHOPIFY PRODUCT PAGE (Your Existing UI)                    │
│                                                              │
│  Step 2: Select Length of Roll                              │
│  ┌──────────────────────┐                                   │
│  │ Width (ft):    [4  ] │  ← Customer enters                │
│  │ Length (ft):   [25 ] │  ← Customer enters                │
│  │ Quantity:      [2  ] │  ← Customer enters                │
│  └──────────────────────┘                                   │
│           ↓                                                  │
│  [Add to Cart] button                                       │
└─────────────────────────────────────────────────────────────┘
                    ↓
                    ↓ (Line item properties sent to cart)
                    ↓
┌─────────────────────────────────────────────────────────────┐
│  SHOPIFY CART                                                │
│                                                              │
│  Line Item:                                                  │
│  {                                                           │
│    "product": "Custom Roll",                                 │
│    "quantity": 1,                                            │
│    "properties": {                                           │
│      "Width": "4",      ← Stored here                        │
│      "Length": "25",    ← Stored here                        │
│      "Quantity": "2"    ← Stored here                        │
│    }                                                         │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
                    ↓
                    ↓ (Customer proceeds to checkout)
                    ↓
┌─────────────────────────────────────────────────────────────┐
│  SHOPIFY CHECKOUT                                            │
│                                                              │
│  Calculating shipping...                                    │
│           ↓                                                  │
│  [Calls Carrier Service API]                                │
└─────────────────────────────────────────────────────────────┘
                    ↓
                    ↓ (POST request with cart data)
                    ↓
┌─────────────────────────────────────────────────────────────┐
│  YOUR CARRIER SERVICE APP                                    │
│  (app/api/carrier-service/route.ts)                         │
│                                                              │
│  1. Receive request from Shopify                            │
│  2. Extract properties:                                     │
│     width = 4 ft                                            │
│     length = 25 ft                                          │
│     quantity = 2                                            │
│                                                              │
│  3. Calculate:                                              │
│     calculatedQty = 4 × 25 × 2 = 200 sq ft                  │
│                                                              │
│  4. Prepare WWEX request with qty = 200                     │
└─────────────────────────────────────────────────────────────┘
                    ↓
                    ↓ (API call with calculated quantity)
                    ↓
┌─────────────────────────────────────────────────────────────┐
│  WWEX API                                                    │
│                                                              │
│  Receives:                                                   │
│  {                                                           │
│    "items": [{                                               │
│      "weight": 200,                                          │
│      "dimensions": {...},                                    │
│      "quantity": 200  ← Calculated value sent here          │
│    }]                                                        │
│  }                                                           │
│                                                              │
│  Returns: Freight rate for 200 sq ft                        │
└─────────────────────────────────────────────────────────────┘
                    ↓
                    ↓ (Rate returned)
                    ↓
┌─────────────────────────────────────────────────────────────┐
│  SHOPIFY CHECKOUT                                            │
│                                                              │
│  Shipping Options:                                           │
│  ○ Standard Shipping - $15.00                               │
│  ● WWEX Freight - $247.50  ← Rate for 200 sq ft             │
│                                                              │
│  [Continue to Payment]                                      │
└─────────────────────────────────────────────────────────────┘
```

## 🔍 Detailed Example

### Scenario: Customer Orders Custom Rolls

**Product Page Input:**
```
Width: 4 feet
Length: 25 feet
Quantity: 2 rolls
```

**What Happens:**

1. **Product Page → Cart**
   ```json
   {
     "id": 123456789,
     "quantity": 1,
     "properties": {
       "Width": "4",
       "Length": "25",
       "Quantity": "2"
     }
   }
   ```

2. **Cart → Checkout → Carrier Service**
   ```javascript
   // Shopify sends this to your app:
   {
     "rate": {
       "items": [{
         "properties": {
           "Width": "4",
           "Length": "25", 
           "Quantity": "2"
         }
       }]
     }
   }
   ```

3. **Your App Processes:**
   ```javascript
   // Extract from properties
   const customWidth = 4;      // from properties.Width
   const customLength = 25;    // from properties.Length
   const customQuantity = 2;   // from properties.Quantity
   
   // Calculate
   const calculatedQty = 4 × 25 × 2 = 200;
   
   console.log('Calculated: 200 sq ft');
   ```

4. **Sent to WWEX:**
   ```json
   {
     "items": [{
       "weight": 200,
       "dimensions": {
         "length": 300,  // 25 ft × 12 in
         "width": 48,    // 4 ft × 12 in
         "height": 48
       },
       "quantity": 200,  // ← The calculated value!
       "freightClass": "70"
     }]
   }
   ```

5. **WWEX Returns Rate:**
   ```json
   {
     "rate": 247.50,
     "transitDays": 5
   }
   ```

6. **Displayed in Checkout:**
   ```
   WWEX Freight Shipping: $247.50
   (Estimated 5 business days)
   ```

## 📝 Real-World Examples

### Example 1: Small Order
```
Input:
  Width: 2 ft
  Length: 10 ft
  Quantity: 1 roll

Calculation:
  2 × 10 × 1 = 20 sq ft

Sent to WWEX:
  quantity: 20
```

### Example 2: Large Order
```
Input:
  Width: 6 ft
  Length: 50 ft
  Quantity: 5 rolls

Calculation:
  6 × 50 × 5 = 1,500 sq ft

Sent to WWEX:
  quantity: 1500
```

### Example 3: Decimal Dimensions
```
Input:
  Width: 3.5 ft
  Length: 22.5 ft
  Quantity: 3 rolls

Calculation:
  3.5 × 22.5 × 3 = 236.25 sq ft

Sent to WWEX:
  quantity: 236.25
```

## 🧪 Testing Checklist

- [ ] Customer enters Width: 4
- [ ] Customer enters Length: 25
- [ ] Customer enters Quantity: 2
- [ ] Add to cart
- [ ] Check cart.json for properties
- [ ] Proceed to checkout
- [ ] See "Calculating shipping..."
- [ ] Freight rate appears
- [ ] Check server logs for "Custom calculation: 4 ft × 25 ft × 2 = 200 sq ft"
- [ ] Verify WWEX received quantity: 200

## 🐛 Debugging Tips

### Check 1: Are properties being sent?
```javascript
// In browser console on cart page:
fetch('/cart.js')
  .then(r => r.json())
  .then(cart => console.log(cart.items[0].properties));

// Should see:
// { Width: "4", Length: "25", Quantity: "2" }
```

### Check 2: Is calculation happening?
```bash
# Check server logs:
docker-compose logs -f app | grep "Custom calculation"

# Should see:
# Custom calculation: 4 ft × 25 ft × 2 = 200 sq ft
```

### Check 3: What's sent to WWEX?
```bash
# Check database:
mysql -u root -p freight_shipping

SELECT 
  request_id,
  JSON_EXTRACT(items, '$[0].properties.Width') as width,
  JSON_EXTRACT(items, '$[0].properties.Length') as length,
  JSON_EXTRACT(items, '$[0].properties.Quantity') as qty,
  total_weight
FROM rate_requests 
ORDER BY created_at DESC 
LIMIT 5;
```

## ⚙️ Configuration

### Property Names
The app looks for these property names (case-insensitive):
- `Width` or `width`
- `Length` or `length`
- `Quantity` or `quantity`

### Units
- Width/Length: **Feet** (converted to inches for WWEX)
- Quantity: **Number of rolls**
- Result: **Square feet**

### Fallback
If custom dimensions are NOT found:
- Uses standard Shopify quantity
- Uses default dimensions (48" × 40" × 48")

## 🎯 Your Implementation

Since you already have the UI working, you just need to ensure your product page code uses the exact property names:

```liquid
<!-- Your existing product page form -->
<input type="number" 
       name="properties[Width]" 
       step="0.1" 
       required>

<input type="number" 
       name="properties[Length]" 
       step="0.1" 
       required>

<input type="number" 
       name="properties[Quantity]" 
       value="1" 
       required>
```

That's it! The carrier service will automatically:
1. ✅ Detect these properties
2. ✅ Calculate Width × Length × Quantity
3. ✅ Send calculated value to WWEX
4. ✅ Return accurate freight rate

No additional changes needed to your existing product page UI!
