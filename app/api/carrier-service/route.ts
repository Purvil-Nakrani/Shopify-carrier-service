import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import WWEXClient from "@/lib/wwex-client";
import FedExClient from "@/lib/fedex-client";
import {
  logRateRequest,
  logWWEXResponse,
  getCachedRate,
  cacheRate,
  logError,
} from "@/lib/database";

// Tell Next.js this is a dynamic route that should not be statically analyzed
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Verify Shopify webhook signature
function verifyShopifyWebhook(rawBody: string, hmacHeader: string): boolean {
  const secret = process.env.SHOPIFY_API_SECRET || "";
  const hash = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");

  return hash === hmacHeader;
}

// Generate cache key for rate caching
function generateCacheKey(
  origin: string,
  destination: string,
  weight: number
): string {
  const weightBucket = Math.ceil(weight / 100) * 100; // Round to nearest 100 lbs
  return `${origin}-${destination}-${weightBucket}`;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const hmacHeader = request.headers.get("X-Shopify-Hmac-Sha256") || "";

    // Verify webhook authenticity
    if (!verifyShopifyWebhook(rawBody, hmacHeader)) {
      console.error("🔴 Invalid Shopify webhook signature");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const requestId = `REQ-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    console.log("🟢 Received carrier service request:", requestId);

    // Extract rate request data
    const { rate } = body;

    if (!rate) {
      return NextResponse.json({
        rates: [],
      });
    }

    const origin = rate.origin?.postal_code || "";
    const destination = rate.destination || {};
    const items = rate.items || [];

    // Calculate total weight and determine shipping method
    let totalWeight = 0;
    const freightItems: any[] = [];
    let requiresFedEx = false;
    let requiresWWEX = false;

    for (const item of items) {
      // Get weight per square foot or fixed weight from product
      const weightPerSqFt = parseFloat(
        item.properties?.weight_per_sqft ||
          item.properties?.WeightPerSqFt ||
          1.6
      ); // Default 1.60 lbs/sqft for rolls
      const fixedWeight = parseFloat(
        item.properties?.fixed_weight || item.properties?.FixedWeight || 0
      ); // For non-roll products

      // Extract custom dimensions from cart item properties (for roll products)
      const customWidth = parseFloat(
        item.properties?.Width || item.properties?.width || 0
      );
      const customLength = parseFloat(
        item.properties?.Length || item.properties?.length || 0
      );
      const itemQuantity = parseInt(item.quantity);

      let perItemWeight = 0;
      let totalItemWeight = 0;
      let calculatedArea = 0;
      let productType = "fixed"; // 'roll' or 'fixed'

      // LOGIC 1: Roll products with custom dimensions
      if (customWidth > 0 && customLength > 0) {
        productType = "roll";
        // Calculate area per item: width × length
        calculatedArea = customWidth * customLength;
        // Weight per item: area × weight per sq ft
        perItemWeight = calculatedArea * weightPerSqFt;
        // Total weight: per item weight × quantity
        totalItemWeight = perItemWeight * itemQuantity;

        console.log(
          `🟢 Roll Product: ${customWidth}ft × ${customLength}ft = ${calculatedArea} sq ft`
        );
        console.log(
          `🟢 Weight: ${calculatedArea} sq ft × ${weightPerSqFt} lbs/sqft = ${perItemWeight} lbs per item`
        );
        console.log(
          `🟢 Total: ${perItemWeight} lbs × ${itemQuantity} qty = ${totalItemWeight} lbs`
        );
      }
      // LOGIC 2: Fixed weight products
      else if (fixedWeight > 0) {
        productType = "fixed";
        perItemWeight = fixedWeight;
        totalItemWeight = fixedWeight * itemQuantity;

        console.log(
          `🟢 Fixed Product: ${fixedWeight} lbs × ${itemQuantity} qty = ${totalItemWeight} lbs`
        );
      }
      // LOGIC 3: Fallback to Shopify weight
      else {
        productType = "fixed";
        perItemWeight = parseFloat(item.grams) / 453.592; // Convert grams to pounds
        totalItemWeight = perItemWeight * itemQuantity;

        console.log(
          `🟢 Standard Product: ${perItemWeight} lbs × ${itemQuantity} qty = ${totalItemWeight} lbs`
        );
      }

      totalWeight += totalItemWeight;

      // Determine which shipping methods to call based on per-item weight
      if (perItemWeight < 150) {
        requiresFedEx = true;
        requiresWWEX = true;
        console.log(
          `🟢 Per-item weight (${perItemWeight.toFixed(
            2
          )} lbs) < 150 lbs → Show both FedEx + WWEX`
        );
      } else {
        requiresWWEX = true;
        console.log(
          `🟢 Per-item weight (${perItemWeight.toFixed(
            2
          )} lbs) ≥ 150 lbs → Show only WWEX`
        );
      }

      // Get dimensions for freight calculation
      const itemLength =
        customLength > 0
          ? customLength * 12
          : parseFloat(item.properties?.dimension_length || 48);
      const itemWidth =
        customWidth > 0
          ? customWidth * 12
          : parseFloat(item.properties?.dimension_width || 40);
      const itemHeight = parseFloat(
        item.properties?.dimension_height || item.properties?.height || 48
      );

      freightItems.push({
        weight: perItemWeight,
        totalWeight: totalItemWeight,
        length: itemLength,
        width: itemWidth,
        height: itemHeight,
        quantity: itemQuantity,
        calculatedArea: calculatedArea,
        perItemWeight: perItemWeight,
        productType: productType,
        customDimensions: {
          width: customWidth,
          length: customLength,
          weightPerSqFt: weightPerSqFt,
          fixedWeight: fixedWeight,
        },
      });
    }

    // Log request to database
    await logRateRequest({
      requestId,
      origin,
      destination,
      weight: totalWeight,
      price: parseFloat(rate.subtotal_price || 0),
      items: items.map((item: any, index: any) => ({
        ...item,
        calculatedWeight: freightItems[index]?.perItemWeight,
        productType: freightItems[index]?.productType,
        shippingMethod:
          freightItems[index]?.perItemWeight < 150
            ? "FedEx + WWEX"
            : "WWEX only",
      })),
    });

    console.log(`🟢 Total cart weight: ${totalWeight.toFixed(2)} lbs`);
    console.log(`🟢 Requires FedEx: ${requiresFedEx}`);
    console.log(`🟢 Requires WWEX: ${requiresWWEX}`);

    const rates = [];

    // Call FedEx API if required (for items with per-item weight < 150 lbs)
    if (requiresFedEx) {
      try {
        console.log("🟢 Calling FedEx API for split shipment...");
        const fedexClient = new FedExClient();
        const fedexStartTime = Date.now();

        const fedexResponse = await fedexClient.getSplitShipmentRate({
          origin: {
            postal_code: origin,
            country: rate.origin?.country || "US",
            province: rate.origin?.province || "",
            city: rate.origin?.city || "",
            address1: rate.origin?.address1 || "Warehouse",
            phone: rate.origin?.phone || "0000000000",
            company_name: rate.origin?.company_name || "",
          },
          destination: {
            postal_code: destination.postal_code || "",
            city: destination.city || "",
            province: destination.province || "",
            country: destination.country || "US",
            address1: destination.address1 || "Customer Address",
            phone: destination.phone || "",
            company_name: destination.company_name || "",
          },
          items: rate.items || [],
          currency: rate.currency || "USD",
          totalWeight,
        });

        const fedexResponseTime = Date.now() - fedexStartTime;
        console.log(`🟢 FedEx API response time: ${fedexResponseTime}ms`);

        // Log FedEx response
        await logWWEXResponse({
          requestId,
          quoteId: fedexResponse.quoteId,
          rate: fedexResponse.rate,
          transitDays: fedexResponse.transitDays,
          serviceLevel: `FedEx ${fedexResponse.serviceLevel}`,
          responseTimeMs: fedexResponseTime,
          rawResponse: fedexResponse,
        });

        // Add FedEx rate to response
        // Rates array is empty → no shipping methods shown
        // JSON is malformed → no shipping methods shown
        // Price is string but not numeric → rejected by Shopify
        rates.push({
          service_name: `FedEx Freight (${fedexResponse.packages} packages)`,
          service_code: "FEDEX_FREIGHT_SPLIT",
          total_price: (fedexResponse.rate * 100).toString(),
          currency: fedexResponse.currency,
          description: `Estimated ${fedexResponse.transitDays} business days - Split into ${fedexResponse.packages} shipments`,
          min_delivery_date: getDeliveryDate(
            fedexResponse.transitDays
          ).toISOString(),
          max_delivery_date: getDeliveryDate(
            fedexResponse.transitDays + 2
          ).toISOString(),
        });
        
      } catch (error: any) {
        console.error("🔴 FedEx API Error:", error.message);
        // Continue to WWEX even if FedEx fails
      }
    }

    // Call WWEX API if required
    if (requiresWWEX) {
      // Check cache first
      const cacheKey = generateCacheKey(
        origin,
        destination.postal_code,
        totalWeight
      );
      const cachedRate = await getCachedRate(cacheKey);

      if (cachedRate) {
        console.log("🟢 Using cached WWEX rate");
        rates.push({
          service_name: "WWEX Freight Shipping",
          service_code: "WWEX_FREIGHT",
          total_price: (cachedRate.shipping_rate * 100).toString(),
          currency: "USD",
          description: `Estimated ${cachedRate.transit_days} business days (Cached)`,
          min_delivery_date: getDeliveryDate(
            cachedRate.transit_days
          ).toISOString(),
          max_delivery_date: getDeliveryDate(
            cachedRate.transit_days + 2
          ).toISOString(),
        });
      } else {
        // Call WWEX API for real-time rate
        const wwexClient = new WWEXClient();
        const wwexStartTime = Date.now();

        const wwexResponse = await wwexClient.getFreightRate({
          origin: {
            postalCode: origin,
            country: rate.origin?.country || "US",
          },
          destination: {
            postalCode: destination.postal_code || "",
            city: destination.city || "",
            province: destination.province || "",
            country: destination.country || "US",
          },
          items: freightItems,
        });

        const wwexResponseTime = Date.now() - wwexStartTime;

        // Log WWEX response
        await logWWEXResponse({
          requestId,
          quoteId: wwexResponse.quoteId,
          rate: wwexResponse.rate,
          transitDays: wwexResponse.transitDays,
          serviceLevel: wwexResponse.serviceLevel,
          responseTimeMs: wwexResponseTime,
          rawResponse: wwexResponse,
        });

        // Cache the rate
        await cacheRate({
          cacheKey,
          origin,
          destination: destination.postal_code,
          weightMin: Math.floor(totalWeight / 100) * 100,
          weightMax: Math.ceil(totalWeight / 100) * 100,
          rate: wwexResponse.rate,
          transitDays: wwexResponse.transitDays,
          expiresInMinutes: 60,
        });

        // Add WWEX rate to response
        rates.push({
          service_name: "WWEX Freight Shipping (Single Shipment)",
          service_code: "WWEX_FREIGHT",
          total_price: (wwexResponse.rate * 100).toString(),
          currency: wwexResponse.currency,
          description: `Estimated ${wwexResponse.transitDays} business days`,
          min_delivery_date: getDeliveryDate(
            wwexResponse.transitDays
          ).toISOString(),
          max_delivery_date: getDeliveryDate(
            wwexResponse.transitDays + 2
          ).toISOString(),
        });
      }
    }

    const totalProcessingTime = Date.now() - startTime;
    console.log(`🟢 Total processing time: ${totalProcessingTime}ms`);

    // Return shipping rates to Shopify
    return NextResponse.json({ rates });
  } catch (error: any) {
    console.error("🔴 Carrier Service Error:", error);

    // Log error to database
    await logError("CARRIER_SERVICE_ERROR", error.message, error.stack, {
      requestBody: await request.text(),
    });

    // Return empty rates array on error (Shopify will use other shipping methods)
    return NextResponse.json({
      rates: [],
    });
  }
}

// Calculate delivery date based on transit days
function getDeliveryDate(transitDays: number): Date {
  const date = new Date();
  let daysAdded = 0;

  while (daysAdded < transitDays) {
    date.setDate(date.getDate() + 1);
    // Skip weekends
    if (date.getDay() !== 0 && date.getDay() !== 6) {
      daysAdded++;
    }
  }

  return date;
}

// Handle GET requests (health check)
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "Shopify Freight Carrier Service",
    version: "1.0.0",
  });
}
