// import { NextRequest, NextResponse } from "next/server";
// import crypto from "crypto";
// import axios from "axios";
// import {
//   logRateRequest,
//   logWWEXResponse,
//   getCachedRate,
//   cacheRate,
//   logError,
// } from "@/lib/database";
// import FedExClient from "@/lib/fedex-client";

// // Verify Shopify webhook signature
// function verifyShopifyWebhook(rawBody: string, hmacHeader: string): boolean {
//   const secret = process.env.SHOPIFY_API_SECRET || "";
//   const hash = crypto
//     .createHmac("sha256", secret)
//     .update(rawBody, "utf8")
//     .digest("base64");

//   return hash === hmacHeader;
// }

// // Generate cache key for rate caching
// function generateCacheKey(
//   origin: string,
//   destination: string,
//   weight: number
// ): string {
//   const weightBucket = Math.ceil(weight / 100) * 100; // Round to nearest 100 lbs
//   return `speedship-${origin}-${destination}-${weightBucket}`;
// }

// // Calculate freight class based on weight and volume (density)
// function calculateFreightClass(weight: number, volume: number): string {
//   if (volume === 0) return "70"; // Default class

//   const density = weight / volume; // pounds per cubic foot

//   console.log("density=========================>", density);

//   // if (density >= 30) return "50";
//   // if (density >= 22.5) return "55";
//   // if (density >= 15) return "60";
//   // if (density >= 13.5) return "65";
//   // if (density >= 12) return "70";
//   // if (density >= 10.5) return "77.5";
//   // if (density >= 9) return "85";
//   // if (density >= 8) return "92.5";
//   // if (density >= 7) return "100";
//   // if (density >= 6) return "110";
//   // if (density >= 5) return "125";
//   // if (density >= 4) return "150";
//   // if (density >= 3) return "175";
//   // if (density >= 2) return "200";
//   // if (density >= 1) return "250";
//   // return "300";
//   if (density >= 50) return "50";
//   if (density >= 35) return "55";
//   if (density >= 30) return "60";
//   if (density >= 22.5) return "65";
//   if (density >= 15) return "70";
//   if (density >= 13.5) return "77.5";
//   if (density >= 12) return "85";
//   if (density >= 10.5) return "92.5";
//   if (density >= 9) return "100";
//   if (density >= 8) return "110";
//   if (density >= 7) return "125";
//   if (density >= 6) return "150";
//   if (density >= 5) return "175";
//   if (density >= 4) return "200";
//   if (density >= 3) return "250";
//   if (density >= 2) return "300";
//   if (density >= 1) return "400";
//   return "500"; // Ultra-light freight
// }

// // Calculate volume in cubic feet
// function calculateVolume(item: {
//   length: number;
//   width: number;
//   height: number;
// }): number {
//   // Convert inches to feet and calculate volume
//   const volumeCubicInches = item.length * item.width * item.height;
//   return volumeCubicInches / 1728; // Convert to cubic feet
// }

// export async function POST(request: NextRequest) {
//   console.log(
//     "🟢 🏃‍➡️🏃‍➡️🏃‍➡️🏃‍➡️🏃‍➡️ api/speedship-estimate excecuted=========="
//   );
//   const startTime = Date.now();

//   let res;

//   try {
//     // Get raw body for signature verification
//     const rawBody = await request.text();
//     console.log("🟢 rawBody===================", rawBody);
//     const hmacHeader = request.headers.get("X-Shopify-Hmac-Sha256") || "";
//     console.log("🟢 hmacHeader===================", hmacHeader);
//     // Verify webhook authenticity
//     // if (!verifyShopifyWebhook(rawBody, hmacHeader)) {
//     //   console.error("🔴 Invalid Shopify webhook signature");
//     //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     // }

//     const body = JSON.parse(rawBody);
//     console.log("🟢 body items===================", body.rate.items);
//     const requestId = `SPEEDSHIP-${Date.now()}-${Math.random()
//       .toString(36)
//       .substr(2, 9)}`;

//     console.log("🟢 Received speedship estimate request==========", requestId);

//     // Extract rate request data
//     const { rate } = body;

//     if (!rate) {
//       return NextResponse.json({
//         rates: [],
//       });
//     }

//     const origin = rate.origin?.postal_code || "";
//     const destination = rate.destination || {};
//     const items = rate.items || [];

//     // Calculate total weight and prepare freight items
//     let totalWeight = 0;
//     const freightItems: any[] = [];

//     for (const item of items) {
//       const isEmptyProperties =
//         !item.properties ||
//         (typeof item.properties === "object" &&
//           Object.keys(item.properties).length === 0);

//       let perItemWeight = 0;

//       // ✅ CASE 1: Weight explicitly provided in properties (lbs)
//       if (!isEmptyProperties && item.properties?.Weight) {
//         perItemWeight = Number(item.properties.Weight);
//       }

//       // ✅ CASE 2: Fallback to Shopify grams → lbs
//       else {
//         const grams = Number(item.grams) || 0;
//         perItemWeight = Number((grams / 453.592).toFixed(2));
//       }

//       // Extract custom dimensions from cart item properties (for roll products)
//       const customWidth = parseFloat(
//         item.properties?.["Width (ft)"] || item.properties?.width || 0
//       );
//       const customLength = parseFloat(
//         item.properties?.["Length (ft)"] || item.properties?.length || 0
//       );
//       // const itemQuantity = parseInt(item.quantity);
//       const itemQuantity = isEmptyProperties
//         ? item.quantity
//         : item.properties.Quantity;

//       // let perItemWeight = 0;
//       let totalItemWeight = 0;
//       let calculatedArea = 0;

//       // LOGIC 1: Roll products with custom dimensions
//       if (customWidth > 0 && customLength > 0) {
//         // Calculate area per item: width × length
//         calculatedArea = customWidth * customLength;
//         // Weight per item: area × weight per sq ft
//         // perItemWeight = calculatedArea * weightPerSqFt;
//         // Total weight: per item weight × quantity
//         totalItemWeight = perItemWeight * itemQuantity;

//         console.log(
//           `🟢 Roll Product: ${customWidth}ft × ${customLength}ft = ${calculatedArea} sq ft`
//         );
//         // console.log(
//         //   `🟢 Weight: ${calculatedArea} sq ft × ${perItemWeight} lbs/sqft = ${perItemWeight} lbs per item`
//         // );
//         console.log(
//           `🟢 Total: ${perItemWeight} lbs × ${itemQuantity} qty = ${totalItemWeight} lbs`
//         );
//       }
//       // // LOGIC 2: Fixed weight products
//       // else if (fixedWeight > 0) {
//       //   perItemWeight = fixedWeight;
//       //   totalItemWeight = fixedWeight * itemQuantity;

//       //   console.log(
//       //     `🟢 Fixed Product: ${fixedWeight} lbs × ${itemQuantity} qty = ${totalItemWeight} lbs`
//       //   );
//       // }
//       // LOGIC 3: Fallback to Shopify weight
//       else {
//         totalItemWeight = perItemWeight * itemQuantity;

//         console.log(
//           `🟢 Standard Product: ${perItemWeight} lbs × ${itemQuantity} qty = ${totalItemWeight} lbs`
//         );
//       }

//       totalWeight += totalItemWeight;

//       // Get dimensions for freight calculation
//       const itemLength =
//         customLength > 0
//           ? customLength
//           : parseFloat(item.properties?.dimension_length || 0);
//       const itemWidth =
//         customWidth > 0
//           ? customWidth
//           : parseFloat(item.properties?.dimension_width || 0);
//       const itemHeight = parseFloat(
//         item.properties?.dimension_height || item.properties?.height || 1
//       );

//       freightItems.push({
//         weight: perItemWeight,
//         totalWeight: totalItemWeight,
//         length: itemLength,
//         width: itemWidth,
//         height: itemHeight,
//         quantity: itemQuantity,
//         calculatedArea: calculatedArea,
//         perItemWeight: perItemWeight,
//         customDimensions: {
//           width: customWidth,
//           length: customLength,
//           weightPerSqFt: perItemWeight,
//           // fixedWeight: fixedWeight,
//         },
//       });
//     }

//     // Log request to database
//     await logRateRequest({
//       requestId,
//       origin,
//       destination,
//       weight: totalWeight,
//       price: parseFloat(rate.order_totals.subtotal_price || 0),
//       items: items.map((item: any, index: any) => ({
//         ...item,
//         calculatedWeight: freightItems[index]?.perItemWeight,
//         shippingMethod: "Speedship API",
//       })),
//     });

//     console.log(`🟢 Total cart weight: ${totalWeight.toFixed(2)} lbs`);

//     const rates = [];

//     // Validate that both origin and destination are in the US
//     // Speedship API only supports US domestic freight shipping
//     const originCountry = rate.origin?.country || "US";
//     const destinationCountry = destination.country || "US";

//     if (originCountry !== "US" || destinationCountry !== "US") {
//       console.warn(
//         `🔴 ⚠️ Speedship API only supports US domestic shipping. Origin: ${originCountry}, Destination: ${destinationCountry}`
//       );
//       console.log("🔴 Skipping Speedship API call for non-US addresses");

//       // Return empty rates for non-US addresses
//       const totalProcessingTime = Date.now() - startTime;
//       console.log(
//         `🟢 Total processing time============= ${totalProcessingTime}ms`
//       );
//       return NextResponse.json({
//         rates: [],
//       });
//     }

//     // Check cache first
//     const cacheKey = generateCacheKey(
//       origin,
//       destination.postal_code,
//       totalWeight
//     );
//     const cachedRate = await getCachedRate(cacheKey);

//     // if (cachedRate) {
//     //   console.log("🟢 Using cached Speedship rate");
//     //   rates.push({
//     //     service_name: "Speedship Freight Shipping",
//     //     service_code: "SPEEDSHIP_FREIGHT",
//     //     total_price: (cachedRate.shipping_rate * 100).toString(),
//     //     currency: "USD",
//     //     description: `Estimated ${cachedRate.transit_days} business days (Cached)`,
//     //     min_delivery_date: getDeliveryDate(
//     //       cachedRate.transit_days
//     //     ).toISOString(),
//     //     max_delivery_date: getDeliveryDate(
//     //       cachedRate.transit_days + 2
//     //     ).toISOString(),
//     //   });
//     // } else {
//     // Call Speedship API for real-time rate
//     const speedshipStartTime = Date.now();

//     try {
//       // Prepare Speedship API request
//       // const speedshipRequest = {
//       //   accountNumber: "12345678",
//       //   shipmentType: "LTL",
//       //   origin: {
//       //     postalCode: origin,
//       //     country: rate.origin?.country || "US",
//       //   },
//       //   destination: {
//       //     postalCode: destination.postal_code || "",
//       //     city: destination.city || "",
//       //     state: destination.province || "",
//       //     country: destination.country || "US",
//       //   },
//       //   items: freightItems.map((item: any) => {
//       //     // Ensure minimum weight of 1 lb to prevent Speedship API errors
//       //     const itemWeight = Math.max(item.weight, 1);

//       //     // Log when using default weight
//       //     if (item.weight === 0) {
//       //       console.warn(`🔴 ⚠️ Product has no weight configured, using default minimum: ${itemWeight} lb`);
//       //     }

//       //     return {
//       //       weight: itemWeight,
//       //       weightUnit: "LBS",
//       //       dimensions: {
//       //         length: item.length,
//       //         width: item.width,
//       //         height: item.height,
//       //         unit: "IN",
//       //       },
//       //       quantity: item.quantity,
//       //       freightClass: calculateFreightClass(
//       //         itemWeight,
//       //         calculateVolume(item)
//       //       ),
//       //     };
//       //   }),
//       // };

//       // -------------------- tiles logic ---------------------------------------------------------------------------
//       // Add this function before your freight logic
//       function calculateTileCartonDimensions(
//         tileWidthIn: number,
//         tileLengthIn: number,
//         tileThicknessIn: number,
//         tileWeightLbs: number,
//         actualTileCount: number // NEW: Pass actual order quantity
//       ) {
//         // ========================================
//         // CARTON CONSTRAINTS
//         // ========================================
//         const MAX_CARTON_WEIGHT = 80; // lbs (standard for one person to lift)
//         const MAX_CARTON_HEIGHT = 24; // inches (fits on standard pallet)
//         const CARTON_BASE_WIDTH = 24; // inches (standard carton size)
//         const CARTON_BASE_LENGTH = 24; // inches

//         // ========================================
//         // CALCULATE TILES PER CARTON (MAX CAPACITY)
//         // ========================================

//         // 1️⃣ How many tiles fit in the base footprint?
//         const tilesPerRow = Math.floor(CARTON_BASE_WIDTH / tileWidthIn);
//         const tilesPerColumn = Math.floor(CARTON_BASE_LENGTH / tileLengthIn);
//         const tilesPerLayer = tilesPerRow * tilesPerColumn;

//         // 2️⃣ How many layers can we stack based on HEIGHT limit?
//         const maxLayersByHeight = Math.floor(
//           MAX_CARTON_HEIGHT / tileThicknessIn
//         );

//         // 3️⃣ How many layers can we stack based on WEIGHT limit?
//         const maxLayersByWeight = Math.floor(
//           MAX_CARTON_WEIGHT / (tileWeightLbs * tilesPerLayer)
//         );

//         // 4️⃣ Take the most restrictive limit
//         const maxLayers = Math.min(maxLayersByHeight, maxLayersByWeight);

//         // Maximum tiles that CAN fit in one carton
//         const maxTilesPerCarton = tilesPerLayer * maxLayers;

//         // ========================================
//         // HANDLE PARTIAL CARTONS
//         // ========================================

//         let cartonCount = 0;
//         let tilesInLastCarton = 0;
//         let actualCartonHeight = 0;
//         let actualCartonWeight = 0;

//         if (actualTileCount <= 0) {
//           // No tiles ordered
//           return {
//             tilesPerCarton: 0,
//             cartonCount: 0,
//             cartonHeight: 0,
//             cartonWeight: 0,
//             cartonDimensions: {
//               length: CARTON_BASE_LENGTH,
//               width: CARTON_BASE_WIDTH,
//               height: 0,
//             },
//           };
//         } else if (actualTileCount <= maxTilesPerCarton) {
//           // ✅ ALL TILES FIT IN ONE PARTIAL CARTON
//           cartonCount = 1;
//           tilesInLastCarton = actualTileCount;

//           // Calculate how many layers we actually need
//           const layersNeeded = Math.ceil(actualTileCount / tilesPerLayer);
//           actualCartonHeight = layersNeeded * tileThicknessIn;
//           actualCartonWeight = actualTileCount * tileWeightLbs;
//         } else {
//           // ✅ MULTIPLE CARTONS NEEDED
//           cartonCount = Math.ceil(actualTileCount / maxTilesPerCarton);
//           tilesInLastCarton =
//             actualTileCount % maxTilesPerCarton || maxTilesPerCarton;

//           // Full cartons use max height
//           actualCartonHeight = maxLayers * tileThicknessIn;
//           actualCartonWeight = maxTilesPerCarton * tileWeightLbs;
//         }

//         console.log("🟢 DYNAMIC TILE CARTON CALCULATION:");
//         console.log(
//           `   Tile size: ${tileWidthIn}" × ${tileLengthIn}" × ${tileThicknessIn}"`
//         );
//         console.log(`   Tile weight: ${tileWeightLbs} lbs`);
//         console.log(
//           `   Tiles per layer: ${tilesPerLayer} (${tilesPerRow} × ${tilesPerColumn})`
//         );
//         console.log(`   Max layers by height: ${maxLayersByHeight}`);
//         console.log(`   Max layers by weight: ${maxLayersByWeight}`);
//         console.log(`   Max tiles per full carton: ${maxTilesPerCarton}`);
//         console.log(`   ✅ Actual order: ${actualTileCount} tiles`);
//         console.log(`   ✅ Cartons needed: ${cartonCount}`);
//         console.log(`   ✅ Tiles in last carton: ${tilesInLastCarton}`);
//         console.log(`   ✅ Carton height: ${actualCartonHeight.toFixed(1)}"`);
//         console.log(
//           `   ✅ Carton weight: ${actualCartonWeight.toFixed(1)} lbs`
//         );

//         return {
//           tilesPerCarton: maxTilesPerCarton, // Max capacity (for full cartons)
//           cartonCount,
//           cartonHeight: actualCartonHeight,
//           cartonWeight: actualCartonWeight,
//           tilesInLastCarton,
//           cartonDimensions: {
//             length: CARTON_BASE_LENGTH,
//             width: CARTON_BASE_WIDTH,
//             height: Math.ceil(actualCartonHeight), // Round up for freight
//           },
//         };
//       }
//       // -------------------------------------------------------------------------------------------------------------------------

//       // -------------------- mats logic ----------------------------------------------------------------------------------------
//       function calculateMatCartonDimensions(
//         matWidthFt: number,
//         matLengthFt: number,
//         matThicknessIn: number,
//         matWeightLbs: number,
//         actualMatCount: number
//       ) {
//         // ========================================
//         // CARTON CONSTRAINTS
//         // ========================================
//         const MAX_CARTON_WEIGHT = 100; // lbs (mats are heavier, allow more weight)
//         const MAX_CARTON_HEIGHT = 12; // inches (mats are bulky but compress)

//         // Mats are folded/rolled for shipping
//         // Typical folded dimensions: half the length
//         const foldedMatLengthIn = (matLengthFt * 12) / 2; // Folded in half
//         const foldedMatWidthIn = matWidthFt * 12; // Width stays same

//         // Standard carton size for mats
//         const CARTON_LENGTH = 48; // inches
//         const CARTON_WIDTH = 48; // inches

//         // ========================================
//         // CALCULATE MATS PER CARTON
//         // ========================================

//         // 1️⃣ How many mats fit in the base footprint when folded?
//         const matsPerRow = Math.floor(CARTON_LENGTH / foldedMatLengthIn);
//         const matsPerColumn = Math.floor(CARTON_WIDTH / foldedMatWidthIn);
//         const matsPerLayer = matsPerRow * matsPerColumn;

//         // If no mats fit side-by-side, stack vertically
//         const canLayFlat = matsPerLayer >= 1;

//         if (!canLayFlat) {
//           // Stack mats vertically (on their edge)
//           const maxLayersByHeight = Math.floor(
//             MAX_CARTON_HEIGHT / matThicknessIn
//           );
//           const maxLayersByWeight = Math.floor(
//             MAX_CARTON_WEIGHT / matWeightLbs
//           );
//           const maxMatsPerCarton = Math.min(
//             maxLayersByHeight,
//             maxLayersByWeight
//           );

//           const cartonCount = Math.ceil(actualMatCount / maxMatsPerCarton);
//           const matsInLastCarton =
//             actualMatCount % maxMatsPerCarton || maxMatsPerCarton;
//           const actualCartonHeight = Math.min(
//             matsInLastCarton * matThicknessIn,
//             MAX_CARTON_HEIGHT
//           );
//           const actualCartonWeight = matsInLastCarton * matWeightLbs;

//           console.log("🟢 DYNAMIC MAT CARTON CALCULATION (VERTICAL STACK):");
//           console.log(
//             `   Mat size: ${matWidthFt}' × ${matLengthFt}' × ${matThicknessIn}"`
//           );
//           console.log(`   Mat weight: ${matWeightLbs} lbs`);
//           console.log(`   Max mats per carton: ${maxMatsPerCarton}`);
//           console.log(`   ✅ Actual order: ${actualMatCount} mats`);
//           console.log(`   ✅ Cartons needed: ${cartonCount}`);
//           console.log(`   ✅ Mats in last carton: ${matsInLastCarton}`);
//           console.log(`   ✅ Carton height: ${actualCartonHeight.toFixed(1)}"`);
//           console.log(
//             `   ✅ Carton weight: ${actualCartonWeight.toFixed(1)} lbs`
//           );

//           return {
//             matsPerCarton: maxMatsPerCarton,
//             cartonCount,
//             cartonHeight: actualCartonHeight,
//             cartonWeight: actualCartonWeight,
//             matsInLastCarton,
//             cartonDimensions: {
//               length: CARTON_LENGTH,
//               width: CARTON_WIDTH,
//               height: Math.ceil(actualCartonHeight),
//             },
//           };
//         }

//         // 2️⃣ Mats CAN lay flat - calculate layers
//         const maxLayersByHeight = Math.floor(
//           MAX_CARTON_HEIGHT / matThicknessIn
//         );
//         const maxLayersByWeight = Math.floor(
//           MAX_CARTON_WEIGHT / (matWeightLbs * matsPerLayer)
//         );
//         const maxLayers = Math.min(maxLayersByHeight, maxLayersByWeight);

//         const maxMatsPerCarton = matsPerLayer * maxLayers;

//         // ========================================
//         // HANDLE PARTIAL CARTONS
//         // ========================================
//         let cartonCount = 0;
//         let matsInLastCarton = 0;
//         let actualCartonHeight = 0;
//         let actualCartonWeight = 0;

//         if (actualMatCount <= 0) {
//           return {
//             matsPerCarton: 0,
//             cartonCount: 0,
//             cartonHeight: 0,
//             cartonWeight: 0,
//             matsInLastCarton: 0,
//             cartonDimensions: {
//               length: CARTON_LENGTH,
//               width: CARTON_WIDTH,
//               height: 0,
//             },
//           };
//         } else if (actualMatCount <= maxMatsPerCarton) {
//           // All mats fit in one carton
//           cartonCount = 1;
//           matsInLastCarton = actualMatCount;
//           const layersNeeded = Math.ceil(actualMatCount / matsPerLayer);
//           actualCartonHeight = layersNeeded * matThicknessIn;
//           actualCartonWeight = actualMatCount * matWeightLbs;
//         } else {
//           // Multiple cartons needed
//           cartonCount = Math.ceil(actualMatCount / maxMatsPerCarton);
//           matsInLastCarton =
//             actualMatCount % maxMatsPerCarton || maxMatsPerCarton;
//           actualCartonHeight = maxLayers * matThicknessIn;
//           actualCartonWeight = maxMatsPerCarton * matWeightLbs;
//         }

//         console.log("🟢 DYNAMIC MAT CARTON CALCULATION (FLAT STACK):");
//         console.log(
//           `   Mat size: ${matWidthFt}' × ${matLengthFt}' × ${matThicknessIn}"`
//         );
//         console.log(
//           `   Folded dimensions: ${foldedMatWidthIn}" × ${foldedMatLengthIn}"`
//         );
//         console.log(`   Mat weight: ${matWeightLbs} lbs`);
//         console.log(
//           `   Mats per layer: ${matsPerLayer} (${matsPerRow} × ${matsPerColumn})`
//         );
//         console.log(`   Max layers by height: ${maxLayersByHeight}`);
//         console.log(`   Max layers by weight: ${maxLayersByWeight}`);
//         console.log(`   Max mats per carton: ${maxMatsPerCarton}`);
//         console.log(`   ✅ Actual order: ${actualMatCount} mats`);
//         console.log(`   ✅ Cartons needed: ${cartonCount}`);
//         console.log(`   ✅ Mats in last carton: ${matsInLastCarton}`);
//         console.log(`   ✅ Carton height: ${actualCartonHeight.toFixed(1)}"`);
//         console.log(
//           `   ✅ Carton weight: ${actualCartonWeight.toFixed(1)} lbs`
//         );

//         return {
//           matsPerCarton: maxMatsPerCarton,
//           cartonCount,
//           cartonHeight: actualCartonHeight,
//           cartonWeight: actualCartonWeight,
//           matsInLastCarton,
//           cartonDimensions: {
//             length: CARTON_LENGTH,
//             width: CARTON_WIDTH,
//             height: Math.ceil(actualCartonHeight),
//           },
//         };
//       }

//       // ---------------------------------------------------------------------------------------------------------------------------

//       function calculateRollDiameter(
//         thicknessIn: number,
//         lengthFt: number,
//         coreDiameterIn = 4
//       ) {
//         const lengthIn = lengthFt * 12;
//         return Math.sqrt(
//           Math.pow(coreDiameterIn, 2) + (4 * thicknessIn * lengthIn) / Math.PI
//         );
//       }

//       function decidePackaging(
//         rollLengthFt: number,
//         weightPerRoll: number,
//         quantity: number
//       ) {
//         const totalWeight = weightPerRoll * quantity;

//         const canUseRoll =
//           rollLengthFt <= 25 &&
//           weightPerRoll <= 200 &&
//           quantity <= 3 &&
//           totalWeight <= 500;

//         return canUseRoll ? "ROLL" : "PLT";
//       }

//       function getProductType(item: any) {
//         const hasWidthFt = Number(item.properties?.["Width (ft)"]) > 0;
//         const hasLengthFt = Number(item.properties?.["Length (ft)"]) > 0;

//         if (hasWidthFt && hasLengthFt) {
//           // Roll entered by user (4x100, 4x50)
//           return "ROLL";
//         }

//         // Flat pre-cut mats (4x3, 4x6, 4x8)
//         if (item.name?.toLowerCase().includes("mat")) {
//           return "MAT";
//         }

//         // Interlocking tiles, boxes of tiles
//         if (item.name?.toLowerCase().includes("tile")) {
//           return "TILE";
//         }

//         return "UNKNOWN";
//       }

//       function extractThicknessInInches(name: string): number {
//         if (!name) return 0.25; // Default to 1/4"

//         // 1️⃣ Try fraction like 1/4"
//         const fractionMatch = name.match(/\b(\d+)\s*\/\s*(\d+)(?=")?/);
//         if (fractionMatch) {
//           const num = Number(fractionMatch[1]);
//           const den = Number(fractionMatch[2]);
//           return num / den;
//         }

//         // 2️⃣ Try mm like 8mm
//         const mmMatch = name.match(/\b(\d+(?:\.\d+)?)\s*mm\b/i);
//         if (mmMatch) {
//           const mm = Number(mmMatch[1]);
//           return mm / 25.4; // mm → inches
//         }

//         return 0.25; // Safe default
//       }

//       function extractDimensionsFromName(
//         name: string
//       ): { width: number; length: number } | null {
//         // Try patterns like "4'x3'", "4x6", "24\"x24\"", "48x120"

//         // Pattern 1: feet with quotes (4'x3')
//         const feetMatch = name.match(/(\d+)'\s*x\s*(\d+)'/i);
//         if (feetMatch) {
//           return { width: Number(feetMatch[1]), length: Number(feetMatch[2]) };
//         }

//         // Pattern 2: inches with quotes (24"x24")
//         const inchMatch = name.match(/(\d+)"\s*x\s*(\d+)"/i);
//         if (inchMatch) {
//           return {
//             width: Number(inchMatch[1]) / 12, // Convert to feet
//             length: Number(inchMatch[2]) / 12,
//           };
//         }

//         // Pattern 3: no units (assume inches for tiles, feet for mats)
//         const plainMatch = name.match(/(\d+)\s*x\s*(\d+)/i);
//         if (plainMatch) {
//           const val1 = Number(plainMatch[1]);
//           const val2 = Number(plainMatch[2]);

//           // If values are small (< 10), likely feet (mats)
//           // If values are larger (>= 10), likely inches (tiles)
//           if (val1 < 10 && val2 < 10) {
//             return { width: val1, length: val2 }; // Already in feet
//           } else {
//             return {
//               width: val1 / 12, // Convert inches to feet
//               length: val2 / 12,
//             };
//           }
//         }

//         return null;
//       }

//       // =====================================================
//       // REPLACE YOUR PRODUCT GROUPING SECTION WITH THIS
//       // =====================================================

//       interface ProcessedProduct {
//         type: "TILE" | "MAT" | "ROLL";
//         items: any[];
//         totalWeight: number;
//         totalQuantity: number;
//         handlingUnits: any[];
//       }

//       // // Group items by product type
//       // const productGroups = new Map<string, ProcessedProduct>();

//       // items.forEach((item: any, index: number) => {
//       //   const freight = freightItems[index];
//       //   const type = getProductType(item);

//       //   if (!productGroups.has(type)) {
//       //     productGroups.set(type, {
//       //       type: type as any,
//       //       items: [],
//       //       totalWeight: 0,
//       //       totalQuantity: 0,
//       //       handlingUnits: [],
//       //     });
//       //   }

//       //   const group = productGroups.get(type)!;
//       //   group.items.push({ item, freight, index }); // ✅ Store BOTH item and freight
//       //   group.totalWeight += freight.totalWeight;
//       //   group.totalQuantity += Number(freight.quantity); // ✅ Ensure numeric
//       // });

//       // console.log(`🟢 Detected ${productGroups.size} product type(s) in order`);

//       // // Process each product type separately
//       // const allHandlingUnits: any[] = [];

//       // for (const [productType, group] of productGroups.entries()) {
//       //   console.log(
//       //     `🟢 Processing ${productType}: ${
//       //       group.totalQuantity
//       //     } units, ${group.totalWeight.toFixed(2)} lbs`
//       //   );

//       //   // =====================================================
//       //   // TILE PROCESSING
//       //   // =====================================================
//       //   if (productType === "TILE") {
//       //     let tileWidth = 24; // inches (default)
//       //     let tileLength = 24; // inches (default)
//       //     let tileThickness = 0.5; // inches (default 1/2")
//       //     let tileWeight = 5.2; // lbs per tile

//       //     // Extract from FIRST item in group (all tiles should be same size)
//       //     const { item, freight } = group.items[0];

//       //     // ✅ Get thickness from product NAME
//       //     tileThickness = extractThicknessInInches(item.name);

//       //     // ✅ Get weight from freight calculation
//       //     tileWeight = freight.perItemWeight || 5.2;

//       //     // ✅ Get dimensions - prioritize freight data, fallback to name parsing
//       //     if (freight.width > 0 && freight.length > 0) {
//       //       tileWidth = freight.width * 12; // Convert ft to inches
//       //       tileLength = freight.length * 12;
//       //     } else {
//       //       // Try to extract from product name (e.g., "24\"x24\"")
//       //       const dims = extractDimensionsFromName(item.name);
//       //       if (dims) {
//       //         tileWidth = dims.width * 12; // Convert to inches
//       //         tileLength = dims.length * 12;
//       //       }
//       //     }

//       //     console.log(
//       //       `=======================>🟢 TILE SPECS: ${tileWidth}" × ${tileLength}" × ${tileThickness}" @ ${tileWeight} lbs`
//       //     );

//       //     const cartonSpecs = calculateTileCartonDimensions(
//       //       tileWidth,
//       //       tileLength,
//       //       tileThickness,
//       //       tileWeight,
//       //       group.totalQuantity
//       //     );

//       //     console.log(`🟢 TILES: ${cartonSpecs.cartonCount} cartons needed`);

//       //     allHandlingUnits.push({
//       //       quantity: cartonSpecs.cartonCount,
//       //       packagingType: "CARTON",
//       //       isMixedClass: false,
//       //       isStackable: true,
//       //       billedDimension: {
//       //         length: {
//       //           value: cartonSpecs.cartonDimensions.length,
//       //           unit: "IN",
//       //         },
//       //         width: { value: cartonSpecs.cartonDimensions.width, unit: "IN" },
//       //         height: {
//       //           value: cartonSpecs.cartonDimensions.height,
//       //           unit: "IN",
//       //         },
//       //       },
//       //       weight: {
//       //         value: Math.ceil(cartonSpecs.cartonWeight),
//       //         unit: "LB",
//       //       },
//       //       shippedItemList: [
//       //         {
//       //           quantity: cartonSpecs.tilesInLastCarton,
//       //           packagingType: "CARTON",
//       //           commodityDescription: "Rubber interlocking tiles",
//       //           commodityClass: calculateFreightClass(
//       //             cartonSpecs.cartonWeight,
//       //             calculateVolume(cartonSpecs.cartonDimensions)
//       //           ),
//       //           isHazMat: false,
//       //           dimensions: {
//       //             length: {
//       //               value: cartonSpecs.cartonDimensions.length,
//       //               unit: "IN",
//       //             },
//       //             width: {
//       //               value: cartonSpecs.cartonDimensions.width,
//       //               unit: "IN",
//       //             },
//       //             height: {
//       //               value: cartonSpecs.cartonDimensions.height,
//       //               unit: "IN",
//       //             },
//       //           },
//       //           weight: {
//       //             value: Math.ceil(cartonSpecs.cartonWeight),
//       //             unit: "LB",
//       //           },
//       //         },
//       //       ],
//       //     });
//       //   }

//       //   // =====================================================
//       //   // MAT PROCESSING
//       //   // =====================================================
//       //   else if (productType === "MAT") {
//       //     let matWidth = 0; // feet (default)
//       //     let matLength = 0; // feet (default)
//       //     let matThickness = 0; // inches (default 1/2")
//       //     let matWeight = 0; // lbs per mat (default)

//       //     // Extract from FIRST item in group
//       //     const { item, freight } = group.items[0];

//       //     // ✅ Get thickness from product NAME
//       //     matThickness = extractThicknessInInches(item.name);

//       //     // ✅ Get weight from freight calculation
//       //     matWeight = freight.perItemWeight || 25;

//       //     // ✅ Get dimensions - prioritize freight data, fallback to name parsing
//       //     if (freight.width > 0 && freight.length > 0) {
//       //       matWidth = freight.width; // Already in feet
//       //       matLength = freight.length;
//       //     } else {
//       //       // Try to extract from product name (e.g., "4'x3'")
//       //       const dims = extractDimensionsFromName(item.name);
//       //       if (dims) {
//       //         matWidth = dims.width; // Already in feet
//       //         matLength = dims.length;
//       //       }
//       //     }

//       //     console.log(
//       //       `=======================>🟢 MAT SPECS: ${matWidth}' × ${matLength}' × ${matThickness}" @ ${matWeight} lbs`
//       //     );

//       //     const matCartonSpecs = calculateMatCartonDimensions(
//       //       matWidth,
//       //       matLength,
//       //       matThickness,
//       //       matWeight,
//       //       group.totalQuantity
//       //     );

//       //     console.log(`🟢 MATS: ${matCartonSpecs.cartonCount} cartons needed`);

//       //     allHandlingUnits.push({
//       //       quantity: matCartonSpecs.cartonCount,
//       //       packagingType: "CARTON",
//       //       isMixedClass: false,
//       //       isStackable: true,
//       //       billedDimension: {
//       //         length: {
//       //           value: matCartonSpecs.cartonDimensions.length,
//       //           unit: "IN",
//       //         },
//       //         width: {
//       //           value: matCartonSpecs.cartonDimensions.width,
//       //           unit: "IN",
//       //         },
//       //         height: {
//       //           value: matCartonSpecs.cartonDimensions.height,
//       //           unit: "IN",
//       //         },
//       //       },
//       //       weight: {
//       //         value: Math.ceil(matCartonSpecs.cartonWeight),
//       //         unit: "LB",
//       //       },
//       //       shippedItemList: [
//       //         {
//       //           quantity: matCartonSpecs.matsInLastCarton,
//       //           packagingType: "CARTON",
//       //           commodityDescription: "Rubber floor mats",
//       //           commodityClass: calculateFreightClass(
//       //             matCartonSpecs.cartonWeight,
//       //             calculateVolume(matCartonSpecs.cartonDimensions)
//       //           ),
//       //           isHazMat: false,
//       //           dimensions: {
//       //             length: {
//       //               value: matCartonSpecs.cartonDimensions.length,
//       //               unit: "IN",
//       //             },
//       //             width: {
//       //               value: matCartonSpecs.cartonDimensions.width,
//       //               unit: "IN",
//       //             },
//       //             height: {
//       //               value: matCartonSpecs.cartonDimensions.height,
//       //               unit: "IN",
//       //             },
//       //           },
//       //           weight: {
//       //             value: Math.ceil(matCartonSpecs.cartonWeight),
//       //             unit: "LB",
//       //           },
//       //         },
//       //       ],
//       //     });
//       //   }

//       //   // =====================================================
//       //   // ROLL PROCESSING
//       //   // =====================================================
//       //   else if (productType === "ROLL") {
//       //     let rollWidth = 48; // inches (default 4')
//       //     let rollLengthFt = 10; // feet (default)
//       //     let rollDiameter = 8; // inches (calculated)
//       //     let weightPerRoll = 64; // lbs (default)
//       //     let thickness = 0.25; // inches (default 1/4")

//       //     // Extract from FIRST item in group
//       //     const { item, freight } = group.items[0];

//       //     // ✅ Get thickness from product NAME
//       //     thickness = extractThicknessInInches(item.name);

//       //     // ✅ Get weight from freight calculation
//       //     weightPerRoll = freight.perItemWeight || 64;

//       //     // ✅ Get dimensions from freight (rolls MUST have custom dimensions)
//       //     rollWidth = (freight.width || 4) * 12; // Convert feet to inches
//       //     rollLengthFt = freight.length || 10; // Keep in feet

//       //     // ✅ Calculate roll diameter
//       //     rollDiameter = Math.ceil(
//       //       calculateRollDiameter(thickness, rollLengthFt)
//       //     );

//       //     console.log(
//       //       `=======================>🟢 ROLL SPECS: ${rollWidth}" wide × ${rollLengthFt}' long, ${rollDiameter}" diameter @ ${weightPerRoll} lbs`
//       //     );

//       //     const canUseRoll = decidePackaging(
//       //       rollLengthFt,
//       //       weightPerRoll,
//       //       group.totalQuantity
//       //     );

//       //     console.log(
//       //       `🟢 ROLLS: ${canUseRoll} packaging for ${group.totalQuantity} rolls`
//       //     );

//       //     if (canUseRoll === "PLT") {
//       //       // Pallet configuration
//       //       const STANDARD_PALLET_LENGTH = 48;
//       //       const STANDARD_PALLET_WIDTH = 40;

//       //       const rollsPerRow = Math.floor(
//       //         STANDARD_PALLET_LENGTH / rollDiameter
//       //       );
//       //       const rowsPerPallet = Math.floor(
//       //         STANDARD_PALLET_WIDTH / rollDiameter
//       //       );
//       //       const rollsPerPallet = rollsPerRow * rowsPerPallet;
//       //       // const palletCount = Math.ceil(group.totalQuantity / rollsPerPallet);
//       //       // const palletHeight = rollDiameter + 6;
//       //       // const weightPerPallet = weightPerRoll * rollsPerPallet;

//       //       // const rollsPerPallet = 30;
//       //       let remainingRolls = group.totalQuantity;

//       //       while (remainingRolls > 0) {
//       //         const rollsOnThisPallet = Math.min(
//       //           rollsPerPallet,
//       //           remainingRolls
//       //         );

//       //         const palletWeight = Math.ceil(rollsOnThisPallet * weightPerRoll);

//       //         const layers = Math.ceil(rollsOnThisPallet / rollsPerRow);
//       //         const palletHeight = layers * rollDiameter + 6; // pallet base

//       //         allHandlingUnits.push({
//       //           packagingType: "PLT",
//       //           quantity: 1,
//       //           isMixedClass: false,
//       //           isStackable: false,
//       //           billedDimension: {
//       //             length: { value: 48, unit: "IN" },
//       //             width: { value: 40, unit: "IN" },
//       //             height: { value: Math.ceil(palletHeight), unit: "IN" },
//       //           },
//       //           weight: {
//       //             value: palletWeight,
//       //             unit: "LB",
//       //           },
//       //           shippedItemList: [
//       //             {
//       //               commodityClass: calculateFreightClass(
//       //                 palletWeight,
//       //                 calculateVolume({
//       //                   length: 48,
//       //                   width: 40,
//       //                   height: palletHeight,
//       //                 })
//       //               ),
//       //               commodityDescription: "Rubber flooring rolls",
//       //               isHazMat: false,
//       //               quantity: rollsOnThisPallet, // ✅ ACTUAL rolls
//       //               dimensions: {
//       //                 length: { value: 48, unit: "IN" },
//       //                 width: { value: 40, unit: "IN" },
//       //                 height: { value: Math.ceil(palletHeight), unit: "IN" },
//       //               },
//       //               weight: {
//       //                 value: palletWeight,
//       //                 unit: "LB",
//       //               },
//       //             },
//       //           ],
//       //         });

//       //         remainingRolls -= rollsOnThisPallet;
//       //       }

//       //       // allHandlingUnits.push({
//       //       //   billedDimension: {
//       //       //     length: { value: STANDARD_PALLET_LENGTH, unit: "IN" },
//       //       //     width: { value: STANDARD_PALLET_WIDTH, unit: "IN" },
//       //       //     height: { value: Math.ceil(palletHeight), unit: "IN" },
//       //       //   },
//       //       //   isMixedClass: false,
//       //       //   isStackable: false,
//       //       //   packagingType: "PLT",
//       //       //   quantity: palletCount,
//       //       //   shippedItemList: [
//       //       //     {
//       //       //       commodityClass: calculateFreightClass(
//       //       //         weightPerPallet,
//       //       //         calculateVolume({
//       //       //           length: STANDARD_PALLET_LENGTH,
//       //       //           width: STANDARD_PALLET_WIDTH,
//       //       //           height: palletHeight,
//       //       //         })
//       //       //       ),
//       //       //       commodityDescription: "Rubber flooring rolls",
//       //       //       dimensions: {
//       //       //         length: { value: STANDARD_PALLET_LENGTH, unit: "IN" },
//       //       //         width: { value: STANDARD_PALLET_WIDTH, unit: "IN" },
//       //       //         height: { value: Math.ceil(palletHeight), unit: "IN" },
//       //       //       },
//       //       //       isHazMat: false,
//       //       //       // quantity: rollsPerPallet,
//       //       //       quantity: group.totalQuantity,
//       //       //       weight: {
//       //       //         // value: Math.ceil(weightPerPallet),
//       //       //         value: Math.ceil(weightPerRoll * group.totalQuantity),
//       //       //         unit: "LB",
//       //       //       },
//       //       //     },
//       //       //   ],
//       //       //   weight: {
//       //       //     // value: Math.ceil(weightPerPallet),
//       //       //     value: Math.ceil(weightPerRoll * group.totalQuantity),
//       //       //     unit: "LB",
//       //       //   },
//       //       // });
//       //     } else {
//       //       // Loose rolls
//       //       allHandlingUnits.push({
//       //         packagingType: "ROLL",
//       //         quantity: Number(group.totalQuantity),
//       //         isMixedClass: false,
//       //         isStackable: false,
//       //         billedDimension: {
//       //           length: { value: rollWidth, unit: "IN" },
//       //           width: { value: rollDiameter, unit: "IN" },
//       //           height: { value: rollDiameter, unit: "IN" },
//       //         },
//       //         weight: {
//       //           value: Math.ceil(weightPerRoll * group.totalQuantity),
//       //           unit: "LB",
//       //         },
//       //         shippedItemList: [
//       //           {
//       //             commodityClass: calculateFreightClass(
//       //               weightPerRoll,
//       //               calculateVolume({
//       //                 length: rollWidth,
//       //                 width: rollDiameter,
//       //                 height: rollDiameter,
//       //               })
//       //             ),
//       //             commodityDescription: "Rubber flooring roll",
//       //             isHazMat: false,
//       //             quantity: Number(group.totalQuantity),
//       //             dimensions: {
//       //               length: { value: rollWidth, unit: "IN" },
//       //               width: { value: rollDiameter, unit: "IN" },
//       //               height: { value: rollDiameter, unit: "IN" },
//       //             },
//       //             weight: {
//       //               value: Math.ceil(weightPerRoll),
//       //               unit: "LB",
//       //             },
//       //           },
//       //         ],
//       //       });
//       //     }
//       //   }
//       // }
//       // Replace your product grouping section (starting from line ~788) with this:

//       // =====================================================
//       // SINGLE PALLET APPROACH - COMBINE ALL ITEMS
//       // =====================================================

//       // Standard pallet dimensions
//       const STANDARD_PALLET_LENGTH = 48; // inches
//       const STANDARD_PALLET_WIDTH = 40; // inches
//       const MAX_PALLET_HEIGHT = 72; // inches (6 feet)
//       const MAX_PALLET_WEIGHT = 2000; // lbs (typical LTL limit)

//       // Collect all items for the single pallet
//       const allShippedItems = [];
//       let totalPalletWeight = 0;
//       let maxItemHeight = 0;

//       // Process each product type and add to the single pallet
//       const productGroups = new Map();

//       items.forEach((item : any, index : any) => {
//         const freight = freightItems[index];
//         const type = getProductType(item);

//         if (!productGroups.has(type)) {
//           productGroups.set(type, {
//             type: type,
//             items: [],
//             totalWeight: 0,
//             totalQuantity: 0,
//           });
//         }

//         const group = productGroups.get(type);
//         group.items.push({ item, freight, index });
//         group.totalWeight += freight.totalWeight;
//         group.totalQuantity += Number(freight.quantity);
//       });

//       console.log(
//         `🟢 Detected ${productGroups.size} product type(s) - combining into single pallet`
//       );

//       // Process each product type and add to allShippedItems
//       for (const [productType, group] of productGroups.entries()) {
//         console.log(
//           `🟢 Processing ${productType}: ${
//             group.totalQuantity
//           } units, ${group.totalWeight.toFixed(2)} lbs`
//         );

//         // =====================================================
//         // TILE PROCESSING
//         // =====================================================
//         if (productType === "TILE") {
//           let tileWidth = 24;
//           let tileLength = 24;
//           let tileThickness = 0.5;
//           let tileWeight = 5.2;

//           const { item, freight } = group.items[0];

//           tileThickness = extractThicknessInInches(item.name);
//           tileWeight = freight.perItemWeight || 5.2;

//           if (freight.width > 0 && freight.length > 0) {
//             tileWidth = freight.width * 12;
//             tileLength = freight.length * 12;
//           } else {
//             const dims = extractDimensionsFromName(item.name);
//             if (dims) {
//               tileWidth = dims.width * 12;
//               tileLength = dims.length * 12;
//             }
//           }

//           const cartonSpecs = calculateTileCartonDimensions(
//             tileWidth,
//             tileLength,
//             tileThickness,
//             tileWeight,
//             group.totalQuantity
//           );

//           // Add tiles as cartons on the pallet
//           allShippedItems.push({
//             quantity: cartonSpecs.cartonCount,
//             packagingType: "CARTON",
//             commodityDescription: "Rubber interlocking tiles",
//             commodityClass: calculateFreightClass(
//               cartonSpecs.cartonWeight,
//               calculateVolume(cartonSpecs.cartonDimensions)
//             ),
//             isHazMat: false,
//             dimensions: {
//               length: {
//                 value: cartonSpecs.cartonDimensions.length,
//                 unit: "IN",
//               },
//               width: { value: cartonSpecs.cartonDimensions.width, unit: "IN" },
//               height: {
//                 value: cartonSpecs.cartonDimensions.height,
//                 unit: "IN",
//               },
//             },
//             weight: {
//               value: Math.ceil(cartonSpecs.cartonWeight),
//               unit: "LB",
//             },
//           });

//           totalPalletWeight +=
//             cartonSpecs.cartonCount * cartonSpecs.cartonWeight;
//           maxItemHeight = Math.max(
//             maxItemHeight,
//             cartonSpecs.cartonDimensions.height
//           );
//         }

//         // =====================================================
//         // MAT PROCESSING
//         // =====================================================
//         else if (productType === "MAT") {
//           let matWidth = 0;
//           let matLength = 0;
//           let matThickness = 0;
//           let matWeight = 0;

//           const { item, freight } = group.items[0];

//           matThickness = extractThicknessInInches(item.name);
//           matWeight = freight.perItemWeight || 25;

//           if (freight.width > 0 && freight.length > 0) {
//             matWidth = freight.width;
//             matLength = freight.length;
//           } else {
//             const dims = extractDimensionsFromName(item.name);
//             if (dims) {
//               matWidth = dims.width;
//               matLength = dims.length;
//             }
//           }

//           const matCartonSpecs = calculateMatCartonDimensions(
//             matWidth,
//             matLength,
//             matThickness,
//             matWeight,
//             group.totalQuantity
//           );

//           // Add mats as cartons on the pallet
//           allShippedItems.push({
//             quantity: matCartonSpecs.cartonCount,
//             packagingType: "CARTON",
//             commodityDescription: "Rubber floor mats",
//             commodityClass: calculateFreightClass(
//               matCartonSpecs.cartonWeight,
//               calculateVolume(matCartonSpecs.cartonDimensions)
//             ),
//             isHazMat: false,
//             dimensions: {
//               length: {
//                 value: matCartonSpecs.cartonDimensions.length,
//                 unit: "IN",
//               },
//               width: {
//                 value: matCartonSpecs.cartonDimensions.width,
//                 unit: "IN",
//               },
//               height: {
//                 value: matCartonSpecs.cartonDimensions.height,
//                 unit: "IN",
//               },
//             },
//             weight: {
//               value: Math.ceil(matCartonSpecs.cartonWeight),
//               unit: "LB",
//             },
//           });

//           totalPalletWeight +=
//             matCartonSpecs.cartonCount * matCartonSpecs.cartonWeight;
//           maxItemHeight = Math.max(
//             maxItemHeight,
//             matCartonSpecs.cartonDimensions.height
//           );
//         }

//         // =====================================================
//         // ROLL PROCESSING
//         // =====================================================
//         else if (productType === "ROLL") {
//           let rollWidth = 48;
//           let rollLengthFt = 10;
//           let rollDiameter = 8;
//           let weightPerRoll = 64;
//           let thickness = 0.25;

//           const { item, freight } = group.items[0];

//           thickness = extractThicknessInInches(item.name);
//           weightPerRoll = freight.perItemWeight || 64;

//           rollWidth = (freight.width || 4) * 12;
//           rollLengthFt = freight.length || 10;
//           rollDiameter = Math.ceil(
//             calculateRollDiameter(thickness, rollLengthFt)
//           );

//           // Add rolls to the pallet (not separate pallets)
//           allShippedItems.push({
//             quantity: group.totalQuantity,
//             packagingType: "ROLL",
//             commodityDescription: "Rubber flooring rolls",
//             commodityClass: calculateFreightClass(
//               weightPerRoll,
//               calculateVolume({
//                 length: rollWidth,
//                 width: rollDiameter,
//                 height: rollDiameter,
//               })
//             ),
//             isHazMat: false,
//             dimensions: {
//               length: { value: rollWidth, unit: "IN" },
//               width: { value: rollDiameter, unit: "IN" },
//               height: { value: rollDiameter, unit: "IN" },
//             },
//             weight: {
//               value: Math.ceil(weightPerRoll),
//               unit: "LB",
//             },
//           });

//           totalPalletWeight += group.totalQuantity * weightPerRoll;
//           maxItemHeight = Math.max(maxItemHeight, rollDiameter);
//         }
//       }

//       // =====================================================
//       // CREATE SINGLE PALLET WITH ALL ITEMS
//       // =====================================================

//       // Calculate total pallet height (base + stacked items)
//       const palletBaseHeight = 6; // inches for pallet itself
//       const totalPalletHeight = Math.min(
//         palletBaseHeight + maxItemHeight,
//         MAX_PALLET_HEIGHT
//       );

//       // Use the LOWEST freight class among all items (better rate)
//       const bestFreightClass = allShippedItems.reduce((lowest, item) => {
//         const itemClass = parseInt(item.commodityClass);
//         const currentLowest = parseInt(lowest);
//         return itemClass < currentLowest ? item.commodityClass : lowest;
//       }, "500");

//       console.log("🟢 SINGLE PALLET SUMMARY:");
//       console.log(`   Total items: ${allShippedItems.length} product types`);
//       console.log(`   Total weight: ${totalPalletWeight.toFixed(2)} lbs`);
//       console.log(`   Pallet height: ${totalPalletHeight} inches`);
//       console.log(`   Best freight class: ${bestFreightClass}`);

//       // Create the single handling unit
//       const allHandlingUnits = [
//         {
//           quantity: 1, // ONE PALLET
//           packagingType: "PLT",
//           isMixedClass: allShippedItems.length > 1, // true if multiple product types
//           isStackable: true,
//           billedDimension: {
//             length: { value: STANDARD_PALLET_LENGTH, unit: "IN" },
//             width: { value: STANDARD_PALLET_WIDTH, unit: "IN" },
//             height: { value: Math.ceil(totalPalletHeight), unit: "IN" },
//           },
//           weight: {
//             value: Math.ceil(totalPalletWeight),
//             unit: "LB",
//           },
//           shippedItemList: allShippedItems, // All product types on one pallet
//         },
//       ];

//       const speedshipRequest = {
//         request: {
//           productType: "LTL",
//           shipment: {
//             shipmentDate: new Date()
//               .toISOString()
//               .slice(0, 19)
//               .replace("T", " "),

//             originAddress: {
//               address: {
//                 addressLineList: [rate.origin?.address1 || "123 Main St"], // Use actual address
//                 locality: rate.origin?.city || "Los Angeles",
//                 region: rate.origin?.province || "CA",
//                 postalCode: origin || "90001", // Use calculated origin
//                 countryCode: rate.origin?.country || "US",
//                 companyName: rate.origin?.company || "Shipper",
//                 phone: rate.origin?.phone || "+18007587447",
//                 contactList: [
//                   {
//                     firstName: rate.origin?.first_name || "John",
//                     lastName: rate.origin?.last_name || "Smith",
//                     phone: rate.origin?.phone || "+18007587447",
//                     contactType: "SENDER",
//                   },
//                 ],
//               },
//               locationType: "COMMERCIAL",
//             },

//             destinationAddress: {
//               address: {
//                 addressLineList: [destination.address1 || "456 Broadway"],
//                 locality: destination.city || "SALT LAKE CITY",
//                 region: destination.province || "UT",
//                 postalCode: destination.postal_code || "84047",
//                 countryCode: destination.country || "US",
//                 companyName: destination.company || "Recipient",
//                 phone: destination.phone || "+18669987447",
//                 contactList: [
//                   {
//                     firstName: destination.first_name || "Mary",
//                     lastName: destination.last_name || "Jones",
//                     phone: destination.phone || "+18669987447",
//                     contactType: "RECEIVER",
//                   },
//                 ],
//               },
//               locationType: "COMMERCIAL",
//             },

//             // handlingUnitList: freightItems.map((item, index) => {
//             //   return {
//             //     billedDimension: {
//             //       length: { value: 96, unit: "IN" },
//             //       width: { value: 48, unit: "IN" },
//             //       height: { value: 30, unit: "IN" },
//             //     },

//             //     isMixedClass: false,
//             //     isStackable: false,
//             //     // marksAndNumbers: null,
//             //     packagingType: "PLT",
//             //     quantity: 1,

//             //     shippedItemList: [
//             //       {
//             //         // commodityClass: "55",
//             //         commodityClass: calculateFreightClass(
//             //           totalWeight,
//             //           calculateVolume({
//             //             length:96,
//             //             width: 48,
//             //             height: 30,
//             //           })
//             //         ),
//             //         // commodityDescription: "12121",
//             //         commodityDescription: "Rubber tiles",
//             //         // commodityType: null,
//             //         dimensions: {
//             //           length: {
//             //             value: 96,
//             //             unit: "IN",
//             //           },
//             //           width: {
//             //             value: 48,
//             //             unit: "IN",
//             //           },
//             //           height: {
//             //             value: 30,
//             //             unit: "IN",
//             //           },
//             //         },
//             //         isHazMat: false,
//             //         // hazMatItemInfo: {
//             //         //   hazIdentificationNbr: "UN1234",
//             //         //   hazProperShippingName: "Proper Commodity Name",
//             //         //   hazClassType: "1.1A, 6.1",
//             //         //   hazPackingGroupType: "PGI",
//             //         //   hazEmergencyPhoneNbr: "2132342312",
//             //         //   hazEmergencyName: "Emergency Contact",
//             //         //   hazPlacardRequiredFlag: false,
//             //         //   hazPlacardDetails: "Placard Details",
//             //         //   hazERR: "ERR Number",
//             //         //   hazFlashpointTemperature: {
//             //         //     value: 1,
//             //         //     unit: "F",
//             //         //   },
//             //         //   hazAdditionalDetails: "Additional Haz Details",
//             //         // },
//             //         name: "",
//             //         NMFCDescription: null,
//             //         NMFCNbr: null,
//             //         packagingType: "",
//             //         quantity: 1,
//             //         weight: {
//             //           value: Math.ceil(totalWeight),
//             //           unit: "LB",
//             //         },
//             //       },
//             //     ],
//             //     sortAndSegregateFlag: true,
//             //     weight: {
//             //       value: Math.ceil(totalWeight),
//             //       unit: "LB",
//             //     },
//             //   };
//             // }),

//             // ------------------------- Rolls-Pallet-------------------------------------------------------------------
//             // handlingUnitList:
//             //   canUseRoll === "PLT"
//             //     ? [
//             //         {
//             //           billedDimension: {
//             //             length: { value: STANDARD_PALLET_LENGTH, unit: "IN" }, // 48"
//             //             width: { value: STANDARD_PALLET_WIDTH, unit: "IN" }, // 40"
//             //             height: { value: Math.ceil(palletHeight), unit: "IN" }, // Dynamic!
//             //           },

//             //           isMixedClass: false,
//             //           isStackable: false,
//             //           packagingType: "PLT",
//             //           quantity: palletCount, // Dynamic number of pallets

//             //           shippedItemList: [
//             //             {
//             //               commodityClass: calculateFreightClass(
//             //                 weightPerPallet,
//             //                 calculateVolume({
//             //                   length: STANDARD_PALLET_LENGTH,
//             //                   width: STANDARD_PALLET_WIDTH,
//             //                   height: palletHeight,
//             //                 })
//             //               ),
//             //               commodityDescription: "Rubber flooring rolls",
//             //               dimensions: {
//             //                 length: {
//             //                   value: STANDARD_PALLET_LENGTH,
//             //                   unit: "IN",
//             //                 },
//             //                 width: { value: STANDARD_PALLET_WIDTH, unit: "IN" },
//             //                 height: {
//             //                   value: Math.ceil(palletHeight),
//             //                   unit: "IN",
//             //                 },
//             //               },
//             //               isHazMat: false,
//             //               quantity: rollsPerPallet, // Dynamic rolls per pallet
//             //               weight: {
//             //                 value: Math.ceil(weightPerPallet), // Dynamic weight per pallet
//             //                 unit: "LB",
//             //               },
//             //             },
//             //           ],

//             //           weight: {
//             //             value: Math.ceil(weightPerPallet),
//             //             unit: "LB",
//             //           },
//             //         },
//             //       ]
//             //     : [
//             //         {
//             //           packagingType: "ROLL",

//             //           // Number of loose rolls
//             //           quantity: quantity,

//             //           isMixedClass: false,
//             //           isStackable: false,

//             //           billedDimension: {
//             //             length: { value: rollWidth, unit: "IN" },
//             //             width: { value: rollDiameter, unit: "IN" },
//             //             height: { value: rollDiameter, unit: "IN" },
//             //           },

//             //           // Total weight of all rolls
//             //           weight: {
//             //             value: Math.ceil(weightPerRoll * totalQuantity),
//             //             unit: "LB",
//             //           },

//             //           shippedItemList: [
//             //             {
//             //               commodityClass: calculateFreightClass(
//             //                 weightPerRoll,
//             //                 calculateVolume({
//             //                   length: rollWidth, // inches
//             //                   width: rollDiameter, // inches
//             //                   height: rollDiameter, // inches
//             //                 })
//             //               ),

//             //               commodityDescription: "Rubber flooring roll",
//             //               isHazMat: false,

//             //               // Number of rolls
//             //               quantity: quantity,

//             //               // Physical size of ONE roll
//             //               dimensions: {
//             //                 length: { value: rollWidth, unit: "IN" },
//             //                 width: { value: rollDiameter, unit: "IN" },
//             //                 height: { value: rollDiameter, unit: "IN" },
//             //               },

//             //               // Weight of ONE roll
//             //               weight: {
//             //                 value: Math.ceil(weightPerRoll),
//             //                 unit: "LB",
//             //               },
//             //             },
//             //           ],
//             //         },
//             //       ],

//             // totalHandlingUnitCount:
//             //   canUseRoll === "PLT" ? palletCount : quantity,
//             // totalWeight: {
//             //   value: Math.ceil(quantity * weightPerRoll),
//             //   unit: "LB",
//             // },
//             // -----------------------------------------------------------------------------------------------------------
//             // handlingUnitList: [
//             //   {
//             //     billedDimension: {
//             //       length: { value: palletWidth || 48, unit: "IN" },
//             //       width: { value: palletWidth || 48, unit: "IN" },
//             //       height: { value: palletHeight || 20, unit: "IN" },
//             //     },

//             //     isMixedClass: false,
//             //     isStackable: false,
//             //     // marksAndNumbers: null,
//             //     packagingType: "PLT",
//             //     quantity: palletCount,

//             //     shippedItemList: [
//             //       {
//             //         // commodityClass: "55",
//             //         commodityClass: calculateFreightClass(
//             //           weightPerRoll * rollsPerPallet,
//             //           calculateVolume({
//             //             length: palletWidth || 48,
//             //             width: palletWidth || 48,
//             //             height: palletHeight || 20,
//             //           })
//             //         ),
//             //         // commodityDescription: "12121",
//             //         commodityDescription: "Rubber flooring rolls",
//             //         // commodityType: null,
//             //         dimensions: {
//             //           length: {
//             //             value: palletWidth || 48,
//             //             unit: "IN",
//             //           },
//             //           width: {
//             //             value: palletWidth || 48,
//             //             unit: "IN",
//             //           },
//             //           height: {
//             //             value: palletHeight || 20,
//             //             unit: "IN",
//             //           },
//             //         },
//             //         isHazMat: false,
//             //         // hazMatItemInfo: {
//             //         //   hazIdentificationNbr: "UN1234",
//             //         //   hazProperShippingName: "Proper Commodity Name",
//             //         //   hazClassType: "1.1A, 6.1",
//             //         //   hazPackingGroupType: "PGI",
//             //         //   hazEmergencyPhoneNbr: "2132342312",
//             //         //   hazEmergencyName: "Emergency Contact",
//             //         //   hazPlacardRequiredFlag: false,
//             //         //   hazPlacardDetails: "Placard Details",
//             //         //   hazERR: "ERR Number",
//             //         //   hazFlashpointTemperature: {
//             //         //     value: 1,
//             //         //     unit: "F",
//             //         //   },
//             //         //   hazAdditionalDetails: "Additional Haz Details",
//             //         // },
//             //         name: "",
//             //         NMFCDescription: null,
//             //         NMFCNbr: null,
//             //         packagingType: "",
//             //         quantity: rollsPerPallet,
//             //         weight: {
//             //           value: Math.ceil(weightPerRoll * rollsPerPallet),
//             //           unit: "LB",
//             //         },
//             //       },
//             //     ],
//             //     sortAndSegregateFlag: true,
//             //     weight: {
//             //       value: Math.ceil(weightPerRoll * rollsPerPallet),
//             //       unit: "LB",
//             //     },
//             //   },
//             // ],

//             // totalHandlingUnitCount: palletCount,
//             // totalWeight: {
//             //   value: quantity * weightPerRoll, // Use calculated total weight
//             //   unit: "LB",
//             // },

//             // ------------------------ fot tiles -------------------------------------------------------------------------------------------
//             // handlingUnitList: [
//             //   {
//             //     quantity: cartonCount, // ✅ 4 cartons
//             //     packagingType: "CARTON",
//             //     isMixedClass: false,
//             //     isStackable: true,

//             //     billedDimension: {
//             //       length: { value: 24, unit: "IN" },
//             //       width: { value: 24, unit: "IN" },
//             //       height: { value: 12, unit: "IN" },
//             //     },

//             //     weight: {
//             //       value: Math.ceil(cartonWeight), // ✅ 78 lbs PER CARTON
//             //       unit: "LB",
//             //     },

//             //     shippedItemList: [
//             //       {
//             //         quantity: tilesPerCarton,
//             //         packagingType: "CARTON",
//             //         commodityDescription: "Rubber interlocking tiles",
//             //         commodityClass: calculateFreightClass(
//             //           totalWeight,
//             //           calculateVolume({
//             //             length: 24,
//             //             width: 24,
//             //             height: 12,
//             //           })
//             //         ),
//             //         isHazMat: false,

//             //         dimensions: {
//             //           length: { value: 24, unit: "IN" },
//             //           width: { value: 24, unit: "IN" },
//             //           height: { value: 12, unit: "IN" },
//             //         },

//             //         weight: {
//             //           value: Math.ceil(cartonWeight),
//             //           unit: "LB",
//             //         },
//             //       },
//             //     ],
//             //   },
//             // ],
//             // totalHandlingUnitCount: cartonCount, // 4

//             // totalWeight: {
//             //   value: Math.ceil(cartonCount * cartonWeight), // 312
//             //   unit: "LB",
//             // },
//             // handlingUnitList: [
//             //   {
//             //     quantity: cartonCount, // Could be 1 for partial carton
//             //     packagingType: "CARTON",
//             //     isMixedClass: false,
//             //     isStackable: true,

//             //     billedDimension: {
//             //       length: {
//             //         value: cartonSpecs.cartonDimensions.length,
//             //         unit: "IN",
//             //       },
//             //       width: {
//             //         value: cartonSpecs.cartonDimensions.width,
//             //         unit: "IN",
//             //       },
//             //       height: {
//             //         value: cartonSpecs.cartonDimensions.height,
//             //         unit: "IN",
//             //       },
//             //     },

//             //     weight: {
//             //       value: Math.ceil(cartonWeight), // Weight adjusts for partial cartons
//             //       unit: "LB",
//             //     },

//             //     shippedItemList: [
//             //       {
//             //         quantity: tilesInLastCarton, // Actual tiles in carton (2 if ordering 2)
//             //         packagingType: "CARTON",
//             //         commodityDescription: "Rubber interlocking tiles",
//             //         commodityClass: calculateFreightClass(
//             //           cartonWeight,
//             //           calculateVolume(cartonSpecs.cartonDimensions)
//             //         ),
//             //         isHazMat: false,

//             //         dimensions: {
//             //           length: {
//             //             value: cartonSpecs.cartonDimensions.length,
//             //             unit: "IN",
//             //           },
//             //           width: {
//             //             value: cartonSpecs.cartonDimensions.width,
//             //             unit: "IN",
//             //           },
//             //           height: {
//             //             value: cartonSpecs.cartonDimensions.height,
//             //             unit: "IN",
//             //           },
//             //         },

//             //         weight: {
//             //           value: Math.ceil(cartonWeight),
//             //           unit: "LB",
//             //         },
//             //       },
//             //     ],
//             //   },
//             // ],

//             // totalHandlingUnitCount: cartonCount,
//             // totalWeight: {
//             //   value: Math.ceil(totalTiles * tileWeight), // Total weight of ALL tiles
//             //   unit: "LB",
//             // },
//             // --------------------------------------------------------------------------------------------------------------------------------

//             // -----------------------------------------------------final working--------------------------------------------------------------
//             // handlingUnitList:
//             //   productType === "TILE"
//             //     ? [
//             //         {
//             //           quantity: cartonCount,
//             //           packagingType: "CARTON",
//             //           isMixedClass: false,
//             //           isStackable: true,
//             //           billedDimension: {
//             //             length: {
//             //               value: cartonSpecs.cartonDimensions.length,
//             //               unit: "IN",
//             //             },
//             //             width: {
//             //               value: cartonSpecs.cartonDimensions.width,
//             //               unit: "IN",
//             //             },
//             //             height: {
//             //               value: cartonSpecs.cartonDimensions.height,
//             //               unit: "IN",
//             //             },
//             //           },
//             //           weight: {
//             //             value: Math.ceil(cartonWeight),
//             //             unit: "LB",
//             //           },
//             //           shippedItemList: [
//             //             {
//             //               quantity: tilesInLastCarton,
//             //               packagingType: "CARTON",
//             //               commodityDescription: "Rubber interlocking tiles",
//             //               commodityClass: calculateFreightClass(
//             //                 cartonWeight,
//             //                 calculateVolume(cartonSpecs.cartonDimensions)
//             //               ),
//             //               isHazMat: false,
//             //               dimensions: {
//             //                 length: {
//             //                   value: cartonSpecs.cartonDimensions.length,
//             //                   unit: "IN",
//             //                 },
//             //                 width: {
//             //                   value: cartonSpecs.cartonDimensions.width,
//             //                   unit: "IN",
//             //                 },
//             //                 height: {
//             //                   value: cartonSpecs.cartonDimensions.height,
//             //                   unit: "IN",
//             //                 },
//             //               },
//             //               weight: {
//             //                 value: Math.ceil(cartonWeight),
//             //                 unit: "LB",
//             //               },
//             //             },
//             //           ],
//             //         },
//             //       ]
//             //     : productType === "MAT"
//             //     ? [
//             //         {
//             //           quantity: matCartonCount, // Dynamic carton count
//             //           packagingType: "CARTON",
//             //           isMixedClass: false,
//             //           isStackable: true,
//             //           billedDimension: {
//             //             length: {
//             //               value: matCartonSpecs.cartonDimensions.length,
//             //               unit: "IN",
//             //             },
//             //             width: {
//             //               value: matCartonSpecs.cartonDimensions.width,
//             //               unit: "IN",
//             //             },
//             //             height: {
//             //               value: matCartonSpecs.cartonDimensions.height,
//             //               unit: "IN",
//             //             },
//             //           },
//             //           weight: {
//             //             value: Math.ceil(matCartonWeight),
//             //             unit: "LB",
//             //           },
//             //           shippedItemList: [
//             //             {
//             //               quantity: matsInLastCarton, // Dynamic mats per carton
//             //               packagingType: "CARTON",
//             //               commodityDescription: "Rubber floor mats",
//             //               commodityClass: calculateFreightClass(
//             //                 matCartonWeight,
//             //                 calculateVolume(matCartonSpecs.cartonDimensions)
//             //               ),
//             //               isHazMat: false,
//             //               dimensions: {
//             //                 length: {
//             //                   value: matCartonSpecs.cartonDimensions.length,
//             //                   unit: "IN",
//             //                 },
//             //                 width: {
//             //                   value: matCartonSpecs.cartonDimensions.width,
//             //                   unit: "IN",
//             //                 },
//             //                 height: {
//             //                   value: matCartonSpecs.cartonDimensions.height,
//             //                   unit: "IN",
//             //                 },
//             //               },
//             //               weight: {
//             //                 value: Math.ceil(matCartonWeight),
//             //                 unit: "LB",
//             //               },
//             //             },
//             //           ],
//             //         },
//             //       ]
//             //     : productType === "ROLL"
//             //     ? canUseRoll === "PLT"
//             //       ? [
//             //           {
//             //             billedDimension: {
//             //               length: {
//             //                 value: STANDARD_PALLET_LENGTH,
//             //                 unit: "IN",
//             //               }, // 48"
//             //               width: {
//             //                 value: STANDARD_PALLET_WIDTH,
//             //                 unit: "IN",
//             //               }, // 40"
//             //               height: {
//             //                 value: Math.ceil(palletHeight),
//             //                 unit: "IN",
//             //               }, // Dynamic!
//             //             },

//             //             isMixedClass: false,
//             //             isStackable: false,
//             //             packagingType: "PLT",
//             //             quantity: palletCount, // Dynamic number of pallets

//             //             shippedItemList: [
//             //               {
//             //                 commodityClass: calculateFreightClass(
//             //                   weightPerPallet,
//             //                   calculateVolume({
//             //                     length: STANDARD_PALLET_LENGTH,
//             //                     width: STANDARD_PALLET_WIDTH,
//             //                     height: palletHeight,
//             //                   })
//             //                 ),
//             //                 commodityDescription: "Rubber flooring rolls",
//             //                 dimensions: {
//             //                   length: {
//             //                     value: STANDARD_PALLET_LENGTH,
//             //                     unit: "IN",
//             //                   },
//             //                   width: {
//             //                     value: STANDARD_PALLET_WIDTH,
//             //                     unit: "IN",
//             //                   },
//             //                   height: {
//             //                     value: Math.ceil(palletHeight),
//             //                     unit: "IN",
//             //                   },
//             //                 },
//             //                 isHazMat: false,
//             //                 quantity: rollsPerPallet, // Dynamic rolls per pallet
//             //                 weight: {
//             //                   value: Math.ceil(weightPerPallet), // Dynamic weight per pallet
//             //                   unit: "LB",
//             //                 },
//             //               },
//             //             ],

//             //             weight: {
//             //               value: Math.ceil(weightPerPallet),
//             //               unit: "LB",
//             //             },
//             //           },
//             //         ]
//             //       : [
//             //           {
//             //             packagingType: "ROLL",

//             //             // Number of loose rolls
//             //             quantity: quantity,

//             //             isMixedClass: false,
//             //             isStackable: false,

//             //             billedDimension: {
//             //               length: { value: rollWidth, unit: "IN" },
//             //               width: { value: rollDiameter, unit: "IN" },
//             //               height: { value: rollDiameter, unit: "IN" },
//             //             },

//             //             // Total weight of all rolls
//             //             weight: {
//             //               value: Math.ceil(weightPerRoll * totalQuantity),
//             //               unit: "LB",
//             //             },

//             //             shippedItemList: [
//             //               {
//             //                 commodityClass: calculateFreightClass(
//             //                   weightPerRoll,
//             //                   calculateVolume({
//             //                     length: rollWidth, // inches
//             //                     width: rollDiameter, // inches
//             //                     height: rollDiameter, // inches
//             //                   })
//             //                 ),

//             //                 commodityDescription: "Rubber flooring roll",
//             //                 isHazMat: false,

//             //                 // Number of rolls
//             //                 quantity: quantity,

//             //                 // Physical size of ONE roll
//             //                 dimensions: {
//             //                   length: { value: rollWidth, unit: "IN" },
//             //                   width: { value: rollDiameter, unit: "IN" },
//             //                   height: { value: rollDiameter, unit: "IN" },
//             //                 },

//             //                 // Weight of ONE roll
//             //                 weight: {
//             //                   value: Math.ceil(weightPerRoll),
//             //                   unit: "LB",
//             //                 },
//             //               },
//             //             ],
//             //           },
//             //         ]
//             //     : [], // Unknown product type

//             // totalHandlingUnitCount:
//             //   productType === "TILE"
//             //     ? cartonCount
//             //     : productType === "MAT"
//             //     ? matCartonCount
//             //     : productType === "ROLL"
//             //     ? canUseRoll === "PLT"
//             //       ? palletCount
//             //       : quantity
//             //     : 0,

//             // totalWeight: {
//             //   value: Math.ceil(totalWeight),
//             //   unit: "LB",
//             // },
//             handlingUnitList: allHandlingUnits, // ✅ Use combined handling units

//             // totalHandlingUnitCount: allHandlingUnits.reduce(
//             //   (sum, unit) => sum + unit.quantity,
//             //   0
//             // ),
//             totalHandlingUnitCount: 1,

//             totalWeight: {
//               // value: Math.ceil(totalWeight),
//               value: Math.ceil(totalPalletWeight),
//               unit: "LB",
//             },

//             // ------------------------------------------------------------------------------------------------------------------------------

//             description: "Freight shipment",
//             returnLabelFlag: false,
//             residentialDeliveryFlag: false,
//             residentialPickupFlag: false,
//             isSignatureRequired: false,
//             // insuranceRequestFlag: true,
//             // insuredItemConditions: "USED",
//             insuredCommodityCategory: "400",
//             insuredMarksNumbers: "1234A",
//             totalDeclaredValue: {
//               value: "0",
//               unit: "USD",
//             },
//             // handlingCharge: {
//             //   value: 50,
//             //   unit: "PERCENT",
//             // },
//             // appointmentDeliveryFlag: true,
//             holdAtTerminalFlag: false,
//             insideDeliveryFlag: false,
//             insidePickupFlag: false,
//             carrierTerminalPickupFlag: false,
//             liftgateDeliveryFlag: false,
//             liftgatePickupFlag: false,
//             notifyBeforeDeliveryFlag: false,
//             protectionFromColdFlag: false,
//             // sortAndSegregateFlag: false,
//             pickupSpecialInstructions:
//               "this is a note in initial shopflow regarding pickup",
//             deliverySpecialInstructions:
//               "This is a note in initial shopflow regarding delivery",
//             tradeshowDeliveryFlag: false,
//             tradeshowDeliveryName: "",
//             tradeshowPickupFlag: false,
//             tradeshowPickupName: "",
//           },
//         },
//         correlationId: requestId, // Use your generated requestId
//       };

//       //         const speedshipRequest = {
//       //   accountNumber: "12345678",

//       //   shipment: {
//       //     mode: "LTL",

//       //     origin: {
//       //       city: rate.origin.city,
//       //       state: rate.origin.province,
//       //       postalCode: rate.origin.postal_code,
//       //       countryCode: rate.origin.country || "US",
//       //       residential: false
//       //     },

//       //     destination: {
//       //       city: destination.city,
//       //       state: destination.province,
//       //       postalCode: destination.postal_code,
//       //       countryCode: destination.country || "US",
//       //       residential: false
//       //     },

//       //     handlingUnits: freightItems.map((item: any) => {
//       //   const weight = Math.max(Number(item.weight) || 0, 100);

//       //   const length = Number(item.length) || 48;
//       //   const width  = Number(item.width)  || 40;
//       //   const height = Number(item.height) || 48;

//       //   const volume = calculateVolume({ length, width, height });

//       //   return {
//       //     type: "PALLET",
//       //     quantity: 1,

//       //     weight: {
//       //       value: weight,
//       //       unit: "LB"
//       //     },

//       //     dimensions: {

//       //       length,
//       //       width,
//       //       height,
//       //       unit: "IN"
//       //     },

//       //     freightClass: calculateFreightClass(weight, volume)
//       //   };
//       // })

//       //   },

//       //   accessorials: {
//       //     liftgateDelivery: false,
//       //     notifyBeforeDelivery: false
//       //   }
//       // };

//       console.log(
//         "🟢 Request Payload=============",
//         JSON.stringify(speedshipRequest, null, 2)
//       );

//       // Make API call to Speedship
//       const response = await axios.post(
//         "https://speedship.staging-wwex.com/svc/shopFlow",
//         speedshipRequest,
//         {
//           headers: {
//             Authorization:
//               "Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ik1EVTBSRUU0TmpFMU5ERTBORUkwTTBGRE5qUXlOemt3TmpSR05VVkZSREpFUlRJM01FUXpPQSJ9.eyJodHRwczovL3NwZWVkc2hpcC53d2V4LmNvbS9wcmltYXJ5Um9sZSI6IkN1c3RvbWVyX0FQSV9NMk0iLCJodHRwczovL3NwZWVkc2hpcC53d2V4LmNvbS9wcmltYXJ5TmFtZXNwYWNlIjoic3Mud3dleC5jdXN0b21lci5XMDAwOTA3MTU2IiwiaHR0cHM6Ly9zcGVlZHNoaXAud3dleC5jb20vc3NVc2VySWQiOiI4aDk0VENwME42ZmcwOWlwUDN5eUptZlBQdjVsMW1DRCIsImh0dHBzOi8vc3BlZWRzaGlwLnd3ZXguY29tL2FwcFR5cGUiOiJNMk0iLCJodHRwczovL3NwZWVkc2hpcC53d2V4LmNvbS9hcHBEb21haW4iOiJXV0VYIiwiaHR0cHM6Ly9zcGVlZHNoaXAud3dleC5jb20vZG9tYWluIjoid3dleCIsImh0dHBzOi8vc3BlZWRzaGlwLnd3ZXguY29tL2FwaVBsYW4iOiJzbWFsbCIsImh0dHBzOi8vc3BlZWRzaGlwLnd3ZXguY29tL2VtYWlsIjoiOGg5NFRDcDBONmZnMDlpcFAzeXlKbWZQUHY1bDFtQ0QiLCJpc3MiOiJodHRwczovL2F1dGguc3RhZ2luZy13d2V4LmNvbS8iLCJzdWIiOiI4aDk0VENwME42ZmcwOWlwUDN5eUptZlBQdjVsMW1DREBjbGllbnRzIiwiYXVkIjoic3RhZ2luZy13d2V4LWFwaWciLCJpYXQiOjE3Njc5MzU1NDcsImV4cCI6MTc2ODAyMTk0NywiZ3R5IjoiY2xpZW50LWNyZWRlbnRpYWxzIiwiYXpwIjoiOGg5NFRDcDBONmZnMDlpcFAzeXlKbWZQUHY1bDFtQ0QifQ.RGOEd9ROUxQdpMYWmeNxEWmxUGE-3HOefcRiKvRSKYThxamXri9VTpP_kLFgCmk6oLzkNpJXHB8-GsgjlHhBwZLevWYXEGaIoUjLmi8hskZz-HHy-B-VyBm1eptVI8hjFaUv0Yg9k6wn28UZvBznTv_N7OnYw17bYPcVYYjuyNYNJOa0xrmz740paO2HcTkN2Mj1fuxX3TwKmlxlvwLKUeeRXQsLw4qCVNjsviq0qZZvPjynEO7UpN14u4alPpePte9TxgS2L_wLezw_rqEE-jA-LL4jBdEVATdJUiIVylvfYUEM9jQf2oxuLk7HeZj5Hzfml4YHf3Xp-om5PBhrPA",
//             "Content-Type": "application/json",
//           },
//           timeout: 20000, // 6 second timeout
//         }
//       );

//       res = response.data;
//       const speedshipResponseTime = Date.now() - speedshipStartTime;

//       const offerList = response.data?.response?.offerList || [];

//       let selectedOffer = null;

//       if (offerList.length > 0) {
//         selectedOffer = offerList
//           .filter((o: any) => o.totalOfferPrice?.value)
//           .sort(
//             (a: any, b: any) =>
//               Number(a.totalOfferPrice.value) - Number(b.totalOfferPrice.value)
//           )[0];
//       }

//       if (!selectedOffer) {
//         throw new Error("No valid LTL offers returned");
//       }

//       // Parse Speedship API response based on the actual structure
//       let speedshipRate = 0;
//       let transitDays = 5;
//       let serviceLevel = "Standard Freight";
//       let quoteId = `SPEEDSHIP-${Date.now()}`;
//       let offerId = "";
//       let productTransactionId = "";

//       // // Try to extract rate from various possible response structures
//       // if (response.data) {
//       //   // Adjust these based on actual Speedship API response structure
//       //   if (response.data.quote) {
//       //     speedshipRate = parseFloat(response.data.quote.totalCharge || 0);
//       //     transitDays = parseInt(response.data.quote.transitTime || 5);
//       //     serviceLevel = response.data.quote.serviceLevel || "Standard Freight";
//       //     quoteId = response.data.quoteId || quoteId;
//       //   } else if (response.data.totalCharge) {
//       //     speedshipRate = parseFloat(response.data.totalCharge || 0);
//       //     transitDays = parseInt(response.data.transitTime || 5);
//       //     serviceLevel = response.data.serviceLevel || "Standard Freight";
//       //     quoteId = response.data.quoteId || quoteId;
//       //   } else if (response.data.rate) {
//       //     speedshipRate = parseFloat(response.data.rate || 0);
//       //     transitDays = parseInt(response.data.transitDays || 5);
//       //     serviceLevel = response.data.serviceLevel || "Standard Freight";
//       //     quoteId = response.data.quoteId || quoteId;
//       //   }
//       // }

//       if (
//         response.data?.response?.offerList &&
//         response.data.response.offerList.length > 0
//       ) {
//         // Get the first (usually best) offer
//         const bestOffer = response.data.response.offerList[0];

//         // Extract essential IDs for future quote/booking
//         offerId = bestOffer.offerId || "";
//         productTransactionId = bestOffer.productTransactionId || "";

//         // Extract pricing from offeredProductList
//         // if (
//         //   bestOffer.offeredProductList &&
//         //   bestOffer.offeredProductList.length > 0
//         // ) {
//         //   const product = bestOffer.offeredProductList[0];

//         //   // Get the offer price
//         //   if (product.offerPrice?.value) {
//         //     speedshipRate = parseFloat(product.offerPrice.value);
//         //   }

//         //   // Extract service details
//         //   if (product.serviceDetail?.name) {
//         //     serviceLevel = product.serviceDetail.name;
//         //   }

//         //   // Extract transit time information
//         //   if (product.shopRQShipment?.timeInTransit?.transitDays) {
//         //     transitDays = parseInt(
//         //       product.shopRQShipment.timeInTransit.transitDays
//         //     );
//         //   }

//         //   // Get carrier service level
//         //   if (product.shopRQShipment?.timeInTransit?.serviceLevel) {
//         //     serviceLevel = product.shopRQShipment.timeInTransit.serviceLevel;
//         //   }

//         //   // Extract SCAC code (carrier identifier)
//         //   if (product.shopRQShipment?.timeInTransit?.scac) {
//         //     const scac = product.shopRQShipment.timeInTransit.scac;
//         //     serviceLevel = `${scac} - ${serviceLevel}`;
//         //   }
//         // }
//         const product = selectedOffer.offeredProductList[0];

//         speedshipRate = Number(product.offerPrice.value);
//         transitDays =
//           Number(product.shopRQShipment?.timeInTransit?.transitDays) || 5;

//         const scac = product.shopRQShipment?.timeInTransit?.scac || "LTL";

//         serviceLevel =
//           product.shopRQShipment?.timeInTransit?.serviceLevel || "Freight";

//         // Get total offer price as fallback
//         // if (speedshipRate === 0 && bestOffer.totalOfferPrice?.value) {
//         //   speedshipRate = parseFloat(bestOffer.totalOfferPrice.value);
//         // }

//         console.log("🟢 Parsed Rate Details:");
//         console.log(`   - Rate: $${speedshipRate}`);
//         console.log(`   - Transit Days: ${transitDays}`);
//         console.log(`   - Service Level: ${serviceLevel}`);
//         console.log(`   - Offer ID: ${offerId}`);
//         console.log(`   - Product Transaction ID: ${productTransactionId}`);
//       }

//       // Log Speedship response with all important details
//       await logWWEXResponse({
//         requestId,
//         quoteId: quoteId,
//         rate: speedshipRate,
//         transitDays,
//         serviceLevel: `Speedship ${serviceLevel}`,
//         responseTimeMs: speedshipResponseTime,
//         rawResponse: response.data,
//       });

//       // Cache the rate if valid
//       if (speedshipRate > 0) {
//         await cacheRate({
//           cacheKey,
//           origin,
//           destination: destination.postal_code,
//           weightMin: Math.floor(totalWeight / 100) * 100,
//           weightMax: Math.ceil(totalWeight / 100) * 100,
//           rate: speedshipRate,
//           transitDays,
//           expiresInMinutes: 60,
//         });

//         // Add Speedship rate to response
//         rates.push({
//           service_name: `Speedship Freight - ${serviceLevel}`,
//           service_code: "SPEEDSHIP_FREIGHT",
//           total_price: (speedshipRate * 100).toString(), // Convert to cents for Shopify
//           currency: "USD",
//           description: `Estimated ${transitDays} business days`,
//           min_delivery_date: getDeliveryDate(transitDays).toISOString(),
//           max_delivery_date: getDeliveryDate(transitDays + 2).toISOString(),
//         });

//         console.log("🟢 Successfully added Speedship rate to Shopify response");
//       } else {
//         console.warn("🔴 Speedship API returned invalid rate (0 or undefined)");
//       }
//     } catch (error: any) {
//       const speedshipResponseTime = Date.now() - speedshipStartTime;
//       console.error("🔴 Speedship API Error:", error.message);
//       if (error.response) {
//         console.error("🔴 Error Response:", error.response.data);
//         console.error("🔴 Status:", error.response.status);
//       }

//       // Log error
//       await logError("SPEEDSHIP_API_ERROR", error.message, error.stack, {
//         responseData: error.response?.data,
//         statusCode: error.response?.status,
//       });

//       // Use fallback rate calculation
//       const totalWeight = freightItems.reduce(
//         (sum, item) => sum + item.totalWeight,
//         0
//       );

//       const baseRate = 150;
//       const perLbRate = 0.5;
//       const estimatedRate = baseRate + totalWeight * perLbRate;

//       rates.push({
//         service_name: "Speedship Freight Shipping (Estimated Fallback)",
//         service_code: "SPEEDSHIP_FREIGHT_FALLBACK",
//         total_price: ((Math.round(estimatedRate * 100) / 100) * 100).toString(),
//         currency: "USD",
//         description: "Estimated 7 business days (Estimated Rate Fallback)",
//         min_delivery_date: getDeliveryDate(7).toISOString(),
//         max_delivery_date: getDeliveryDate(9).toISOString(),
//       });
//     }
//     // }

//     const totalProcessingTime = Date.now() - startTime;
//     console.log(
//       `🟢 Total processing time============= ${totalProcessingTime}ms`
//     );

//     // let quantity = 0;
//     // for (const item of items) {
//     //   if (
//     //     typeof item.properties === "object" &&
//     //     Object.keys(item.properties).length > 0
//     //   ) {
//     //     quantity += Number(item.properties.Quantity);
//     //   } else {
//     //     quantity += Number(item.quantity);
//     //   }
//     // }

//     // console.log(
//     //   "quantity=====================================================>",
//     //   quantity
//     // );

//     // if (quantity <= 5) {
//     //   console.log("🟢 Calling FedEx API for split shipment...");
//     //   const fedexClient = new FedExClient();
//     //   const fedexStartTime = Date.now();

//     //   const fedexResponse = await fedexClient.getSplitShipmentRate(rate);
//     //   // const fedexResponse = await fedexClient.getAllServiceRates(rate);

//     //   const fedexResponseTime = Date.now() - fedexStartTime;
//     //   console.log(`🟢 FedEx API response time: ${fedexResponseTime}ms`);

//     //   console.log(
//     //     "fedexResponse=======================================>",
//     //     fedexResponse
//     //   );
//     // }

//     // Return shipping rates to Shopify
//     // return NextResponse.json({ rates });
//     // return NextResponse.json({ res });
//     return NextResponse.json({ rates: [] });
//   } catch (error: any) {
//     console.error("🔴 Speedship Estimate Error:", error);

//     // Log error to database
//     await logError("SPEEDSHIP_ESTIMATE_ERROR", error.message, error.stack, {
//       requestBody: await request.text(),
//     });

//     // Return empty rates array on error (Shopify will use other shipping methods)
//     return NextResponse.json({
//       rates: [],
//     });
//   }
// }

// // Calculate delivery date based on transit days
// function getDeliveryDate(transitDays: number): Date {
//   const date = new Date();
//   let daysAdded = 0;

//   while (daysAdded < transitDays) {
//     date.setDate(date.getDate() + 1);
//     // Skip weekends
//     if (date.getDay() !== 0 && date.getDay() !== 6) {
//       daysAdded++;
//     }
//   }

//   return date;
// }

// // Handle GET requests (health check)
// export async function GET() {
//   return NextResponse.json({
//     status: "ok",
//     service: "Speedship Freight Estimate Service",
//     version: "1.0.0",
//     endpoint: "https://speedship.staging-wwex.com/svc/shopFlow",
//   });
// }

// import { NextRequest, NextResponse } from "next/server";
// import crypto from "crypto";
// import axios from "axios";
// import {
//   logRateRequest,
//   logWWEXResponse,
//   getCachedRate,
//   cacheRate,
//   logError,
// } from "@/lib/database";

// // Verify Shopify webhook signature
// function verifyShopifyWebhook(rawBody: string, hmacHeader: string): boolean {
//   const secret = process.env.SHOPIFY_API_SECRET || "";
//   const hash = crypto
//     .createHmac("sha256", secret)
//     .update(rawBody, "utf8")
//     .digest("base64");

//   return hash === hmacHeader;
// }

// // Generate cache key for rate caching
// function generateCacheKey(
//   origin: string,
//   destination: string,
//   weight: number
// ): string {
//   const weightBucket = Math.ceil(weight / 100) * 100;
//   return `speedship-${origin}-${destination}-${weightBucket}`;
// }

// type FreightMode = "LTL" | "FTL";

// function determineFreightMode(
//   totalWeight: number,
//   palletsNeeded: number
// ): FreightMode {
//   // FTL conditions (ANY of these force FTL)
//   if (
//     totalWeight > 20000 || // Weight threshold
//     palletsNeeded >= 8 // Trailer space threshold
//   ) {
//     return "FTL";
//   }

//   return "LTL";
// }

// // =====================================================
// // OPTIMIZED: Calculate freight class for CHEAPEST rate
// // =====================================================
// function calculateFreightClass(weight: number, volume: number): string {
//   if (volume === 0) return "70";

//   const density = weight / volume; // pounds per cubic foot

//   console.log(`📊 Density: ${density.toFixed(2)} lbs/cubic ft`);

//   // Lower class number = LOWER COST
//   if (density >= 50) {
//     console.log("💰 Class 50 - CHEAPEST (very dense)");
//     return "50";
//   }
//   if (density >= 35) {
//     console.log("💰 Class 55 - VERY CHEAP");
//     return "55";
//   }
//   if (density >= 30) {
//     console.log("💰 Class 60 - CHEAP");
//     return "60";
//   }
//   if (density >= 22.5) return "65";
//   if (density >= 15) return "70";
//   if (density >= 13.5) return "77.5";
//   if (density >= 12) return "85";
//   if (density >= 10.5) return "92.5";
//   if (density >= 9) return "100";
//   if (density >= 8) return "110";
//   if (density >= 7) return "125";
//   if (density >= 6) return "150";
//   if (density >= 5) return "175";
//   if (density >= 4) return "200";
//   if (density >= 3) return "250";
//   if (density >= 2) return "300";
//   if (density >= 1) return "400";
//   return "500";
// }

// // =====================================================
// // OPTIMIZED: Calculate volume for MAXIMUM density
// // =====================================================
// function calculateVolume(dimensions: {
//   length: number;
//   width: number;
//   height: number;
// }): number {
//   const volumeCubicInches =
//     dimensions.length * dimensions.width * dimensions.height;
//   return volumeCubicInches / 1728; // Convert to cubic feet
// }

// // =====================================================
// // NEW: Optimize pallet configuration for CHEAPEST rate
// // =====================================================
// function optimizeMultiPalletConfiguration(totalWeight: number) {
//   // KEY STRATEGY: Use MAXIMUM safe weight per pallet to MINIMIZE pallet count
//   // Fewer pallets = LOWER COST (WWEX charges per handling unit)

//   const MAX_SAFE_WEIGHT = 2500; // Industry standard maximum

//   // Calculate minimum pallets needed
//   const minPallets = Math.ceil(totalWeight / MAX_SAFE_WEIGHT);
//   const weightPerPallet = totalWeight / minPallets;

//   console.log("💰 MULTI-PALLET OPTIMIZATION:");
//   console.log(`   Total Weight: ${totalWeight} lbs`);
//   console.log(`   Optimized Pallets: ${minPallets} pallets`);
//   console.log(`   Weight per Pallet: ${weightPerPallet.toFixed(2)} lbs`);
//   console.log(
//     `   Savings vs 2000lb/pallet: ${
//       Math.ceil(totalWeight / 2000) - minPallets
//     } fewer pallets!`
//   );

//   return {
//     palletsNeeded: minPallets,
//     weightPerPallet: weightPerPallet,
//   };
// }

// // =====================================================
// // NEW: Optimize pallet height for MAXIMUM density
// // =====================================================
// function optimizePalletHeight(weightPerPallet: number): number {
//   // Strategy: Heavier loads = more compact = shorter height = higher density = lower class

//   if (weightPerPallet >= 2200) {
//     console.log('💰 Very heavy pallet - using 30" height for maximum density');
//     return 30; // Ultra-compact for maximum density
//   } else if (weightPerPallet >= 1800) {
//     console.log('💰 Heavy pallet - using 36" height for high density');
//     return 36; // High density
//   } else if (weightPerPallet >= 1400) {
//     console.log('💰 Medium-heavy pallet - using 42" height');
//     return 42; // Medium density
//   } else {
//     console.log('Standard 48" height');
//     return 48; // Standard
//   }
// }

// export async function POST(request: NextRequest) {
//   console.log("🟢 Speedship API - OPTIMIZED Multi-Pallet Rating");
//   const startTime = Date.now();

//   try {
//     const rawBody = await request.text();
//     const hmacHeader = request.headers.get("X-Shopify-Hmac-Sha256") || "";

//     console.log("rawBody===================================>",rawBody)

//     const body = JSON.parse(rawBody);
//     const requestId = `SPEEDSHIP-${Date.now()}-${Math.random()
//       .toString(36)
//       .substr(2, 9)}`;

//     console.log("🟢 Request ID:", requestId);

//     console.log("body==================================>",body.rate.items)

//     const { rate } = body;

//     if (!rate) {
//       return NextResponse.json({ rates: [] });
//     }

//     const origin = rate.origin?.postal_code || "";
//     const destination = rate.destination || {};
//     const items = rate.items || [];

//     // =====================================================
//     // STEP 1: Calculate Total Weight
//     // =====================================================
//     let totalWeight = 0;
//     let maxPerItemWeight = 0;

//     for (const item of items) {
//       const isEmptyProperties =
//         !item.properties ||
//         (typeof item.properties === "object" &&
//           Object.keys(item.properties).length === 0);

//       let perItemWeight = 0;

//       if (!isEmptyProperties && item.properties?.Weight) {
//         perItemWeight = Number(item.properties.Weight);
//       } else {
//         const grams = Number(item.grams) || 0;
//         perItemWeight = Number((grams / 453.592).toFixed(2));
//       }

//       if (perItemWeight > maxPerItemWeight) {
//         maxPerItemWeight = perItemWeight;
//       }

//       const itemQuantity = isEmptyProperties
//         ? item.quantity
//         : item.properties.Quantity || item.quantity;

//       const totalItemWeight = perItemWeight * itemQuantity;
//       totalWeight += totalItemWeight;

//       console.log(
//         `🟢 Item: ${item.name} | ${perItemWeight} lbs × ${itemQuantity} = ${totalItemWeight} lbs`
//       );
//     }

//     console.log(`🟢 TOTAL WEIGHT: ${totalWeight.toFixed(2)} lbs`);

//     const hasHeavyItem = maxPerItemWeight > 150;
//     console.log("🟢 Max per-item weight:", maxPerItemWeight);
//     console.log("🟢 Heavy item present:", hasHeavyItem);

//     // Ensure minimum weight for LTL shipping
//     const finalWeight = Math.max(totalWeight, 150);

//     // =====================================================
//     // STEP 2: OPTIMIZE PALLET CONFIGURATION FOR CHEAP RATE
//     // =====================================================
//     const optimizedConfig = optimizeMultiPalletConfiguration(finalWeight);
//     const palletsNeeded = optimizedConfig.palletsNeeded;
//     const weightPerPallet = optimizedConfig.weightPerPallet;

//     const freightMode = determineFreightMode(finalWeight, palletsNeeded);

//     console.log("🚚 FREIGHT MODE DECISION:");
//     console.log(`   Total Weight: ${finalWeight} lbs`);
//     console.log(`   Pallets: ${palletsNeeded}`);
//     console.log(`   Selected Mode: ${freightMode}`);

//     // =====================================================
//     // STEP 3: OPTIMIZE PALLET HEIGHT FOR MAXIMUM DENSITY
//     // =====================================================
//     const optimizedHeight = optimizePalletHeight(weightPerPallet);

//     const OPTIMIZED_PALLET = {
//       length: 48, // Standard - cannot change
//       width: 40, // Standard - cannot change
//       // height: optimizedHeight, // ⭐ OPTIMIZED for density
//       height: 48,
//     };

//     console.log(
//       `📦 OPTIMIZED PALLET DIMENSIONS: ${OPTIMIZED_PALLET.length}" × ${OPTIMIZED_PALLET.width}" × ${OPTIMIZED_PALLET.height}"`
//     );

//     // Calculate volume with optimized height
//     const volume = calculateVolume(OPTIMIZED_PALLET);
//     const density = weightPerPallet / volume;

//     console.log(`📊 Volume per pallet: ${volume.toFixed(2)} cubic feet`);
//     console.log(`📊 Density: ${density.toFixed(2)} lbs/cubic foot`);

//     // Calculate freight class based on optimized density
//     const freightClass = calculateFreightClass(weightPerPallet, volume);
//     console.log(`💰 FREIGHT CLASS: ${freightClass}`);

//     // Log request to database
//     await logRateRequest({
//       requestId,
//       origin,
//       destination,
//       weight: finalWeight,
//       price: parseFloat(rate.order_totals?.subtotal_price || 0),
//       items: items.map((item: any) => ({
//         ...item,
//         shippingMethod: "Speedship API",
//       })),
//     });

//     const rates = [];

//     // =====================================================
//     // STEP 4: Validate US Domestic Shipping Only
//     // =====================================================
//     const originCountry = rate.origin?.country || "US";
//     const destinationCountry = destination.country || "US";

//     if (originCountry !== "US" || destinationCountry !== "US") {
//       console.warn(
//         `🔴 Speedship only supports US domestic shipping. Origin: ${originCountry}, Destination: ${destinationCountry}`
//       );
//       return NextResponse.json({ rates: [] });
//     }

//     // =====================================================
//     // STEP 5: Build WWEX Request with OPTIMIZED Multi-Pallets
//     // =====================================================
//     const handlingUnitList = [];

//     for (let i = 0; i < palletsNeeded; i++) {
//       // For the last pallet, use remaining weight
//       const isLastPallet = i === palletsNeeded - 1;
//       const palletWeight = isLastPallet
//         ? finalWeight - weightPerPallet * (palletsNeeded - 1)
//         : weightPerPallet;

//       handlingUnitList.push({
//         quantity: 1,
//         packagingType: "PLT",
//         isStackable: true, // ⭐ CRITICAL: true = 20-40% savings
//         billedDimension: {
//           length: { value: OPTIMIZED_PALLET.length, unit: "IN" },
//           width: { value: OPTIMIZED_PALLET.width, unit: "IN" },
//           height: { value: OPTIMIZED_PALLET.height, unit: "IN" }, // ⭐ OPTIMIZED
//         },
//         weight: {
//           value: Math.ceil(palletWeight),
//           unit: "LB",
//         },
//         shippedItemList: [
//           {
//             quantity: 1,
//             commodityDescription: `General Freight - Pallet ${
//               i + 1
//             } of ${palletsNeeded}`,
//             commodityClass: freightClass, // ⭐ OPTIMIZED class
//             isHazMat: false,
//             weight: {
//               value: Math.ceil(palletWeight),
//               unit: "LB",
//             },
//           },
//         ],
//       });
//     }

//     let speedshipRequest;

//     if (freightMode === "FTL") {
//       speedshipRequest = {
//         request: {
//           productType: "FTL",

//           shipment: {
//             shipmentDate: new Date()
//               .toISOString()
//               .slice(0, 19)
//               .replace("T", " "),

//             originAddress: {
//               address: {
//                 addressLineList: [rate.origin?.address1 || "Origin Address"],
//                 locality: rate.origin?.city || "Los Angeles",
//                 region: rate.origin?.province || "CA",
//                 postalCode: origin || "90001",
//                 countryCode: "US",
//                 companyName: rate.origin?.company || "Shipper",
//                 phone: rate.origin?.phone || "+18007587447",
//                 contactList: [
//                   {
//                     firstName: rate.origin?.first_name || "John",
//                     lastName: rate.origin?.last_name || "Smith",
//                     phone: rate.origin?.phone || "+18007587447",
//                     contactType: "SENDER",
//                   },
//                 ],
//               },
//               locationType: "COMMERCIAL",
//             },

//             destinationAddress: {
//               address: {
//                 addressLineList: [
//                   destination.address1 || "Destination Address",
//                 ],
//                 locality: destination.city || "New York",
//                 region: destination.province || "NY",
//                 postalCode: destination.postal_code || "10001",
//                 countryCode: "US",
//                 companyName: destination.company || "Recipient",
//                 phone: destination.phone || "+18669987447",
//                 contactList: [
//                   {
//                     firstName: destination.first_name || "Jane",
//                     lastName: destination.last_name || "Doe",
//                     phone: destination.phone || "+18669987447",
//                     contactType: "RECEIVER",
//                   },
//                 ],
//               },
//               locationType: "COMMERCIAL",
//             },

//             // 🚛 FTL does NOT need pallet breakdown
//             totalWeight: {
//               value: Math.ceil(finalWeight),
//               unit: "LB",
//             },

//             // Optional but recommended summary
//             description: `Full Truckload shipment - ${palletsNeeded} pallets`,

//             // ⭐ COST CONTROL FLAGS (same strategy as LTL)
//             residentialDeliveryFlag: false,
//             residentialPickupFlag: false,
//             liftgateDeliveryFlag: false,
//             liftgatePickupFlag: false,
//             insideDeliveryFlag: false,
//             insidePickupFlag: false,
//             holdAtTerminalFlag: false,
//             notifyBeforeDeliveryFlag: false,
//             carrierTerminalPickupFlag: false,
//             protectionFromColdFlag: false,
//             isSignatureRequired: false,

//             insuredCommodityCategory: "400",
//             totalDeclaredValue: {
//               value: "0",
//               unit: "USD",
//             },
//           },
//         },

//         correlationId: requestId,
//       };
//     } else {
//       speedshipRequest = {
//         request: {
//           productType: "LTL",
//           shipment: {
//             shipmentDate: new Date()
//               .toISOString()
//               .slice(0, 19)
//               .replace("T", " "),

//             originAddress: {
//               address: {
//                 addressLineList: [rate.origin?.address1 || "Origin Address"],
//                 locality: rate.origin?.city || "Los Angeles",
//                 region: rate.origin?.province || "CA",
//                 postalCode: origin || "90001",
//                 countryCode: "US",
//                 companyName: rate.origin?.company || "Shipper",
//                 phone: rate.origin?.phone || "+18007587447",
//                 contactList: [
//                   {
//                     firstName: rate.origin?.first_name || "John",
//                     lastName: rate.origin?.last_name || "Smith",
//                     phone: rate.origin?.phone || "+18007587447",
//                     contactType: "SENDER",
//                   },
//                 ],
//               },
//               locationType: "COMMERCIAL", // ⭐ COMMERCIAL = $50-100 cheaper than RESIDENTIAL
//             },

//             destinationAddress: {
//               address: {
//                 addressLineList: [
//                   destination.address1 || "Destination Address",
//                 ],
//                 locality: destination.city || "New York",
//                 region: destination.province || "NY",
//                 postalCode: destination.postal_code || "10001",
//                 countryCode: "US",
//                 companyName: destination.company || "Recipient",
//                 phone: destination.phone || "+18669987447",
//                 contactList: [
//                   {
//                     firstName: destination.first_name || "Jane",
//                     lastName: destination.last_name || "Doe",
//                     phone: destination.phone || "+18669987447",
//                     contactType: "RECEIVER",
//                   },
//                 ],
//               },
//               locationType: "COMMERCIAL", // ⭐ CRITICAL: COMMERCIAL = cheaper
//             },

//             handlingUnitList: handlingUnitList,

//             totalHandlingUnitCount: palletsNeeded,
//             totalWeight: {
//               value: Math.ceil(finalWeight),
//               unit: "LB",
//             },

//             description: "Freight shipment",
//             returnLabelFlag: false,

//             // ⭐ ALL FALSE = MAXIMUM SAVINGS (no extra charges)
//             residentialDeliveryFlag: false, // Saves $50-100
//             residentialPickupFlag: false, // Saves $50-100
//             isSignatureRequired: false,
//             holdAtTerminalFlag: false,
//             insideDeliveryFlag: false, // Saves $75-200
//             insidePickupFlag: false, // Saves $75-200
//             carrierTerminalPickupFlag: false,
//             liftgateDeliveryFlag: false, // Saves $75-150
//             liftgatePickupFlag: false, // Saves $75-150
//             notifyBeforeDeliveryFlag: false,
//             protectionFromColdFlag: false, // Saves $50-100

//             insuredCommodityCategory: "400",
//             totalDeclaredValue: {
//               value: "0", // No insurance unless customer pays
//               unit: "USD",
//             },
//           },
//         },
//         correlationId: requestId,
//       };
//     }

//     console.log("💰 COST OPTIMIZATIONS APPLIED:");
//     console.log(
//       `   ✅ Minimized pallets: ${palletsNeeded} (vs ${Math.ceil(
//         finalWeight / 2000
//       )} with 2000lb limit)`
//     );
//     console.log(
//       `   ✅ Optimized height: ${OPTIMIZED_PALLET.height}" (higher density)`
//     );
//     console.log(`   ✅ Stackable: true (saves 20-40%)`);
//     console.log(`   ✅ Freight class: ${freightClass} (lower = cheaper)`);
//     console.log(`   ✅ Commercial locations (not residential)`);
//     console.log(`   ✅ No extra services (liftgate, inside, etc.)`);

//     console.log(
//       "\n🟢 WWEX Request:",
//       JSON.stringify(speedshipRequest, null, 2)
//     );

//     // =====================================================
//     // STEP 6: Call WWEX API
//     // =====================================================
//     const speedshipStartTime = Date.now();

//     try {
//       const response = await axios.post(
//         "https://speedship.staging-wwex.com/svc/shopFlow",
//         speedshipRequest,
//         {
//           headers: {
//             Authorization: `Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ik1EVTBSRUU0TmpFMU5ERTBORUkwTTBGRE5qUXlOemt3TmpSR05VVkZSREpFUlRJM01FUXpPQSJ9.eyJodHRwczovL3NwZWVkc2hpcC53d2V4LmNvbS9wcmltYXJ5Um9sZSI6IkN1c3RvbWVyX0FQSV9NMk0iLCJodHRwczovL3NwZWVkc2hpcC53d2V4LmNvbS9wcmltYXJ5TmFtZXNwYWNlIjoic3Mud3dleC5jdXN0b21lci5XMDAwOTA3MTU2IiwiaHR0cHM6Ly9zcGVlZHNoaXAud3dleC5jb20vc3NVc2VySWQiOiI4aDk0VENwME42ZmcwOWlwUDN5eUptZlBQdjVsMW1DRCIsImh0dHBzOi8vc3BlZWRzaGlwLnd3ZXguY29tL2FwcFR5cGUiOiJNMk0iLCJodHRwczovL3NwZWVkc2hpcC53d2V4LmNvbS9hcHBEb21haW4iOiJXV0VYIiwiaHR0cHM6Ly9zcGVlZHNoaXAud3dleC5jb20vZG9tYWluIjoid3dleCIsImh0dHBzOi8vc3BlZWRzaGlwLnd3ZXguY29tL2FwaVBsYW4iOiJzbWFsbCIsImh0dHBzOi8vc3BlZWRzaGlwLnd3ZXguY29tL2VtYWlsIjoiOGg5NFRDcDBONmZnMDlpcFAzeXlKbWZQUHY1bDFtQ0QiLCJpc3MiOiJodHRwczovL2F1dGguc3RhZ2luZy13d2V4LmNvbS8iLCJzdWIiOiI4aDk0VENwME42ZmcwOWlwUDN5eUptZlBQdjVsMW1DREBjbGllbnRzIiwiYXVkIjoic3RhZ2luZy13d2V4LWFwaWciLCJpYXQiOjE3NjgyMTE1MzcsImV4cCI6MTc2ODI5NzkzNywiZ3R5IjoiY2xpZW50LWNyZWRlbnRpYWxzIiwiYXpwIjoiOGg5NFRDcDBONmZnMDlpcFAzeXlKbWZQUHY1bDFtQ0QifQ.hAi_d_hevougB5T-0TZ3Da5cU3vqnTEXNRKljcnTgC4XGqshXV-xpXvyHrriEDcusaYT01FnCMC_as_mAD1XhSJ5J-5hF81giQYxgM09qmc_b95-RNBwnQvl1O2I3FRCLMIdZhFliBLrSJJkjSXQnYQTJ6n1TRL2oBYZwEGsRrNV4BFdkEJOrmuWnbcvAmR3WZzM37XbkqkJVFyeEle2L7pNHVplq-ndjS3sjSSANiRDW9-qweFRrC8wTfXXyWVMPBLNkxfVZRuVSezzptHpXx_1VE0XYcvzme2EekN16WzSOMNSwLjM4Ei_vk0WvkaD5GWFDACXT2TFl_EawLnN1w`,
//             "Content-Type": "application/json",
//           },
//           timeout: 20000,
//         }
//       );

//       const speedshipResponseTime = Date.now() - speedshipStartTime;
//       console.log(`🟢 WWEX API response time: ${speedshipResponseTime}ms`);

//       const offerList = response.data?.response?.offerList || [];

//       // console.log("response.data===================>", response.data);

//       if (offerList.length === 0) {
//         throw new Error("No offers returned from WWEX");
//       }

//       // ⭐ CRITICAL: Sort by price and pick CHEAPEST offer
//       const sortedOffers = offerList
//         .filter((o: any) => o.totalOfferPrice?.value)
//         .sort(
//           (a: any, b: any) =>
//             Number(a.totalOfferPrice.value) - Number(b.totalOfferPrice.value)
//         );

//       console.log(`💰 WWEX returned ${sortedOffers.length} offers:`);
//       sortedOffers.forEach((offer: any, idx: number) => {
//         const product = offer.offeredProductList[0];
//         console.log(
//           `   ${idx + 1}. $${offer.totalOfferPrice.value} - ${
//             product?.shopRQShipment?.timeInTransit?.serviceLevel || "Standard"
//           }`
//         );
//       });

//       const selectedOffer = sortedOffers[0]; // ⭐ Always pick CHEAPEST

//       if (!selectedOffer) {
//         throw new Error("No valid offers with pricing");
//       }

//       const product = selectedOffer.offeredProductList[0];
//       const speedshipRate = Number(product.offerPrice.value);
//       const transitDays =
//         Number(product.shopRQShipment?.timeInTransit?.transitDays) || 5;
//       const serviceLevel =
//         product.shopRQShipment?.timeInTransit?.serviceLevel || "Freight";

//       console.log("\n💰 SELECTED CHEAPEST RATE:");
//       console.log(`   Rate: $${speedshipRate.toFixed(2)}`);
//       console.log(`   Transit: ${transitDays} days`);
//       console.log(`   Service: ${serviceLevel}`);
//       console.log(`   Pallets: ${palletsNeeded}`);

//       // Log response
//       await logWWEXResponse({
//         requestId,
//         quoteId: selectedOffer.offerId || requestId,
//         rate: speedshipRate,
//         transitDays,
//         serviceLevel: `Speedship ${serviceLevel}`,
//         responseTimeMs: speedshipResponseTime,
//         rawResponse: response.data,
//       });

//       // Cache the rate
//       await cacheRate({
//         cacheKey: generateCacheKey(
//           origin,
//           destination.postal_code,
//           finalWeight
//         ),
//         origin,
//         destination: destination.postal_code,
//         weightMin: Math.floor(finalWeight / 100) * 100,
//         weightMax: Math.ceil(finalWeight / 100) * 100,
//         rate: speedshipRate,
//         transitDays,
//         expiresInMinutes: 60,
//       });

//       // Add rate to response
//       rates.push({
//         service_name: `Speedship Freight - ${serviceLevel}`,
//         service_code: "SPEEDSHIP_FREIGHT",
//         total_price: (speedshipRate * 100).toString(),
//         currency: "USD",
//         description: `${transitDays} business days (${palletsNeeded} pallet${
//           palletsNeeded > 1 ? "s" : ""
//         })`,
//         min_delivery_date: getDeliveryDate(transitDays).toISOString(),
//         max_delivery_date: getDeliveryDate(transitDays + 2).toISOString(),
//       });

//       console.log("✅ Successfully added CHEAPEST Speedship rate");
//     } catch (error: any) {
//       console.error("🔴 WWEX API Error:", error.message);
//       if (error.response) {
//         console.error("🔴 Response:", error.response.data);
//         console.error("🔴 Status:", error.response.status);
//       }

//       await logError("SPEEDSHIP_API_ERROR", error.message, error.stack, {
//         responseData: error.response?.data,
//         statusCode: error.response?.status,
//       });

//       // Fallback rate calculation
//       const baseRate = 150;
//       const perLbRate = 0.5;
//       const estimatedRate = baseRate + finalWeight * perLbRate;

//       rates.push({
//         service_name: "Speedship Freight (Estimated)",
//         service_code: "SPEEDSHIP_FREIGHT_FALLBACK",
//         total_price: Math.round(estimatedRate * 100).toString(),
//         currency: "USD",
//         description: "Estimated 7 business days (Fallback Rate)",
//         min_delivery_date: getDeliveryDate(7).toISOString(),
//         max_delivery_date: getDeliveryDate(9).toISOString(),
//       });
//     }

//     const totalProcessingTime = Date.now() - startTime;
//     console.log(`\n🟢 Total processing time: ${totalProcessingTime}ms`);

//     // return NextResponse.json({ rates });
//     return NextResponse.json({ rates: [] });
//   } catch (error: any) {
//     console.error("🔴 Speedship Estimate Error:", error);

//     await logError("SPEEDSHIP_ESTIMATE_ERROR", error.message, error.stack);

//     return NextResponse.json({ rates: [] });
//   }
// }

// // Calculate delivery date based on transit days
// function getDeliveryDate(transitDays: number): Date {
//   const date = new Date();
//   let daysAdded = 0;

//   while (daysAdded < transitDays) {
//     date.setDate(date.getDate() + 1);
//     // Skip weekends
//     if (date.getDay() !== 0 && date.getDay() !== 6) {
//       daysAdded++;
//     }
//   }

//   return date;
// }

// // Health check endpoint
// export async function GET() {
//   return NextResponse.json({
//     status: "ok",
//     service: "Speedship Freight Estimate Service (Multi-Pallet Optimized)",
//     version: "3.0.0",
//     endpoint: "https://speedship.staging-wwex.com/svc/shopFlow",
//     optimizations: [
//       "Maximum weight per pallet (2500 lbs)",
//       "Optimized height for density",
//       "Stackable pallets enabled",
//       "Commercial location types",
//       "No extra service charges",
//       "Lowest freight class possible",
//       "Always selects cheapest offer",
//     ],
//   });
// }
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
import FedExClient from "@/lib/fedex-client";

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
  const weightBucket = Math.ceil(weight / 100) * 100;
  return `speedship-${origin}-${destination}-${weightBucket}`;
}

type FreightMode = "LTL" | "FTL";

function determineFreightMode(
  totalWeight: number,
  palletsNeeded: number
): FreightMode {
  if (
    totalWeight > 20000 || // Weight threshold
    palletsNeeded >= 8 // Trailer space threshold
  ) {
    return "FTL";
  }

  return "LTL";
}

// =====================================================
// UPDATED: Calculate density and freight class
// =====================================================
function calculateDensityAndClass(
  weight: number,
  length: number,
  width: number,
  height: number
): { density: number; freightClass: string } {
  const volume = (length * width * height) / 1728; // cubic feet
  if (volume === 0) return { density: 0, freightClass: "70" };

  const density = weight / volume;

  let freightClass = "500";
  if (density >= 50) freightClass = "50";
  else if (density >= 35) freightClass = "55";
  else if (density >= 30) freightClass = "60";
  else if (density >= 22.5) freightClass = "65";
  else if (density >= 15) freightClass = "70";
  else if (density >= 13.5) freightClass = "77.5";
  else if (density >= 12) freightClass = "85";
  else if (density >= 10.5) freightClass = "92.5";
  else if (density >= 9) freightClass = "100";
  else if (density >= 8) freightClass = "110";
  else if (density >= 7) freightClass = "125";
  else if (density >= 6) freightClass = "150";
  else if (density >= 5) freightClass = "175";
  else if (density >= 4) freightClass = "200";
  else if (density >= 3) freightClass = "250";
  else if (density >= 2) freightClass = "300";
  else if (density >= 1) freightClass = "400";

  return { density, freightClass };
}

function optimizePalletHeight(weightPerPallet: number): number {
  if (weightPerPallet >= 2200) return 30;
  if (weightPerPallet >= 1800) return 36;
  if (weightPerPallet >= 1400) return 42;
  if (weightPerPallet >= 1000) return 48;
  if (weightPerPallet >= 600) return 54;
  return 60;
}

// =====================================================
// CRITICAL FIX: Proper 2500 lb limit + special case for 2001-2500
// =====================================================
function optimizeMultiPalletConfiguration(totalWeight: number): PalletConfig {
  const MAX_SAFE_WEIGHT = 2000; // ⭐ Industry standard
  const MIN_WEIGHT_PER_PALLET = 1200;

  const minPallets = Math.ceil(totalWeight / MAX_SAFE_WEIGHT);
  const maxPallets = Math.min(
    Math.ceil(totalWeight / MIN_WEIGHT_PER_PALLET),
    8
  );

  console.log(`\n💰 PALLET OPTIMIZATION FOR ${totalWeight} LBS:`);
  console.log(
    `   Testing ${minPallets} to ${maxPallets} pallet configurations...`
  );

  // ⭐ CRITICAL FIX: Force 1 pallet for 2001-2500 lbs range
  // if (totalWeight > 2000 && totalWeight <= 2500) {
  //   console.log(`   ⚠️ Weight ${totalWeight} lbs in danger zone (2001-2500)`);
  //   console.log(`   ✅ FORCING 1 PALLET to avoid double cost!`);

  //   const height = optimizePalletHeight(totalWeight);
  //   const { density, freightClass } = calculateDensityAndClass(
  //     totalWeight,
  //     48,
  //     40,
  //     height
  //   );

  //   console.log(
  //     `   📦 1 pallet: ${totalWeight} lbs, ${height}" high, density ${density.toFixed(
  //       2
  //     )}, class ${freightClass}`
  //   );
  //   console.log(
  //     `   💰 Saved from 2-pallet configuration (would cost 2x more!)\n`
  //   );

  //   return {
  //     palletsNeeded: 1,
  //     weightPerPallet: totalWeight,
  //     height,
  //     density,
  //     freightClass,
  //     estimatedSavings: 500,
  //   };
  // }

  let bestConfig: PalletConfig | null = null;
  const classToNumber = (cls: string) => parseFloat(cls);

  for (let palletCount = minPallets; palletCount <= maxPallets; palletCount++) {
    const weightPerPallet = totalWeight / palletCount;
    const height = optimizePalletHeight(weightPerPallet);

    const { density, freightClass } = calculateDensityAndClass(
      weightPerPallet,
      48,
      40,
      height
    );

    const classNum = classToNumber(freightClass);

    console.log(
      `   ${palletCount} pallets: ${weightPerPallet.toFixed(
        0
      )} lbs/pallet, ${height}" high, density ${density.toFixed(
        2
      )}, class ${freightClass}`
    );

    if (!bestConfig || classNum < classToNumber(bestConfig.freightClass)) {
      const classReduction: any = bestConfig
        ? classToNumber(bestConfig.freightClass) - classNum
        : 0;

      bestConfig = {
        palletsNeeded: palletCount,
        weightPerPallet,
        height,
        density,
        freightClass,
        estimatedSavings: classReduction * 75,
      };
    }
  }

  if (!bestConfig) {
    return {
      palletsNeeded: minPallets,
      weightPerPallet: totalWeight / minPallets,
      height: 48,
      density: 0,
      freightClass: "70",
      estimatedSavings: 0,
    };
  }

  console.log("tal weight ======================================================>",totalWeight)

  console.log("\n✅ SELECTED CONFIGURATION:");
  console.log(`   Pallets: ${bestConfig.palletsNeeded}`);
  console.log(
    `   Weight per pallet: ${bestConfig.weightPerPallet.toFixed(2)} lbs`
  );
  console.log(`   Height: ${bestConfig.height}"`);
  console.log(`   Density: ${bestConfig.density.toFixed(2)} lbs/cu.ft`);
  console.log(`   Freight Class: ${bestConfig.freightClass}`);
  if (bestConfig.estimatedSavings > 0) {
    console.log(`   💵 Estimated savings: $${bestConfig.estimatedSavings}\n`);
  }

  return bestConfig;
}

export async function POST(request: NextRequest) {
  console.log("🟢 Speedship API - OPTIMIZED Multi-Pallet Rating v4.1");
  const startTime = Date.now();

  try {
    const rawBody = await request.text();
    const hmacHeader = request.headers.get("X-Shopify-Hmac-Sha256") || "";

    console.log("rawBody===================================>", rawBody);

    const body = JSON.parse(rawBody);
    const requestId = `SPEEDSHIP-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    console.log("🟢 Request ID:", requestId);

    console.log("body==================================>", body.rate.items);

    const { rate } = body;

    if (!rate) {
      return NextResponse.json({ rates: [] });
    }

    const origin = rate.origin?.postal_code || "";
    const destination = rate.destination || {};
    const items = rate.items || [];

    // =====================================================
    // STEP 1: Calculate Total Weight
    // =====================================================
    let totalWeight = 0;
    let maxPerItemWeight = 0;

    for (const item of items) {
      const isEmptyProperties =
        !item.properties ||
        (typeof item.properties === "object" &&
          Object.keys(item.properties).length === 0);

      let perItemWeight = 0;

      if (!isEmptyProperties && item.properties?.Weight) {
        perItemWeight = Number(item.properties.Weight);
      } else {
        const grams = Number(item.grams) || 0;
        perItemWeight = Number((grams / 453.592).toFixed(2));
      }

      if (perItemWeight > maxPerItemWeight) {
        maxPerItemWeight = perItemWeight;
      }

      const itemQuantity = isEmptyProperties
        ? item.quantity
        : item.properties.Quantity || item.quantity;

      const totalItemWeight = perItemWeight * itemQuantity;
      totalWeight += totalItemWeight;

      console.log(
        `🟢 Item: ${item.name} | ${perItemWeight} lbs × ${itemQuantity} = ${totalItemWeight} lbs`
      );
    }

    console.log(`🟢 TOTAL WEIGHT: ${totalWeight.toFixed(2)} lbs`);

    const hasHeavyItem = maxPerItemWeight > 150;
    console.log("🟢 Max per-item weight:", maxPerItemWeight);
    console.log("🟢 Heavy item present:", hasHeavyItem);

    // Ensure minimum weight for LTL shipping
    // const finalWeight = Math.max(totalWeight, 150);
    const finalWeight = totalWeight;

    // =====================================================
    // STEP 2: USE OPTIMIZED CONFIGURATION (FIXED FOR 2001-2500)
    // =====================================================
    const optimizedConfig = optimizeMultiPalletConfiguration(finalWeight);
    const palletsNeeded = optimizedConfig.palletsNeeded;
    const weightPerPallet = optimizedConfig.weightPerPallet;
    const optimizedHeight = optimizedConfig.height;
    const freightClass = optimizedConfig.freightClass;

    const freightMode = determineFreightMode(finalWeight, palletsNeeded);

    console.log("🚚 FREIGHT MODE DECISION:");
    console.log(`   Total Weight: ${finalWeight} lbs`);
    console.log(`   Pallets: ${palletsNeeded}`);
    console.log(`   Selected Mode: ${freightMode}`);

    // =====================================================
    // STEP 3: Use OPTIMIZED dimensions
    // =====================================================
    const OPTIMIZED_PALLET = {
      length: 48,
      width: 40,
      height: 60,
      // length: 26,
      // width: 26,
      // height: 30,
    };

    console.log(
      `📦 OPTIMIZED PALLET DIMENSIONS: ${OPTIMIZED_PALLET.length}" × ${OPTIMIZED_PALLET.width}" × ${OPTIMIZED_PALLET.height}"`
    );

    // Log request to database
    await logRateRequest({
      requestId,
      origin,
      destination,
      weight: finalWeight,
      price: parseFloat(rate.order_totals?.subtotal_price || 0),
      items: items.map((item: any) => ({
        ...item,
        shippingMethod: "Speedship API",
      })),
    });

    const rates = [];

    // =====================================================
    // STEP 4: Validate US Domestic Shipping Only
    // =====================================================
    const originCountry = rate.origin?.country || "US";
    const destinationCountry = destination.country || "US";

    if (originCountry !== "US" || destinationCountry !== "US") {
      console.warn(
        `🔴 Speedship only supports US domestic shipping. Origin: ${originCountry}, Destination: ${destinationCountry}`
      );
      return NextResponse.json({ rates: [] });
    }

    // =====================================================
    // STEP 5: Build WWEX Request with OPTIMIZED Pallets
    // =====================================================
    const handlingUnitList = [];

    for (let i = 0; i < palletsNeeded; i++) {
      // For the last pallet, use remaining weight
      const isLastPallet = i === palletsNeeded - 1;
      const palletWeight = isLastPallet
        ? finalWeight - weightPerPallet * (palletsNeeded - 1)
        : weightPerPallet;

      // Recalculate class for this specific pallet
      const { freightClass: palletClass } = calculateDensityAndClass(
        palletWeight,
        OPTIMIZED_PALLET.length,
        OPTIMIZED_PALLET.width,
        OPTIMIZED_PALLET.height
      );

      handlingUnitList.push({
        quantity: 1,
        packagingType: "PLT",
        isStackable: true,
        billedDimension: {
          length: { value: OPTIMIZED_PALLET.length, unit: "IN" },
          width: { value: OPTIMIZED_PALLET.width, unit: "IN" },
          height: { value: OPTIMIZED_PALLET.height, unit: "IN" },
        },
        weight: {
          value: Math.ceil(palletWeight),
          unit: "LB",
        },
        shippedItemList: [
          {
            // quantity: 1,
            // commodityDescription: `General Merchandise - Pallet ${
            //   i + 1
            // } of ${palletsNeeded}`,
            // commodityClass: palletClass,
            commodityClass: "55",
            isHazMat: false,
            weight: {
              value: Math.ceil(palletWeight),
              unit: "LB",
            },
          },
        ],
      });
    }

    let speedshipRequest;

    if (freightMode === "FTL") {
      speedshipRequest = {
        request: {
          productType: "FTL",

          shipment: {
            shipmentDate: new Date()
              .toISOString()
              .slice(0, 19)
              .replace("T", " "),

            originAddress: {
              address: {
                addressLineList: [rate.origin?.address1 || "Origin Address"],
                locality: rate.origin?.city || "Los Angeles",
                region: rate.origin?.province || "CA",
                postalCode: origin || "90001",
                countryCode: "US",
                companyName: rate.origin?.company || "Shipper",
                phone: rate.origin?.phone || "+18007587447",
                contactList: [
                  {
                    firstName: rate.origin?.first_name || "John",
                    lastName: rate.origin?.last_name || "Smith",
                    phone: rate.origin?.phone || "+18007587447",
                    contactType: "SENDER",
                  },
                ],
              },
              locationType: "COMMERCIAL",
            },

            destinationAddress: {
              address: {
                addressLineList: [
                  destination.address1 || "Destination Address",
                ],
                locality: destination.city || "New York",
                region: destination.province || "NY",
                postalCode: destination.postal_code || "10001",
                countryCode: "US",
                companyName: destination.company || "Recipient",
                phone: destination.phone || "+18669987447",
                contactList: [
                  {
                    firstName: destination.first_name || "Jane",
                    lastName: destination.last_name || "Doe",
                    phone: destination.phone || "+18669987447",
                    contactType: "RECEIVER",
                  },
                ],
              },
              locationType: "COMMERCIAL",
            },

            totalWeight: {
              value: Math.ceil(finalWeight),
              unit: "LB",
            },

            description: `Full Truckload shipment - ${palletsNeeded} pallets`,

            residentialDeliveryFlag: false,
            residentialPickupFlag: false,
            liftgateDeliveryFlag: false,
            liftgatePickupFlag: false,
            insideDeliveryFlag: false,
            insidePickupFlag: false,
            holdAtTerminalFlag: false,
            notifyBeforeDeliveryFlag: false,
            carrierTerminalPickupFlag: false,
            protectionFromColdFlag: false,
            isSignatureRequired: false,

            insuredCommodityCategory: "400",
            totalDeclaredValue: {
              value: "0",
              unit: "USD",
            },
          },
        },

        correlationId: requestId,
      };
    } else {
      speedshipRequest = {
        request: {
          productType: "LTL",
          shipment: {
            shipmentDate: new Date()
              .toISOString()
              .slice(0, 19)
              .replace("T", " "),

            originAddress: {
              // address: {
              //   addressLineList: [rate.origin?.address1 || "Origin Address"],
              //   locality: rate.origin?.city || "Los Angeles",
              //   region: rate.origin?.province || "CA",
              //   postalCode: origin || "90001",
              //   countryCode: "US",
              //   companyName: rate.origin?.company || "Shipper",
              //   phone: rate.origin?.phone || "+18007587447",
              //   contactList: [
              //     {
              //       firstName: rate.origin?.first_name || "John",
              //       lastName: rate.origin?.last_name || "Smith",
              //       phone: rate.origin?.phone || "+18007587447",
              //       contactType: "SENDER",
              //     },
              //   ],
              // },
              address: {
                addressLineList: ["312 East 52 Bypass"],
                locality: "Pilot Mountain",
                region: "NC",
                postalCode: "27041",
                countryCode: "US",
                companyName: rate.origin?.company || "",
                phone: rate.origin?.phone || "",
                contactList: [
                  {
                    firstName: rate.origin?.first_name || "",
                    lastName: rate.origin?.last_name || "",
                    phone: rate.origin?.phone || "",
                    contactType: "SENDER",
                  },
                ],
              },
              locationType: "COMMERCIAL",
            },

            destinationAddress: {
              address: {
                addressLineList: [destination.address1 || ""],
                locality: destination.city || "",
                region: destination.province || "",
                postalCode: destination.postal_code || "",
                countryCode: "US",
                companyName: destination.company || "",
                phone: destination.phone || "",
                contactList: [
                  {
                    firstName: destination.first_name || "",
                    lastName: destination.last_name || "",
                    phone: destination.phone || "",
                    contactType: "RECEIVER",
                  },
                ],
              },
              locationType: "COMMERCIAL",
            },

            handlingUnitList: handlingUnitList,

            totalHandlingUnitCount: palletsNeeded,
            totalWeight: {
              value: Math.ceil(finalWeight),
              unit: "LB",
            },

            description: "Freight shipment",
            returnLabelFlag: false,

            residentialDeliveryFlag: false,
            residentialPickupFlag: false,
            isSignatureRequired: false,
            holdAtTerminalFlag: false,
            insideDeliveryFlag: false,
            insidePickupFlag: false,
            carrierTerminalPickupFlag: false,
            liftgateDeliveryFlag: false,
            liftgatePickupFlag: false,
            notifyBeforeDeliveryFlag: false,
            protectionFromColdFlag: false,

            insuredCommodityCategory: "400",
            totalDeclaredValue: {
              value: "0",
              unit: "USD",
            },
          },
        },
        correlationId: requestId,
      };
    }

    console.log("💰 COST OPTIMIZATIONS APPLIED:");
    console.log(`   ✅ Optimized pallets: ${palletsNeeded}`);
    console.log(`   ✅ Optimized height: ${OPTIMIZED_PALLET.height}"`);
    console.log(`   ✅ Stackable: true (saves 20-40%)`);
    console.log(`   ✅ Freight class: ${freightClass}`);
    console.log(`   ✅ Commercial locations`);
    console.log(`   ✅ No extra services`);
    if (optimizedConfig.estimatedSavings > 0) {
      console.log(`   💵 Est. savings: $${optimizedConfig.estimatedSavings}`);
    }

    console.log(
      "\n🟢 WWEX Request:",
      JSON.stringify(speedshipRequest, null, 2)
    );

    // =====================================================
    // STEP 6: Call WWEX API
    // =====================================================
    const speedshipStartTime = Date.now();

    try {
      const response = await axios.post(
        "https://speedship.staging-wwex.com/svc/shopFlow",
        speedshipRequest,
        {
          headers: {
            Authorization: `Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ik1EVTBSRUU0TmpFMU5ERTBORUkwTTBGRE5qUXlOemt3TmpSR05VVkZSREpFUlRJM01FUXpPQSJ9.eyJodHRwczovL3NwZWVkc2hpcC53d2V4LmNvbS9wcmltYXJ5Um9sZSI6IkN1c3RvbWVyX0FQSV9NMk0iLCJodHRwczovL3NwZWVkc2hpcC53d2V4LmNvbS9wcmltYXJ5TmFtZXNwYWNlIjoic3Mud3dleC5jdXN0b21lci5XMDAwOTA3MTU2IiwiaHR0cHM6Ly9zcGVlZHNoaXAud3dleC5jb20vc3NVc2VySWQiOiI4aDk0VENwME42ZmcwOWlwUDN5eUptZlBQdjVsMW1DRCIsImh0dHBzOi8vc3BlZWRzaGlwLnd3ZXguY29tL2FwcFR5cGUiOiJNMk0iLCJodHRwczovL3NwZWVkc2hpcC53d2V4LmNvbS9hcHBEb21haW4iOiJXV0VYIiwiaHR0cHM6Ly9zcGVlZHNoaXAud3dleC5jb20vZG9tYWluIjoid3dleCIsImh0dHBzOi8vc3BlZWRzaGlwLnd3ZXguY29tL2FwaVBsYW4iOiJzbWFsbCIsImh0dHBzOi8vc3BlZWRzaGlwLnd3ZXguY29tL2VtYWlsIjoiOGg5NFRDcDBONmZnMDlpcFAzeXlKbWZQUHY1bDFtQ0QiLCJpc3MiOiJodHRwczovL2F1dGguc3RhZ2luZy13d2V4LmNvbS8iLCJzdWIiOiI4aDk0VENwME42ZmcwOWlwUDN5eUptZlBQdjVsMW1DREBjbGllbnRzIiwiYXVkIjoic3RhZ2luZy13d2V4LWFwaWciLCJpYXQiOjE3NjgyOTg1MDAsImV4cCI6MTc2ODM4NDkwMCwiZ3R5IjoiY2xpZW50LWNyZWRlbnRpYWxzIiwiYXpwIjoiOGg5NFRDcDBONmZnMDlpcFAzeXlKbWZQUHY1bDFtQ0QifQ.tLHUuagjm-mnyF6BE2lxGndHVmMWHIlZqk28LLoMRBhKIfaA6nEznSvT7PoUzvii_8Xgx3f4T824CBSdm8JUwO9kbX8bVaUS_0B3KfLV0BGSs58eVORVTruRauley7FwpD4pIUvVbSNmuyErGmMSU27EUYQCIL6qJtS1c2XXps6bbSXB43KxP92NzwXV63Ny_xD_i3Dp5TqbJ26oKnci7lFfspVSUjSOAbWZz3y_iFpQ8UzPtDHbcLA0an7mCz0dYA-zpYuUtneSLNLD3BvhhyK5mR4Y1Eg8fN7nZUqYAAWwavplv7G8TRioXkQnNxoVjzBcF5qQe0voZ7uhgNxDJw`,
            "Content-Type": "application/json",
          },
          timeout: 20000,
        }
      );

      const speedshipResponseTime = Date.now() - speedshipStartTime;
      console.log(`🟢 WWEX API response time: ${speedshipResponseTime}ms`);

      const offerList = response.data?.response?.offerList || [];

      if (offerList.length === 0) {
        throw new Error("No offers returned from WWEX");
      }

      const sortedOffers = offerList
        .filter((o: any) => o.totalOfferPrice?.value)
        .sort(
          (a: any, b: any) =>
            Number(a.totalOfferPrice.value) - Number(b.totalOfferPrice.value)
        );

      console.log(`💰 WWEX returned ${sortedOffers.length} offers:`);
      sortedOffers.forEach((offer: any, idx: number) => {
        const product = offer.offeredProductList[0];
        console.log(
          `   ${idx + 1}. $${offer.totalOfferPrice.value} - ${
            product?.shopRQShipment?.timeInTransit?.serviceLevel || "Standard"
          }`
        );
      });

      const selectedOffer = sortedOffers[0];

      if (!selectedOffer) {
        throw new Error("No valid offers with pricing");
      }

      const product = selectedOffer.offeredProductList[0];
      const speedshipRate = Number(product.offerPrice.value);
      const transitDays =
        Number(product.shopRQShipment?.timeInTransit?.transitDays) || 5;
      const serviceLevel =
        product.shopRQShipment?.timeInTransit?.serviceLevel || "Freight";

      console.log("\n💰 SELECTED CHEAPEST RATE:");
      console.log(`   Rate: $${speedshipRate.toFixed(2)}`);
      console.log(`   Transit: ${transitDays} days`);
      console.log(`   Service: ${serviceLevel}`);
      console.log(`   Pallets: ${palletsNeeded}`);

      await logWWEXResponse({
        requestId,
        quoteId: selectedOffer.offerId || requestId,
        rate: speedshipRate,
        transitDays,
        serviceLevel: `Speedship ${serviceLevel}`,
        responseTimeMs: speedshipResponseTime,
        rawResponse: response.data,
      });

      await cacheRate({
        cacheKey: generateCacheKey(
          origin,
          destination.postal_code,
          finalWeight
        ),
        origin,
        destination: destination.postal_code,
        weightMin: Math.floor(finalWeight / 100) * 100,
        weightMax: Math.ceil(finalWeight / 100) * 100,
        rate: speedshipRate,
        transitDays,
        expiresInMinutes: 60,
      });

      rates.push({
        service_name: `Speedship Freight - ${serviceLevel}`,
        service_code: "SPEEDSHIP_FREIGHT",
        total_price: (speedshipRate * 100).toString(),
        currency: "USD",
        description: `${transitDays} business days (${palletsNeeded} pallet${
          palletsNeeded > 1 ? "s" : ""
        })`,
        min_delivery_date: getDeliveryDate(transitDays).toISOString(),
        max_delivery_date: getDeliveryDate(transitDays + 2).toISOString(),
      });

      console.log("✅ Successfully added CHEAPEST Speedship rate");
    } catch (error: any) {
      console.error("🔴 WWEX API Error:", error.message);
      if (error.response) {
        console.error("🔴 Response:", error.response.data);
        console.error("🔴 Status:", error.response.status);
      }

      await logError("SPEEDSHIP_API_ERROR", error.message, error.stack, {
        responseData: error.response?.data,
        statusCode: error.response?.status,
      });

      const baseRate = 150;
      const perLbRate = 0.5;
      const estimatedRate = baseRate + finalWeight * perLbRate;

      rates.push({
        service_name: "Speedship Freight (Estimated)",
        service_code: "SPEEDSHIP_FREIGHT_FALLBACK",
        total_price: Math.round(estimatedRate * 100).toString(),
        currency: "USD",
        description: "Estimated 7 business days (Fallback Rate)",
        min_delivery_date: getDeliveryDate(7).toISOString(),
        max_delivery_date: getDeliveryDate(9).toISOString(),
      });
    }

    const totalProcessingTime = Date.now() - startTime;
    console.log(`\n🟢 Total processing time: ${totalProcessingTime}ms`);

    // let quantity = 0;
    // for (const item of items) {
    //   if (
    //     typeof item.properties === "object" &&
    //     Object.keys(item.properties).length > 0
    //   ) {
    //     quantity += Number(item.properties.Quantity);
    //   } else {
    //     quantity += Number(item.quantity);
    //   }
    // }

    // console.log(
    //   "quantity=====================================================>",
    //   quantity
    // );

    // console.log(
    //   "SHOULD_CALL_FEDEX=============================================>",
    //   SHOULD_CALL_FEDEX
    // );

    // if (quantity <= 5) {
    // console.log("🟢 Calling FedEx API for split shipment...");
    // const fedexClient = new FedExClient();
    // const fedexStartTime = Date.now();

    // const fedexResponse = await fedexClient.getSplitShipmentRate(rate);
    // // const fedexResponse = await fedexClient.getAllServiceRates(rate);

    // const fedexResponseTime = Date.now() - fedexStartTime;
    // console.log(`🟢 FedEx API response time: ${fedexResponseTime}ms`);

    // console.log(
    //   "fedexResponse=======================================>",
    //   fedexResponse
    // );
    // }

    // return NextResponse.json({ rates });
    return NextResponse.json({ rates: [] });
  } catch (error: any) {
    console.error("🔴 Speedship Estimate Error:", error);

    await logError("SPEEDSHIP_ESTIMATE_ERROR", error.message, error.stack);

    return NextResponse.json({ rates: [] });
  }
}

function getDeliveryDate(transitDays: number): Date {
  const date = new Date();
  let daysAdded = 0;

  while (daysAdded < transitDays) {
    date.setDate(date.getDate() + 1);
    if (date.getDay() !== 0 && date.getDay() !== 6) {
      daysAdded++;
    }
  }

  return date;
}

interface PalletConfig {
  palletsNeeded: number;
  weightPerPallet: number;
  height: number;
  density: number;
  freightClass: string;
  estimatedSavings: number;
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "Speedship Freight Estimate Service (Multi-Pallet Optimized)",
    version: "4.1.0",
    endpoint: "https://speedship.staging-wwex.com/svc/shopFlow",
    optimizations: [
      "✅ 2500 lb max per pallet (industry standard)",
      "✅ Special handling for 2001-2500 lb range (forces 1 pallet)",
      "✅ Tests multiple pallet configurations",
      "✅ Selects lowest freight class automatically",
      "✅ Optimizes height per weight (30-60 inches)",
      "✅ Stackable pallets enabled (20-40% savings)",
      "✅ Commercial location types",
      "✅ No extra service charges",
      "✅ Always selects cheapest WWEX offer",
    ],
    examples: {
      "2005_lbs": "Uses 1 pallet (saves ~$400-500 vs 2 pallets)",
      "5000_lbs": "Uses 2 pallets @ 2500 lbs each",
      "6000_lbs": "Tests 3-5 pallets, picks cheapest class",
    },
  });
}
// import { NextRequest, NextResponse } from "next/server";
// import crypto from "crypto";
// import axios from "axios";
// import {
//   logRateRequest,
//   logWWEXResponse,
//   getCachedRate,
//   cacheRate,
//   logError,
// } from "@/lib/database";
// import FedExClient from "@/lib/fedex-client";

// // Verify Shopify webhook signature
// function verifyShopifyWebhook(rawBody: string, hmacHeader: string): boolean {
//   const secret = process.env.SHOPIFY_API_SECRET || "";
//   const hash = crypto
//     .createHmac("sha256", secret)
//     .update(rawBody, "utf8")
//     .digest("base64");

//   return hash === hmacHeader;
// }

// // Generate cache key for rate caching
// function generateCacheKey(
//   origin: string,
//   destination: string,
//   weight: number
// ): string {
//   const weightBucket = Math.ceil(weight / 100) * 100;
//   return `speedship-${origin}-${destination}-${weightBucket}`;
// }

// // Calculate freight class based on weight and volume (density)
// function calculateFreightClass(weight: number, volume: number): string {
//   if (volume === 0) return "70";

//   const density = weight / volume; // pounds per cubic foot

//   console.log("Density:", density, "lbs/cubic ft");

//   if (density >= 50) return "50";
//   if (density >= 35) return "55";
//   if (density >= 30) return "60";
//   if (density >= 22.5) return "65";
//   if (density >= 15) return "70";
//   if (density >= 13.5) return "77.5";
//   if (density >= 12) return "85";
//   if (density >= 10.5) return "92.5";
//   if (density >= 9) return "100";
//   if (density >= 8) return "110";
//   if (density >= 7) return "125";
//   if (density >= 6) return "150";
//   if (density >= 5) return "175";
//   if (density >= 4) return "200";
//   if (density >= 3) return "250";
//   if (density >= 2) return "300";
//   if (density >= 1) return "400";
//   return "500";
// }

// // Calculate volume in cubic feet
// function calculateVolume(dimensions: {
//   length: number;
//   width: number;
//   height: number;
// }): number {
//   const volumeCubicInches =
//     dimensions.length * dimensions.width * dimensions.height;
//   return volumeCubicInches / 1728; // Convert to cubic feet
// }

// export async function POST(request: NextRequest) {
//   console.log("🟢 Speedship API - Simple Weight & Pallet Based Rating");
//   const startTime = Date.now();

//   try {
//     // Get raw body for signature verification
//     const rawBody = await request.text();
//     console.log("🟢 rawBody===================", rawBody);
//     const hmacHeader = request.headers.get("X-Shopify-Hmac-Sha256") || "";

//     // Optional: Verify webhook (uncomment in production)
//     // if (!verifyShopifyWebhook(rawBody, hmacHeader)) {
//     //   console.error("🔴 Invalid Shopify webhook signature");
//     //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     // }

//     const body = JSON.parse(rawBody);
//     console.log("🟢 body items===================", body.rate.items);
//     const requestId = `SPEEDSHIP-${Date.now()}-${Math.random()
//       .toString(36)
//       .substr(2, 9)}`;

//     console.log("🟢 Request ID:", requestId);

//     const { rate } = body;

//     if (!rate) {
//       return NextResponse.json({ rates: [] });
//     }

//     const origin = rate.origin?.postal_code || "";
//     const destination = rate.destination || {};
//     const items = rate.items || [];

//     // =====================================================
//     // STEP 1: Calculate Total Weight
//     // =====================================================
//     let totalWeight = 0;
//     let maxPerItemWeight = 0;

//     for (const item of items) {
//       const isEmptyProperties =
//         !item.properties ||
//         (typeof item.properties === "object" &&
//           Object.keys(item.properties).length === 0);

//       let perItemWeight = 0;

//       // Weight from properties (lbs)
//       if (!isEmptyProperties && item.properties?.Weight) {
//         perItemWeight = Number(item.properties.Weight);
//       }
//       // Fallback to Shopify grams → lbs
//       else {
//         const grams = Number(item.grams) || 0;
//         perItemWeight = Number((grams / 453.592).toFixed(2));
//       }

//       // ✅ Track max per-item weight
//       if (perItemWeight > maxPerItemWeight) {
//         maxPerItemWeight = perItemWeight;
//       }

//       const itemQuantity = isEmptyProperties
//         ? item.quantity
//         : item.properties.Quantity || item.quantity;

//       const totalItemWeight = perItemWeight * itemQuantity;
//       totalWeight += totalItemWeight;

//       console.log(
//         `🟢 Item: ${item.name} | ${perItemWeight} lbs × ${itemQuantity} = ${totalItemWeight} lbs`
//       );
//     }

//     console.log(`🟢 TOTAL WEIGHT: ${totalWeight.toFixed(2)} lbs`);

//     const hasHeavyItem = maxPerItemWeight > 150;

//     const SHOULD_CALL_FEDEX = !hasHeavyItem;
//     const SHOULD_CALL_WWEX = true; // always true

//     console.log("🟢 Max per-item weight:", maxPerItemWeight);
//     console.log("🟢 Heavy item present:", hasHeavyItem);
//     console.log("🟢 FedEx eligible:", SHOULD_CALL_FEDEX);

//     const MAX_PALLETS_PER_ORDER = 6; // WWEX LTL limit

//     // =====================================================
//     // STEP 2: Define Standard Pallet Dimensions & Capacity
//     // =====================================================
//     const STANDARD_PALLET = {
//       length: 48, // inches
//       width: 40, // inches
//       height: 48, // inches (adjustable based on load)
//       maxWeight: 2500, // lbs - safe dynamic load capacity
//       // maxWeight: 2000, // lbs - safe dynamic load capacity
//     };

//     // Ensure minimum weight for LTL shipping
//     const finalWeight = Math.max(totalWeight, 150); // Minimum 150 lbs for LTL

//     // Calculate how many pallets needed based on weight
//     const palletsNeeded = Math.ceil(finalWeight / STANDARD_PALLET.maxWeight);
//     const weightPerPallet = finalWeight / palletsNeeded;

//     console.log(`🟢 TOTAL WEIGHT: ${finalWeight} lbs`);
//     console.log(`🟢 PALLETS NEEDED: ${palletsNeeded}`);
//     console.log(`🟢 WEIGHT PER PALLET: ${weightPerPallet.toFixed(2)} lbs`);
//     console.log(
//       `🟢 PALLET SIZE: ${STANDARD_PALLET.length}" × ${STANDARD_PALLET.width}" × ${STANDARD_PALLET.height}"`
//     );

//     // if (palletsNeeded > MAX_PALLETS_PER_ORDER) {
//     //   console.warn(
//     //     `🔴 Order exceeds maximum pallet limit. Needed: ${palletsNeeded}, Max allowed: ${MAX_PALLETS_PER_ORDER}`
//     //   );

//     //   await logError(
//     //     "SPEEDSHIP_MAX_PALLET_EXCEEDED",
//     //     `Order requires ${palletsNeeded} pallets but max is ${MAX_PALLETS_PER_ORDER}`,
//     //     new Error().stack,
//     //     {
//     //       totalWeight: finalWeight,
//     //       palletsNeeded,
//     //       maxPallets: MAX_PALLETS_PER_ORDER,
//     //       requestId,
//     //     }
//     //   );

//     //   // Return empty rates - order too large for LTL
//     //   return NextResponse.json({
//     //     rates: [],
//     //     // Optionally add a message for debugging (won't show to customer in Shopify)
//     //     error: `Shipment requires ${palletsNeeded} pallets. Maximum ${MAX_PALLETS_PER_ORDER} pallets allowed for LTL freight. Please contact us for Volume LTL or Partial Truckload quote.`,
//     //   });
//     // }

//     // console.log(
//     //   `🟢 PALLET SIZE: ${STANDARD_PALLET.length}" × ${STANDARD_PALLET.width}" × ${STANDARD_PALLET.height}"`
//     // );

//     // Log request to database
//     await logRateRequest({
//       requestId,
//       origin,
//       destination,
//       weight: finalWeight,
//       price: parseFloat(rate.order_totals?.subtotal_price || 0),
//       items: items.map((item: any) => ({
//         ...item,
//         shippingMethod: "Speedship API",
//       })),
//     });

//     const rates = [];

//     // =====================================================
//     // STEP 3: Validate US Domestic Shipping Only
//     // =====================================================
//     const originCountry = rate.origin?.country || "US";
//     const destinationCountry = destination.country || "US";

//     if (originCountry !== "US" || destinationCountry !== "US") {
//       console.warn(
//         `🔴 Speedship only supports US domestic shipping. Origin: ${originCountry}, Destination: ${destinationCountry}`
//       );
//       return NextResponse.json({ rates: [] });
//     }

//     // =====================================================
//     // STEP 4: Check Cache
//     // =====================================================
//     const cacheKey = generateCacheKey(
//       origin,
//       destination.postal_code,
//       finalWeight
//     );
//     const cachedRate = await getCachedRate(cacheKey);

//     // if (cachedRate) {
//     //   console.log("🟢 Using cached rate");
//     //   rates.push({
//     //     service_name: "Speedship Freight Shipping",
//     //     service_code: "SPEEDSHIP_FREIGHT",
//     //     total_price: (cachedRate.shipping_rate * 100).toString(),
//     //     currency: "USD",
//     //     description: `Estimated ${cachedRate.transit_days} business days (Cached)`,
//     //     min_delivery_date: getDeliveryDate(
//     //       cachedRate.transit_days
//     //     ).toISOString(),
//     //     max_delivery_date: getDeliveryDate(
//     //       cachedRate.transit_days + 2
//     //     ).toISOString(),
//     //   });

//     //   return NextResponse.json({ rates });
//     // }

//     // =====================================================
//     // STEP 5: Build WWEX API Request with Multiple Pallets
//     // =====================================================
//     const volume = calculateVolume(STANDARD_PALLET);
//     const freightClass = calculateFreightClass(weightPerPallet, volume);

//     console.log(`🟢 Freight Class: ${freightClass}`);

//     // Build handling units array - one entry per pallet
//     const handlingUnitList = [];

//     for (let i = 0; i < palletsNeeded; i++) {
//       // For the last pallet, use remaining weight
//       const isLastPallet = i === palletsNeeded - 1;
//       const palletWeight = isLastPallet
//         ? finalWeight - weightPerPallet * (palletsNeeded - 1)
//         : weightPerPallet;

//       handlingUnitList.push({
//         quantity: 1,
//         packagingType: "PLT",
//         isMixedClass: false,
//         isStackable: true,
//         // isStackable: false,
//         billedDimension: {
//           length: { value: STANDARD_PALLET.length, unit: "IN" },
//           width: { value: STANDARD_PALLET.width, unit: "IN" },
//           height: { value: STANDARD_PALLET.height, unit: "IN" },
//         },
//         weight: {
//           value: Math.ceil(palletWeight),
//           unit: "LB",
//         },
//         shippedItemList: [
//           {
//             quantity: 1,
//             // packagingType: "PLT",
//             commodityDescription: `General Freight - Pallet ${
//               i + 1
//             } of ${palletsNeeded}`,
//             commodityClass: freightClass,
//             isHazMat: false,
//             // dimensions: {
//             //   length: { value: STANDARD_PALLET.length, unit: "IN" },
//             //   width: { value: STANDARD_PALLET.width, unit: "IN" },
//             //   height: { value: STANDARD_PALLET.height, unit: "IN" },
//             // },
//             weight: {
//               value: Math.ceil(palletWeight),
//               unit: "LB",
//             },
//           },
//         ],
//       });
//     }

//     const speedshipRequest = {
//       request: {
//         productType: "LTL",
//         shipment: {
//           shipmentDate: new Date().toISOString().slice(0, 19).replace("T", " "),

//           originAddress: {
//             address: {
//               addressLineList: [rate.origin?.address1 || "Origin Address"],
//               locality: rate.origin?.city || "Los Angeles",
//               region: rate.origin?.province || "CA",
//               postalCode: origin || "90001",
//               countryCode: "US",
//               companyName: rate.origin?.company || "Shipper",
//               phone: rate.origin?.phone || "+18007587447",
//               contactList: [
//                 {
//                   firstName: rate.origin?.first_name || "John",
//                   lastName: rate.origin?.last_name || "Smith",
//                   phone: rate.origin?.phone || "+18007587447",
//                   contactType: "SENDER",
//                 },
//               ],
//             },
//             locationType: "COMMERCIAL",
//           },

//           destinationAddress: {
//             address: {
//               addressLineList: [destination.address1 || "Destination Address"],
//               locality: destination.city || "New York",
//               region: destination.province || "NY",
//               postalCode: destination.postal_code || "10001",
//               countryCode: "US",
//               companyName: destination.company || "Recipient",
//               phone: destination.phone || "+18669987447",
//               contactList: [
//                 {
//                   firstName: destination.first_name || "Jane",
//                   lastName: destination.last_name || "Doe",
//                   phone: destination.phone || "+18669987447",
//                   contactType: "RECEIVER",
//                 },
//               ],
//             },
//             locationType: "COMMERCIAL",
//           },

//           handlingUnitList: handlingUnitList,

//           totalHandlingUnitCount: palletsNeeded,
//           totalWeight: {
//             value: Math.ceil(finalWeight),
//             unit: "LB",
//           },

//           description: "Freight shipment",
//           returnLabelFlag: false,
//           residentialDeliveryFlag: false,
//           residentialPickupFlag: false,
//           isSignatureRequired: false,
//           insuredCommodityCategory: "400",
//           totalDeclaredValue: {
//             value: "0",
//             unit: "USD",
//           },
//           holdAtTerminalFlag: false,
//           insideDeliveryFlag: false,
//           insidePickupFlag: false,
//           carrierTerminalPickupFlag: false,
//           liftgateDeliveryFlag: false,
//           liftgatePickupFlag: false,
//           notifyBeforeDeliveryFlag: false,
//           protectionFromColdFlag: false,
//         },
//       },
//       correlationId: requestId,
//     };

//     console.log("🟢 WWEX Request:", JSON.stringify(speedshipRequest, null, 2));

//     // =====================================================
//     // STEP 6: Call WWEX API
//     // =====================================================
//     const speedshipStartTime = Date.now();

//     try {
//       const response = await axios.post(
//         "https://speedship.staging-wwex.com/svc/shopFlow",
//         speedshipRequest,
//         {
//           headers: {
//             Authorization: `Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ik1EVTBSRUU0TmpFMU5ERTBORUkwTTBGRE5qUXlOemt3TmpSR05VVkZSREpFUlRJM01FUXpPQSJ9.eyJodHRwczovL3NwZWVkc2hpcC53d2V4LmNvbS9wcmltYXJ5Um9sZSI6IkN1c3RvbWVyX0FQSV9NMk0iLCJodHRwczovL3NwZWVkc2hpcC53d2V4LmNvbS9wcmltYXJ5TmFtZXNwYWNlIjoic3Mud3dleC5jdXN0b21lci5XMDAwOTA3MTU2IiwiaHR0cHM6Ly9zcGVlZHNoaXAud3dleC5jb20vc3NVc2VySWQiOiI4aDk0VENwME42ZmcwOWlwUDN5eUptZlBQdjVsMW1DRCIsImh0dHBzOi8vc3BlZWRzaGlwLnd3ZXguY29tL2FwcFR5cGUiOiJNMk0iLCJodHRwczovL3NwZWVkc2hpcC53d2V4LmNvbS9hcHBEb21haW4iOiJXV0VYIiwiaHR0cHM6Ly9zcGVlZHNoaXAud3dleC5jb20vZG9tYWluIjoid3dleCIsImh0dHBzOi8vc3BlZWRzaGlwLnd3ZXguY29tL2FwaVBsYW4iOiJzbWFsbCIsImh0dHBzOi8vc3BlZWRzaGlwLnd3ZXguY29tL2VtYWlsIjoiOGg5NFRDcDBONmZnMDlpcFAzeXlKbWZQUHY1bDFtQ0QiLCJpc3MiOiJodHRwczovL2F1dGguc3RhZ2luZy13d2V4LmNvbS8iLCJzdWIiOiI4aDk0VENwME42ZmcwOWlwUDN5eUptZlBQdjVsMW1DREBjbGllbnRzIiwiYXVkIjoic3RhZ2luZy13d2V4LWFwaWciLCJpYXQiOjE3NjgwMjMwMDYsImV4cCI6MTc2ODEwOTQwNiwiZ3R5IjoiY2xpZW50LWNyZWRlbnRpYWxzIiwiYXpwIjoiOGg5NFRDcDBONmZnMDlpcFAzeXlKbWZQUHY1bDFtQ0QifQ.jA1nf3wo8sNbD4zMoqNpulgfA2_a_9V-g-R2hCMq0uvSW5CICGV4jPxGrS4-BeYwg7F64boAXEUY4hb4spSLTfUyNUHXp6P7ZKNAFeiCsn7NwDjStfa1X11kalETV66wFeVMvmYB3TQ6mgQJLLItz-hNYFuskwEE8fAhAOx2mcSS0Ukjh87YnP8HfebPVkNygTscn6C7JzQHty_gYszueYxYA1dl2PBqqYBD3HbhZ9MG6oUKTBBVVe297vefk5xi9bJ9z-g3UOGKaT4x2AkGBLTO9tjr8zvsKK1hFkvGMb5_BrzYIQEBqZ6KX8KiaU9IiPcootXiQkDxQrx7ya1hpA`,
//             "Content-Type": "application/json",
//           },
//           timeout: 20000,
//         }
//       );

//       const speedshipResponseTime = Date.now() - speedshipStartTime;
//       console.log(`🟢 WWEX API response time: ${speedshipResponseTime}ms`);

//       const offerList = response.data?.response?.offerList || [];

//       if (offerList.length === 0) {
//         throw new Error("No offers returned from WWEX");
//       }

//       // Get best (cheapest) offer
//       const selectedOffer = offerList
//         .filter((o: any) => o.totalOfferPrice?.value)
//         .sort(
//           (a: any, b: any) =>
//             Number(a.totalOfferPrice.value) - Number(b.totalOfferPrice.value)
//         )[0];

//       if (!selectedOffer) {
//         throw new Error("No valid offers with pricing");
//       }

//       const product = selectedOffer.offeredProductList[0];
//       const speedshipRate = Number(product.offerPrice.value);
//       const transitDays =
//         Number(product.shopRQShipment?.timeInTransit?.transitDays) || 5;
//       const serviceLevel =
//         product.shopRQShipment?.timeInTransit?.serviceLevel || "Freight";

//       console.log("🟢 WWEX Rate Details:");
//       console.log(`   - Rate: $${speedshipRate}`);
//       console.log(`   - Transit Days: ${transitDays}`);
//       console.log(`   - Service Level: ${serviceLevel}`);

//       // Log response
//       await logWWEXResponse({
//         requestId,
//         quoteId: selectedOffer.offerId || requestId,
//         rate: speedshipRate,
//         transitDays,
//         serviceLevel: `Speedship ${serviceLevel}`,
//         responseTimeMs: speedshipResponseTime,
//         rawResponse: response.data,
//       });

//       // Cache the rate
//       await cacheRate({
//         cacheKey,
//         origin,
//         destination: destination.postal_code,
//         weightMin: Math.floor(finalWeight / 100) * 100,
//         weightMax: Math.ceil(finalWeight / 100) * 100,
//         rate: speedshipRate,
//         transitDays,
//         expiresInMinutes: 60,
//       });

//       // Add rate to response
//       rates.push({
//         service_name: `Speedship Freight - ${serviceLevel}`,
//         service_code: "SPEEDSHIP_FREIGHT",
//         total_price: (speedshipRate * 100).toString(),
//         currency: "USD",
//         description: `Estimated ${transitDays} business days`,
//         min_delivery_date: getDeliveryDate(transitDays).toISOString(),
//         max_delivery_date: getDeliveryDate(transitDays + 2).toISOString(),
//       });

//       console.log("🟢 Successfully added Speedship rate");
//     } catch (error: any) {
//       console.error("🔴 WWEX API Error:", error.message);
//       if (error.response) {
//         console.error("🔴 Response:", error.response.data);
//         console.error("🔴 Status:", error.response.status);
//       }

//       await logError("SPEEDSHIP_API_ERROR", error.message, error.stack, {
//         responseData: error.response?.data,
//         statusCode: error.response?.status,
//       });

//       // Fallback rate calculation
//       const baseRate = 150;
//       const perLbRate = 0.5;
//       const estimatedRate = baseRate + finalWeight * perLbRate;

//       rates.push({
//         service_name: "Speedship Freight (Estimated)",
//         service_code: "SPEEDSHIP_FREIGHT_FALLBACK",
//         total_price: Math.round(estimatedRate * 100).toString(),
//         currency: "USD",
//         description: "Estimated 7 business days (Fallback Rate)",
//         min_delivery_date: getDeliveryDate(7).toISOString(),
//         max_delivery_date: getDeliveryDate(9).toISOString(),
//       });
//     }

//     const totalProcessingTime = Date.now() - startTime;
//     console.log(`🟢 Total processing time: ${totalProcessingTime}ms`);

//     // let quantity = 0;
//     // for (const item of items) {
//     //   if (
//     //     typeof item.properties === "object" &&
//     //     Object.keys(item.properties).length > 0
//     //   ) {
//     //     quantity += Number(item.properties.Quantity);
//     //   } else {
//     //     quantity += Number(item.quantity);
//     //   }
//     // }

//     // console.log(
//     //   "quantity=====================================================>",
//     //   quantity
//     // );

//     // console.log("SHOULD_CALL_FEDEX=============================================>",SHOULD_CALL_FEDEX);

//     // // if (quantity <= 5) {
//     // console.log("🟢 Calling FedEx API for split shipment...");
//     // const fedexClient = new FedExClient();
//     // const fedexStartTime = Date.now();

//     // const fedexResponse = await fedexClient.getSplitShipmentRate(rate);
//     // // const fedexResponse = await fedexClient.getAllServiceRates(rate);

//     // const fedexResponseTime = Date.now() - fedexStartTime;
//     // console.log(`🟢 FedEx API response time: ${fedexResponseTime}ms`);

//     // console.log(
//     //   "fedexResponse=======================================>",
//     //   fedexResponse
//     // );
//     // // }

//     // return NextResponse.json({ rates });
//     return NextResponse.json({ rates: [] });
//   } catch (error: any) {
//     console.error("🔴 Speedship Estimate Error:", error);

//     await logError("SPEEDSHIP_ESTIMATE_ERROR", error.message, error.stack);

//     return NextResponse.json({ rates: [] });
//   }
// }

// // Calculate delivery date based on transit days
// function getDeliveryDate(transitDays: number): Date {
//   const date = new Date();
//   let daysAdded = 0;

//   while (daysAdded < transitDays) {
//     date.setDate(date.getDate() + 1);
//     // Skip weekends
//     if (date.getDay() !== 0 && date.getDay() !== 6) {
//       daysAdded++;
//     }
//   }

//   return date;
// }

// // Health check endpoint
// export async function GET() {
//   return NextResponse.json({
//     status: "ok",
//     service: "Speedship Freight Estimate Service (Simplified)",
//     version: "2.0.0",
//     endpoint: "https://speedship.staging-wwex.com/svc/shopFlow",
//     method: "Total weight + standard pallet",
//   });
// }
