import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import axios from "axios";
import {
  logRateRequest,
  logWWEXResponse,
  getCachedRate,
  cacheRate,
  logError,
} from "@/lib/database";

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
  return `speedship-${origin}-${destination}-${weightBucket}`;
}

// Calculate freight class based on weight and volume (density)
function calculateFreightClass(weight: number, volume: number): string {
  if (volume === 0) return "70"; // Default class

  const density = weight / volume; // pounds per cubic foot

  if (density >= 30) return "50";
  if (density >= 22.5) return "55";
  if (density >= 15) return "60";
  if (density >= 13.5) return "65";
  if (density >= 12) return "70";
  if (density >= 10.5) return "77.5";
  if (density >= 9) return "85";
  if (density >= 8) return "92.5";
  if (density >= 7) return "100";
  if (density >= 6) return "110";
  if (density >= 5) return "125";
  if (density >= 4) return "150";
  if (density >= 3) return "175";
  if (density >= 2) return "200";
  if (density >= 1) return "250";
  return "300";
}

// Calculate volume in cubic feet
function calculateVolume(item: {
  length: number;
  width: number;
  height: number;
}): number {
  // Convert inches to feet and calculate volume
  const volumeCubicInches = item.length * item.width * item.height;
  return volumeCubicInches / 1728; // Convert to cubic feet
}

export async function POST(request: NextRequest) {
  console.log(
    "🟢 🏃‍➡️🏃‍➡️🏃‍➡️🏃‍➡️🏃‍➡️ api/speedship-estimate excecuted=========="
  );
  const startTime = Date.now();

  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    console.log("🟢 rawBody===================", rawBody);
    const hmacHeader = request.headers.get("X-Shopify-Hmac-Sha256") || "";
    console.log("🟢 hmacHeader===================", hmacHeader);
    // Verify webhook authenticity
    if (!verifyShopifyWebhook(rawBody, hmacHeader)) {
      console.error("🔴 Invalid Shopify webhook signature");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    // console.log("body===================",body)
    console.log("🟢 body.rate.items===================", body.rate.items);
    const requestId = `SPEEDSHIP-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    console.log("🟢 Received speedship estimate request==========", requestId);

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

    // Calculate total weight and prepare freight items
    let totalWeight = 0;
    const freightItems: any[] = [];

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
        shippingMethod: "Speedship API",
      })),
    });

    console.log(`🟢 Total cart weight: ${totalWeight.toFixed(2)} lbs`);

    const rates = [];

    // Validate that both origin and destination are in the US
    // Speedship API only supports US domestic freight shipping
    const originCountry = rate.origin?.country || "US";
    const destinationCountry = destination.country || "US";

    if (originCountry !== "US" || destinationCountry !== "US") {
      console.warn(
        `🔴 ⚠️ Speedship API only supports US domestic shipping. Origin: ${originCountry}, Destination: ${destinationCountry}`
      );
      console.log("🔴 Skipping Speedship API call for non-US addresses");
      
      // Return empty rates for non-US addresses
      const totalProcessingTime = Date.now() - startTime;
      console.log(`🟢 Total processing time============= ${totalProcessingTime}ms`);
      return NextResponse.json({ 
        rates: [] 
      });
    }

    // Check cache first
    const cacheKey = generateCacheKey(
      origin,
      destination.postal_code,
      totalWeight
    );
    const cachedRate = await getCachedRate(cacheKey);

    if (cachedRate) {
      console.log("🟢 Using cached Speedship rate");
      rates.push({
        service_name: "Speedship Freight Shipping",
        service_code: "SPEEDSHIP_FREIGHT",
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
      // Call Speedship API for real-time rate
      const speedshipStartTime = Date.now();

      try {
        // Prepare Speedship API request
        const speedshipRequest = {
          accountNumber: "12345678",
          shipmentType: "LTL",
          origin: {
            postalCode: origin,
            country: rate.origin?.country || "US",
          },
          destination: {
            postalCode: destination.postal_code || "",
            city: destination.city || "",
            state: destination.province || "",
            country: destination.country || "US",
          },
          items: freightItems.map((item: any) => {
            // Ensure minimum weight of 1 lb to prevent Speedship API errors
            const itemWeight = Math.max(item.weight, 1);
            
            // Log when using default weight
            if (item.weight === 0) {
              console.warn(`🔴 ⚠️ Product has no weight configured, using default minimum: ${itemWeight} lb`);
            }
            
            return {
              weight: itemWeight,
              weightUnit: "LBS",
              dimensions: {
                length: item.length,
                width: item.width,
                height: item.height,
                unit: "IN",
              },
              quantity: item.quantity,
              freightClass: calculateFreightClass(
                itemWeight,
                calculateVolume(item)
              ),
            };
          }),
        };

        console.log(
          "🟢 Request Payload=============",
          JSON.stringify(speedshipRequest, null, 2)
        );

        // Make API call to Speedship
        const response = await axios.post(
          "https://speedship.staging-wwex.com/svc/shopFlow",
          speedshipRequest,
          {
            headers: {
              Authorization:
                "Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ik1EVTBSRUU0TmpFMU5ERTBORUkwTTBGRE5qUXlOemt3TmpSR05VVkZSREpFUlRJM01FUXpPQSJ9.eyJodHRwczovL3NwZWVkc2hpcC53d2V4LmNvbS9wcmltYXJ5Um9sZSI6IkN1c3RvbWVyX0FQSV9NMk0iLCJodHRwczovL3NwZWVkc2hpcC53d2V4LmNvbS9wcmltYXJ5TmFtZXNwYWNlIjoic3Mud3dleC5jdXN0b21lci5XMDAwOTA3MTU2IiwiaHR0cHM6Ly9zcGVlZHNoaXAud3dleC5jb20vc3NVc2VySWQiOiI4aDk0VENwME42ZmcwOWlwUDN5eUptZlBQdjVsMW1DRCIsImh0dHBzOi8vc3BlZWRzaGlwLnd3ZXguY29tL2FwcFR5cGUiOiJNMk0iLCJodHRwczovL3NwZWVkc2hpcC53d2V4LmNvbS9hcHBEb21haW4iOiJXV0VYIiwiaHR0cHM6Ly9zcGVlZHNoaXAud3dleC5jb20vZG9tYWluIjoid3dleCIsImh0dHBzOi8vc3BlZWRzaGlwLnd3ZXguY29tL2FwaVBsYW4iOiJzbWFsbCIsImh0dHBzOi8vc3BlZWRzaGlwLnd3ZXguY29tL2VtYWlsIjoiOGg5NFRDcDBONmZnMDlpcFAzeXlKbWZQUHY1bDFtQ0QiLCJpc3MiOiJodHRwczovL2F1dGguc3RhZ2luZy13d2V4LmNvbS8iLCJzdWIiOiI4aDk0VENwME42ZmcwOWlwUDN5eUptZlBQdjVsMW1DREBjbGllbnRzIiwiYXVkIjoic3RhZ2luZy13d2V4LWFwaWciLCJpYXQiOjE3NjYzNzg4NDcsImV4cCI6MTc2NjQ2NTI0NywiZ3R5IjoiY2xpZW50LWNyZWRlbnRpYWxzIiwiYXpwIjoiOGg5NFRDcDBONmZnMDlpcFAzeXlKbWZQUHY1bDFtQ0QifQ.UrS9WhYvcd_Ki6xnHEgPc26U9Wkp6DjIfDcCn1vMSy3ihfQGQx7j9-3yWIUIawmSWAfr06LK33ICJjtQFpbIer9rmtpD3j25vQTj7R6KLU_9HM7QNb26ghaQpquVW9qFXM5lmtZSOwkzhDBXsMa55gBb74Egjt1HKKrv6Sj4pU57TY4-KR_7DFhTCQZA5RCJVewXY5H_slNagXhtb0gb8R6cd9Zav1ttVES_bLYAADh9hgIfPeVmJrHLw0njUd4ug3b5elnBHw3FmRRvkjtYj2VrFk2JILzs5P2YIE0mmGp4GQuy9fQWAnSWhP07962j5NXpd1rJXkdO_CDhRw_X1A",
              "Content-Type": "application/json",
            },
            timeout: 6000, // 6 second timeout
          }
        );
        console.log("🟢 response===================", response.data);
        const speedshipResponseTime = Date.now() - speedshipStartTime;
        console.log(`🟢 Speedship API response time: ${speedshipResponseTime}ms`);
        console.log("🟢 Response:", JSON.stringify(response.data, null, 2));

        // Parse Speedship response
        let speedshipRate = 0;
        let transitDays = 5;
        let serviceLevel = "Standard Freight";
        let quoteId = `SPEEDSHIP-${Date.now()}`;

        // Try to extract rate from various possible response structures
        if (response.data) {
          // Adjust these based on actual Speedship API response structure
          if (response.data.quote) {
            speedshipRate = parseFloat(response.data.quote.totalCharge || 0);
            transitDays = parseInt(response.data.quote.transitTime || 5);
            serviceLevel =
              response.data.quote.serviceLevel || "Standard Freight";
            quoteId = response.data.quoteId || quoteId;
          } else if (response.data.totalCharge) {
            speedshipRate = parseFloat(response.data.totalCharge || 0);
            transitDays = parseInt(response.data.transitTime || 5);
            serviceLevel = response.data.serviceLevel || "Standard Freight";
            quoteId = response.data.quoteId || quoteId;
          } else if (response.data.rate) {
            speedshipRate = parseFloat(response.data.rate || 0);
            transitDays = parseInt(response.data.transitDays || 5);
            serviceLevel = response.data.serviceLevel || "Standard Freight";
            quoteId = response.data.quoteId || quoteId;
          }
        }

        // Log Speedship response
        await logWWEXResponse({
          requestId,
          quoteId,
          rate: speedshipRate,
          transitDays,
          serviceLevel: `Speedship ${serviceLevel}`,
          responseTimeMs: speedshipResponseTime,
          rawResponse: response.data,
        });

        // Cache the rate if valid
        if (speedshipRate > 0) {
          await cacheRate({
            cacheKey,
            origin,
            destination: destination.postal_code,
            weightMin: Math.floor(totalWeight / 100) * 100,
            weightMax: Math.ceil(totalWeight / 100) * 100,
            rate: speedshipRate,
            transitDays,
            expiresInMinutes: 60,
          });

          // Add Speedship rate to response
          rates.push({
            service_name: "Speedship Freight Shipping",
            service_code: "SPEEDSHIP_FREIGHT",
            total_price: (speedshipRate * 100).toString(),
            currency: "USD",
            description: `Estimated ${transitDays} business days`,
            min_delivery_date: getDeliveryDate(transitDays).toISOString(),
            max_delivery_date: getDeliveryDate(transitDays + 2).toISOString(),
          });
        } else {
          console.warn("🔴 ⚠️ Speedship API returned invalid rate (0 or undefined)");
        }
      } catch (error: any) {
        const speedshipResponseTime = Date.now() - speedshipStartTime;
        console.error("🔴Speedship API Error:", error.message);
        if (error.response) {
          console.error("🔴 Error Response:", error.response.data);
          console.error("🔴 Status:", error.response.status);
        }

        // Log error
        await logError("SPEEDSHIP_API_ERROR", error.message, error.stack, {
          responseData: error.response?.data,
          statusCode: error.response?.status,
        });

        // Use fallback rate calculation
        const totalWeight = freightItems.reduce(
          (sum, item) => sum + item.totalWeight,
          0
        );
        const baseRate = 150;
        const perLbRate = 0.5;
        const estimatedRate = baseRate + totalWeight * perLbRate;

        rates.push({
          service_name: "Speedship Freight Shipping (Estimated Fallback)",
          service_code: "SPEEDSHIP_FREIGHT_FALLBACK",
          total_price: (
            (Math.round(estimatedRate * 100) / 100) *
            100
          ).toString(),
          currency: "USD",
          description: "Estimated 7 business days (Estimated Rate Fallback)",
          min_delivery_date: getDeliveryDate(7).toISOString(),
          max_delivery_date: getDeliveryDate(9).toISOString(),
        });
      }
    }

    const totalProcessingTime = Date.now() - startTime;
    console.log(`🟢 Total processing time============= ${totalProcessingTime}ms`);

    // Return shipping rates to Shopify
    return NextResponse.json({ rates });
  } catch (error: any) {
    console.error("🔴 Speedship Estimate Error:", error);

    // Log error to database
    await logError("SPEEDSHIP_ESTIMATE_ERROR", error.message, error.stack, {
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
    service: "Speedship Freight Estimate Service",
    version: "1.0.0",
    endpoint: "https://speedship.staging-wwex.com/svc/shopFlow",
  });
}
