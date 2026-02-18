// import { NextRequest, NextResponse } from "next/server";
// import crypto from "crypto";
// import axios from "axios";
// import {
//   logRateRequest,
//   logWWEXResponse,
//   logError,
//   getLatestWWEXRate,
//   logFinalShippingRate,
// } from "@/lib/database";
// import FedExClient from "@/lib/fedex-client";
// import { getWWEXToken } from "@/lib/getWWEXToken";
// import SEFLClient from "@/lib/sefl-client";

// // =====================================================
// // CRITICAL: TIMEOUT CONFIGURATION
// // =====================================================
// const MAX_TOTAL_TIME = 10000; // 9 seconds total (leave 1s buffer)
// const FEDEX_TIMEOUT = 4000; // 4 seconds for FedEx
// const WWEX_TIMEOUT = 13000; // 5 seconds for WWEX
// const GEOCODING_TIMEOUT = 1000; // 1 second for geocoding
// const SEFL_TIMEOUT = 9000; // 5 seconds for SEFL initial request
// const SEFL_RETRY_DELAY = 3000; // 3 seconds between SEFL retries
// const SEFL_MAX_RETRIES = 2; // Reduced retries for faster response

// // =====================================================
// // VERIFICATION & CONSTANTS
// // =====================================================

// function verifyShopifyWebhook(rawBody: string, hmacHeader: string): boolean {
//   const secret = process.env.SHOPIFY_API_SECRET || "";
//   const hash = crypto
//     .createHmac("sha256", secret)
//     .update(rawBody, "utf8")
//     .digest("base64");

//   return hash === hmacHeader;
// }

// const FIXED_PALLET_HEIGHT_IN = 35;
// const PALLET_WEIGHT_LBS = 50;
// const geocodingCache = new Map<string, GeocodingResult>();

// interface GeocodingResult {
//   lat: number;
//   lng: number;
// }

// interface ItemGroup {
//   origin: (typeof ORIGIN_ADDRESSES)[keyof typeof ORIGIN_ADDRESSES];
//   originKey: string;
//   items: any[];
//   totalWeight: number;
//   perItemWeight: number;
// }

// const ORIGIN_ADDRESSES = {
//   RLX: {
//     addressLineList: ["312 East 52 Bypass"],
//     locality: "Pilot Mountain",
//     region: "NC",
//     postalCode: "27041",
//     countryCode: "US",
//     coordinates: { lat: 36.3865, lng: -80.4695 },
//   },
//   ARC_AZ: {
//     addressLineList: ["1701 N. 132nd Avenue", "Suite 100"],
//     locality: "Surprise",
//     region: "AZ",
//     postalCode: "85379",
//     countryCode: "US",
//     coordinates: { lat: 33.6292, lng: -112.3679 },
//   },
//   ARC_WI: {
//     addressLineList: ["2025 E. Norse Avenue"],
//     locality: "Cudahy",
//     region: "WI",
//     postalCode: "53110",
//     countryCode: "US",
//     coordinates: { lat: 42.9597, lng: -87.8615 },
//   },
// };

// // Fallback state coordinates
// const STATE_COORDINATES: Record<string, { lat: number; lng: number }> = {
//   AL: { lat: 32.806671, lng: -86.79113 },
//   AK: { lat: 61.370716, lng: -152.404419 },
//   AZ: { lat: 33.729759, lng: -111.431221 },
//   AR: { lat: 34.969704, lng: -92.373123 },
//   CA: { lat: 36.116203, lng: -119.681564 },
//   CO: { lat: 39.059811, lng: -105.311104 },
//   CT: { lat: 41.597782, lng: -72.755371 },
//   DE: { lat: 39.318523, lng: -75.507141 },
//   FL: { lat: 27.766279, lng: -81.686783 },
//   GA: { lat: 33.040619, lng: -83.643074 },
//   HI: { lat: 21.094318, lng: -157.498337 },
//   ID: { lat: 44.240459, lng: -114.478828 },
//   IL: { lat: 40.349457, lng: -88.986137 },
//   IN: { lat: 39.849426, lng: -86.258278 },
//   IA: { lat: 42.011539, lng: -93.210526 },
//   KS: { lat: 38.5266, lng: -96.726486 },
//   KY: { lat: 37.66814, lng: -84.670067 },
//   LA: { lat: 31.169546, lng: -91.867805 },
//   ME: { lat: 44.693947, lng: -69.381927 },
//   MD: { lat: 39.063946, lng: -76.802101 },
//   MA: { lat: 42.230171, lng: -71.530106 },
//   MI: { lat: 43.326618, lng: -84.536095 },
//   MN: { lat: 45.694454, lng: -93.900192 },
//   MS: { lat: 32.741646, lng: -89.678696 },
//   MO: { lat: 38.456085, lng: -92.288368 },
//   MT: { lat: 46.921925, lng: -110.454353 },
//   NE: { lat: 41.12537, lng: -98.268082 },
//   NV: { lat: 38.313515, lng: -117.055374 },
//   NH: { lat: 43.452492, lng: -71.563896 },
//   NJ: { lat: 40.298904, lng: -74.521011 },
//   NM: { lat: 34.840515, lng: -106.248482 },
//   NY: { lat: 42.165726, lng: -74.948051 },
//   NC: { lat: 35.630066, lng: -79.806419 },
//   ND: { lat: 47.528912, lng: -99.784012 },
//   OH: { lat: 40.388783, lng: -82.764915 },
//   OK: { lat: 35.565342, lng: -96.928917 },
//   OR: { lat: 44.572021, lng: -122.070938 },
//   PA: { lat: 40.590752, lng: -77.209755 },
//   RI: { lat: 41.680893, lng: -71.51178 },
//   SC: { lat: 33.856892, lng: -80.945007 },
//   SD: { lat: 44.299782, lng: -99.438828 },
//   TN: { lat: 35.747845, lng: -86.692345 },
//   TX: { lat: 31.054487, lng: -97.563461 },
//   UT: { lat: 40.150032, lng: -111.862434 },
//   VT: { lat: 44.045876, lng: -72.710686 },
//   VA: { lat: 37.769337, lng: -78.169968 },
//   WA: { lat: 47.400902, lng: -121.490494 },
//   WV: { lat: 38.491226, lng: -80.954453 },
//   WI: { lat: 44.268543, lng: -89.616508 },
//   WY: { lat: 42.755966, lng: -107.30249 },
// };

// // =====================================================
// // ULTRA-FAST GEOCODING (Skip if not critical)
// // =====================================================

// async function getDestinationCoords(address: {
//   province?: string;
//   postal_code?: string;
// }): Promise<{ lat: number; lng: number }> {
//   // Priority 1: Use state coordinates (instant)
//   if (address.province && STATE_COORDINATES[address.province]) {
//     return STATE_COORDINATES[address.province];
//   }

//   // Priority 2: Check cache
//   const cacheKey = `${address.province}-${address.postal_code}`;
//   if (geocodingCache.has(cacheKey)) {
//     return geocodingCache.get(cacheKey)!;
//   }

//   // Priority 3: Skip geocoding entirely, use NC as fallback
//   console.log(`⚡ Using NC fallback (no geocoding delay)`);
//   return STATE_COORDINATES["NC"];
// }

// // =====================================================
// // DISTANCE CALCULATION
// // =====================================================

// function calculateDistance(
//   lat1: number,
//   lng1: number,
//   lat2: number,
//   lng2: number,
// ): number {
//   const R = 3959; // Earth's radius in miles
//   const dLat = ((lat2 - lat1) * Math.PI) / 180;
//   const dLng = ((lng2 - lng1) * Math.PI) / 180;
//   const a =
//     Math.sin(dLat / 2) * Math.sin(dLat / 2) +
//     Math.cos((lat1 * Math.PI) / 180) *
//       Math.cos((lat2 * Math.PI) / 180) *
//       Math.sin(dLng / 2) *
//       Math.sin(dLng / 2);
//   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
//   return R * c;
// }

// function findClosestWarehouse(
//   warehouses: Array<"RLX" | "ARC_AZ" | "ARC_WI">,
//   destCoords: { lat: number; lng: number },
// ): "RLX" | "ARC_AZ" | "ARC_WI" {
//   if (warehouses.length === 0) {
//     console.warn("⚠️ No warehouses provided, defaulting to RLX");
//     return "RLX";
//   }

//   let closest = warehouses[0];
//   let minDist = Infinity;

//   for (const wh of warehouses) {
//     const whCoords = ORIGIN_ADDRESSES[wh].coordinates;
//     const dist = calculateDistance(
//       destCoords.lat,
//       destCoords.lng,
//       whCoords.lat,
//       whCoords.lng,
//     );
//     if (dist < minDist) {
//       minDist = dist;
//       closest = wh;
//     }
//   }

//   console.log(
//     `   ✅ Closest warehouse: ${closest} (${minDist.toFixed(0)} miles)`,
//   );

//   return closest;
// }

// // =====================================================
// // PRODUCT AVAILABILITY MATRIX
// // =====================================================

// interface ProductAvailability {
//   rlx: boolean;
//   arc: boolean;
// }

// const PRODUCT_AVAILABILITY_MATRIX: Record<
//   string,
//   Record<string, ProductAvailability>
// > = {
//   // ROLLS
//   ROLL: {
//     "1/4-BLACK": { rlx: true, arc: true },
//     "1/4-10%COLOR": { rlx: true, arc: true },
//     "1/4-CONFETTI": { rlx: true, arc: false },
//     "8mm-BLACK": { rlx: true, arc: true },
//     "8mm-10%COLOR": { rlx: true, arc: true },
//     "8mm-CONFETTI": { rlx: true, arc: false },
//     "3/8-BLACK": { rlx: true, arc: true },
//     "3/8-10%COLOR": { rlx: true, arc: true },
//     "3/8-CONFETTI": { rlx: true, arc: false },
//     "1/2-BLACK": { rlx: true, arc: true },
//     "1/2-10%COLOR": { rlx: true, arc: true },
//     "1/2-CONFETTI": { rlx: true, arc: false },
//     "3/4-BLACK": { rlx: true, arc: false },
//     "3/4-10%COLOR": { rlx: true, arc: false },
//   },

//   // TILES
//   TILE: {
//     "1/4-BLACK": { rlx: true, arc: false },
//     "1/4-10%COLOR": { rlx: true, arc: false },
//     "8mm-BLACK": { rlx: true, arc: true },
//     "8mm-10%COLOR": { rlx: true, arc: true },
//     "3/8-BLACK": { rlx: true, arc: false },
//     "3/8-10%COLOR": { rlx: true, arc: false },
//     "1/2-BLACK": { rlx: true, arc: false },
//     "1/2-10%COLOR": { rlx: true, arc: false },
//     "3/4-BLACK": { rlx: true, arc: false },
//     "3/4-10%COLOR": { rlx: true, arc: false },
//   },

//   // MATS
//   MAT: {
//     "1/4-4x3-BLACK": { rlx: true, arc: true },
//     "1/4-4x3-10%COLOR": { rlx: true, arc: true },
//     "1/4-4x3-CONFETTI": { rlx: true, arc: false },
//     "1/4-4x6-BLACK": { rlx: true, arc: true },
//     "1/4-4x6-10%COLOR": { rlx: true, arc: true },
//     "1/4-4x6-CONFETTI": { rlx: true, arc: false },
//     "1/4-4x8-BLACK": { rlx: true, arc: true },
//     "1/4-4x8-10%COLOR": { rlx: true, arc: true },
//     "1/4-4x8-CONFETTI": { rlx: true, arc: false },

//     "3/8-4x3-BLACK": { rlx: true, arc: true },
//     "3/8-4x3-10%COLOR": { rlx: true, arc: true },
//     "3/8-4x3-CONFETTI": { rlx: true, arc: false },
//     "3/8-4x6-BLACK": { rlx: true, arc: true },
//     "3/8-4x6-10%COLOR": { rlx: true, arc: true },
//     "3/8-4x6-CONFETTI": { rlx: true, arc: false },
//     "3/8-4x8-BLACK": { rlx: true, arc: true },
//     "3/8-4x8-10%COLOR": { rlx: true, arc: true },
//     "3/8-4x8-CONFETTI": { rlx: true, arc: false },

//     "1/2-4x3-BLACK": { rlx: true, arc: true },
//     "1/2-4x3-10%COLOR": { rlx: true, arc: true },
//     "1/2-4x3-CONFETTI": { rlx: true, arc: false },
//     "1/2-4x6-BLACK": { rlx: true, arc: true },
//     "1/2-4x6-10%COLOR": { rlx: true, arc: true },
//     "1/2-4x6-CONFETTI": { rlx: true, arc: false },
//     "1/2-4x8-BLACK": { rlx: true, arc: true },
//     "1/2-4x8-10%COLOR": { rlx: true, arc: true },
//     "1/2-4x8-CONFETTI": { rlx: true, arc: false },

//     "3/4-4x3-BLACK": { rlx: true, arc: false },
//     "3/4-4x3-10%COLOR": { rlx: true, arc: false },
//     "3/4-4x3-CONFETTI": { rlx: true, arc: false },
//     "3/4-4x6-BLACK": { rlx: true, arc: false },
//     "3/4-4x6-10%COLOR": { rlx: true, arc: false },
//     "3/4-4x6-CONFETTI": { rlx: true, arc: false },
//     "3/4-4x8-BLACK": { rlx: true, arc: false },
//     "3/4-4x8-10%COLOR": { rlx: true, arc: false },
//     "3/4-4x8-CONFETTI": { rlx: true, arc: false },
//   },

//   // ACCESSORIES - RLX Only
//   ADHESIVE: {
//     "RLX-100-1GAL": { rlx: true, arc: false },
//     "RLX-100-4GAL": { rlx: true, arc: false },
//     "RLX-110-2GAL": { rlx: true, arc: false },
//     "MAPEI-4GAL": { rlx: true, arc: false },
//   },

//   CLEANER: {
//     "CLX-1GAL": { rlx: true, arc: false },
//   },

//   TAPE: {
//     "RLX-DS-3X75": { rlx: true, arc: false },
//     "RLX-DS-3X75-3": { rlx: true, arc: false },
//     "RLX-DS-3X75-3C": { rlx: true, arc: false },
//   },
// };

// // =====================================================
// // HELPER FUNCTIONS
// // =====================================================

// type ProductType =
//   | "ROLL"
//   | "TILE"
//   | "MAT"
//   | "ADHESIVE"
//   | "CLEANER"
//   | "TAPE"
//   | "UNKNOWN";

// function detectProductType(item: any): ProductType {
//   const title = `${item.name || ""} ${item.variant_title || ""}`.toLowerCase();

//   // Accessories first
//   if (title.includes("tape") || title.includes("flooring tape")) return "TAPE";
//   if (title.includes("adhesive") || title.includes("glue")) return "ADHESIVE";
//   if (title.includes("cleaner")) return "CLEANER";

//   // Main products
//   if (title.includes("tile")) return "TILE";
//   if (title.includes("mat")) return "MAT";
//   if (title.includes("roll")) return "ROLL";

//   // Check properties for size indicators
//   if (item.properties?.["Width (ft)"] && item.properties?.["Length (ft)"]) {
//     return "ROLL";
//   }

//   return "UNKNOWN";
// }

// function extractThickness(title: string): string | null {
//   // Extract thickness in order of specificity
//   if (title.includes("3/4") || title.includes('3/4"')) return "3/4";
//   if (title.includes("1/2") || title.includes('1/2"')) return "1/2";
//   if (title.includes("3/8") || title.includes('3/8"')) return "3/8";
//   if (title.includes("1/4") || title.includes('1/4"')) return "1/4";
//   if (title.includes("8mm") || title.includes("8 mm")) return "8mm";

//   return null;
// }

// function extractMatSize(item: any): string | null {
//   const title = `${item.name || ""}`.toLowerCase();

//   // Check properties first
//   if (item.properties?.["Width (ft)"] && item.properties?.["Length (ft)"]) {
//     const width = parseFloat(item.properties["Width (ft)"]);
//     const length = parseFloat(item.properties["Length (ft)"]);
//     return `${width}x${length}`;
//   }

//   // Parse from title
//   const patterns = [
//     /(\d+)'?\s*x\s*(\d+)'?/i, // 4x6 or 4'x6'
//     /(\d+)\s*ft\s*x\s*(\d+)\s*ft/i, // 4 ft x 6 ft
//   ];

//   for (const pattern of patterns) {
//     const match = title.match(pattern);
//     if (match) {
//       return `${match[1]}x${match[2]}`;
//     }
//   }

//   return null;
// }

// function detectColorType(title: string): "BLACK" | "10%COLOR" | "CONFETTI" {
//   // Confetti check first (most specific)
//   if (title.includes("confetti")) return "CONFETTI";

//   // ARC exclusive colors (10% COLOR category)
//   if (
//     title.includes("bright green") ||
//     title.includes("silver") ||
//     title.includes("white")
//   ) {
//     return "10%COLOR";
//   }

//   // RLX exclusive colors (10% COLOR category)
//   if (
//     title.includes("gray") ||
//     title.includes("grey") ||
//     title.includes("blugray") ||
//     title.includes("blue gray") ||
//     title.includes("forest green") ||
//     title.includes("green") ||
//     title.includes("cocoa")
//   ) {
//     return "10%COLOR";
//   }

//   // Shared colors (10% COLOR category)
//   if (
//     title.includes("blue") ||
//     title.includes("orange") ||
//     title.includes("red")
//   ) {
//     return "10%COLOR";
//   }

//   // Default to black
//   return "BLACK";
// }

// // =====================================================
// // MAIN ROUTING FUNCTION - OPTIMIZED WITH FULL MATRIX
// // =====================================================

// function getSimplifiedRouting(item: any): Array<"RLX" | "ARC_AZ" | "ARC_WI"> {
//   const title = `${item.name || ""} ${item.variant_title || ""}`.toLowerCase();

//   // STEP 1: Detect product type
//   const productType = detectProductType(item);

//   // STEP 2: Handle accessories (always RLX only)
//   if (
//     productType === "ADHESIVE" ||
//     productType === "CLEANER" ||
//     productType === "TAPE"
//   ) {
//     return ["RLX"];
//   }

//   // STEP 3: Handle unknown products (fallback to all warehouses)
//   if (productType === "UNKNOWN") {
//     console.warn(`⚠️ Unknown product type: ${item.name}`);
//     return ["RLX", "ARC_AZ", "ARC_WI"];
//   }

//   // STEP 4: Extract thickness
//   const thickness = extractThickness(title);
//   if (!thickness) {
//     console.warn(`⚠️ Could not extract thickness: ${item.name}`);
//     return ["RLX", "ARC_AZ", "ARC_WI"];
//   }

//   // STEP 5: Build availability key
//   let availabilityKey = "";

//   if (productType === "MAT") {
//     const matSize = extractMatSize(item);
//     if (!matSize) {
//       console.warn(`⚠️ Could not extract mat size: ${item.name}`);
//       return ["RLX", "ARC_AZ", "ARC_WI"];
//     }
//     const colorType = detectColorType(title);
//     availabilityKey = `${thickness}-${matSize}-${colorType}`;
//   } else {
//     // ROLL or TILE
//     const colorType = detectColorType(title);
//     availabilityKey = `${thickness}-${colorType}`;
//   }

//   // STEP 6: Look up in matrix
//   const typeMatrix = PRODUCT_AVAILABILITY_MATRIX[productType];

//   if (!typeMatrix || !typeMatrix[availabilityKey]) {
//     console.warn(
//       `⚠️ Not found in matrix: ${productType} -> ${availabilityKey}`,
//     );
//     console.warn(`   Product: ${item.name}`);
//     // Fallback to all warehouses
//     return ["RLX", "ARC_AZ", "ARC_WI"];
//   }

//   const availability = typeMatrix[availabilityKey];

//   console.log(`   ✅ Found in Product Matrix:`);
//   console.log(`      RLX Available: ${availability.rlx ? "✅" : "❌"}`);
//   console.log(`      ARC Available: ${availability.arc ? "✅" : "❌"}`);

//   // STEP 7: Build warehouse list
//   const warehouses: Array<"RLX" | "ARC_AZ" | "ARC_WI"> = [];

//   if (availability.rlx) {
//     warehouses.push("RLX");
//   }

//   if (availability.arc) {
//     warehouses.push("ARC_AZ", "ARC_WI");
//   }

//   // STEP 8: Apply color-based exclusions (additional check)
//   const colorExclusions = applyColorExclusions(title, warehouses);

//   if (colorExclusions.length === 0) {
//     console.warn(`⚠️ No warehouses available after color check: ${item.name}`);
//     return ["RLX"]; // Fallback to RLX
//   }

//   let finalRlxAvailable: boolean;
//   let finalArcAvailable: boolean;
//   let finalNotes: string;

//   console.log(
//     "colorExclusions==================================================================>",
//     colorExclusions,
//   );

//   if (availability) {
//     // We have product matrix data - combine with color check
//     const arcAvailableAfterColor =
//       colorExclusions.includes("ARC_AZ") || colorExclusions.includes("ARC_WI");

//     // Final availability = Product Matrix AND Color Filter
//     finalRlxAvailable = availability.rlx && colorExclusions.includes("RLX");

//     finalArcAvailable = availability.arc && arcAvailableAfterColor;

//     console.log(
//       `   📊 Product Matrix: RLX=${availability.rlx}, ARC=${availability.arc}`,
//     );
//     console.log(
//       `   🎨 Color Check: RLX=${colorExclusions.includes("RLX")}, ARC=${arcAvailableAfterColor}`,
//     );
//     console.log(
//       `   ✅ FINAL (Product AND Color): RLX=${finalRlxAvailable}, ARC=${finalArcAvailable}`,
//     );

//     if (
//       !finalRlxAvailable &&
//       availability.rlx &&
//       !colorExclusions.includes("RLX")
//     ) {
//       finalNotes = `Product available at RLX but color ${title} is not`;
//     } else if (
//       !finalArcAvailable &&
//       availability.arc &&
//       !arcAvailableAfterColor
//     ) {
//       finalNotes = `Product available at ARC but color ${title} is not`;
//     } else if (finalRlxAvailable && !finalArcAvailable) {
//       finalNotes = `Available only at RLX`;
//     } else if (!finalRlxAvailable && finalArcAvailable) {
//       finalNotes = `Available only at ARC`;
//     } else if (finalRlxAvailable && finalArcAvailable) {
//       finalNotes = `Available at both RLX and ARC`;
//     } else {
//       finalNotes = `Not available at any warehouse`;
//     }

//     let warehouseList: Array<"RLX" | "ARC_AZ" | "ARC_WI"> = [];

//     if (finalRlxAvailable) {
//       warehouseList.push("RLX");
//     }
//     if (finalArcAvailable) {
//       warehouseList.push("ARC_AZ", "ARC_WI");
//     }

//     console.log(
//       "================================================>warehouseList",
//       warehouseList,
//     );
//     return warehouseList;
//   }

//   return colorExclusions;
// }

// // =====================================================
// // COLOR-BASED EXCLUSIONS (Secondary check)
// // =====================================================

// function applyColorExclusions(
//   title: string,
//   warehouses: Array<"RLX" | "ARC_AZ" | "ARC_WI">,
// ): Array<"RLX" | "ARC_AZ" | "ARC_WI"> {
//   // Shared colors (available at all warehouses)
//   if (
//     title.includes("black") ||
//     title.includes("blue") ||
//     title.includes("orange") ||
//     title.includes("red")
//   ) {
//     console.log(`   🎨 Color Check: ${title} is available at both warehouses`);
//     console.log(`      RLX Available: ✅`);
//     console.log(`      ARC Available: ✅`);
//     // return warehouses.filter(
//     //   (wh) => wh === "RLX" || wh === "ARC_AZ" || wh === "ARC_WI",
//     // );
//     return ["RLX", "ARC_AZ", "ARC_WI"];
//   }

//   // ARC exclusive colors
//   if (
//     title.includes("bright green") ||
//     title.includes("silver") ||
//     title.includes("white")
//   ) {
//     console.log(`   🎨 Color Check: ${title} is ARC exclusive`);
//     console.log(`      RLX Available: ❌`);
//     console.log(`      ARC Available: ✅`);
//     // return warehouses.filter((wh) => wh === "ARC_AZ" || wh === "ARC_WI");
//     return ["ARC_AZ", "ARC_WI"];
//   }

//   // RLX exclusive colors
//   if (
//     title.includes("confetti") ||
//     title.includes("gray") ||
//     title.includes("grey") ||
//     title.includes("blugray") ||
//     title.includes("forest green") ||
//     (title.includes("green") && !title.includes("bright")) ||
//     title.includes("cocoa")
//   ) {
//     console.log(`   🎨 Color Check: ${title} is RLX exclusive`);
//     console.log(`      RLX Available: ✅`);
//     console.log(`      ARC Available: ❌`);
//     // return warehouses.filter((wh) => wh === "RLX");
//     return ["RLX"];
//   }

//   // No exclusions - return all warehouses
//   return warehouses;
// }

// // =====================================================
// // ULTRA-FAST WAREHOUSE OPTIMIZATION
// // =====================================================

// // function quickWarehouseSelection(
// //   items: any[],
// //   destCoords: { lat: number; lng: number },
// // ): Map<string, ItemGroup> {
// //   console.log("⚡ Ultra-fast warehouse selection...");

// //   const itemsByOrigin = new Map<string, ItemGroup>();

// //   let warehouses: Array<"RLX" | "ARC_AZ" | "ARC_WI"> = [];
// //   // Check for exclusive items
// //   const exclusiveItems = items
// //     .map((item) => ({
// //       item,
// //       warehouses: getSimplifiedRouting(item),
// //       weight: Number(item.grams / 453.592),
// //     }))
// //     // .filter((info) => info.warehouses.length === 1);

// //     console.log("exclusiveItems===================================>",exclusiveItems)

// //   if (exclusiveItems.length > 0) {
// //     // If all exclusive items are from same warehouse, consolidate there
// //     const exclusiveWH = exclusiveItems[0].warehouses[0];
// //     const allSameWH = exclusiveItems.every(
// //       (info) => info.warehouses[0] === exclusiveWH,
// //     );

// //     if (allSameWH) {
// //       console.log(`⚡ Consolidating all to ${exclusiveWH}`);
// //       const group: ItemGroup = {
// //         origin: ORIGIN_ADDRESSES[exclusiveWH],
// //         originKey: exclusiveWH,
// //         items: [],
// //         totalWeight: 0,
// //         perItemWeight: 0,
// //       };

// //       for (const item of items) {
// //         const weight = Number(item.grams / 453.592);
// //         const quantity = item.quantity || 1;
// //         group.items.push(item);
// //         group.totalWeight += weight * quantity;
// //       }

// //       itemsByOrigin.set(exclusiveWH, group);
// //       return itemsByOrigin;
// //     }
// //   }

// //   // Default: route to closest warehouse
// //   for (const item of items) {
// //     const warehouses = getSimplifiedRouting(item);
// //     const closest = findClosestWarehouse(warehouses, destCoords);

// //     if (!itemsByOrigin.has(closest)) {
// //       itemsByOrigin.set(closest, {
// //         origin: ORIGIN_ADDRESSES[closest],
// //         originKey: closest,
// //         items: [],
// //         totalWeight: 0,
// //         perItemWeight: 0,
// //       });
// //     }

// //     const group = itemsByOrigin.get(closest)!;
// //     const weight = Number(item.grams / 453.592);
// //     const quantity = item.quantity || 1;
// //     group.items.push(item);
// //     group.totalWeight += weight * quantity;
// //   }

// //   return itemsByOrigin;
// // }
// function quickWarehouseSelection(
//   items: any[],
//   destCoords: { lat: number; lng: number },
// ): Map<string, ItemGroup> {
//   console.log("⚡ Ultra-fast warehouse selection...");

//   const itemsByOrigin = new Map<string, ItemGroup>();

//   // Get routing info for all items
//   const itemRoutingInfo = items.map((item) => ({
//     item,
//     warehouses: getSimplifiedRouting(item),
//     weight: Number(item.grams / 453.592),
//   }));

//   console.log(
//     "itemRoutingInfo==================================>",
//     itemRoutingInfo,
//   );

//   // STRATEGY 1: Check if all items can ship from a single warehouse
//   const commonWarehouses = findCommonWarehouses(itemRoutingInfo);

//   if (commonWarehouses.length > 0) {
//     // Find the closest warehouse among those that can fulfill ALL items
//     const closest = findClosestWarehouse(commonWarehouses, destCoords);
//     console.log(`⚡ Consolidating all items to ${closest} (can fulfill all)`);

//     const group: ItemGroup = {
//       origin: ORIGIN_ADDRESSES[closest],
//       originKey: closest,
//       items: [],
//       totalWeight: 0,
//       perItemWeight: 0,
//     };

//     for (const info of itemRoutingInfo) {
//       const weight = info.weight;
//       const quantity = info.item.quantity || 1;
//       group.items.push(info.item);
//       group.totalWeight += weight * quantity;
//     }

//     itemsByOrigin.set(closest, group);
//     return itemsByOrigin;
//   }

//   // STRATEGY 2: Split shipment - route each item to its closest available warehouse
//   console.log("⚡ Splitting shipment across multiple warehouses");

//   for (const info of itemRoutingInfo) {
//     const closest = findClosestWarehouse(info.warehouses, destCoords);

//     if (!itemsByOrigin.has(closest)) {
//       itemsByOrigin.set(closest, {
//         origin: ORIGIN_ADDRESSES[closest],
//         originKey: closest,
//         items: [],
//         totalWeight: 0,
//         perItemWeight: 0,
//       });
//     }

//     const group = itemsByOrigin.get(closest)!;
//     const weight = info.weight;
//     const quantity = info.item.quantity || 1;
//     group.items.push(info.item);
//     group.totalWeight += weight * quantity;
//   }

//   return itemsByOrigin;
// }

// // Helper function to find warehouses that can fulfill ALL items
// function findCommonWarehouses(
//   itemRoutingInfo: Array<{
//     item: any;
//     warehouses: Array<"RLX" | "ARC_AZ" | "ARC_WI">;
//     weight: number;
//   }>,
// ): Array<"RLX" | "ARC_AZ" | "ARC_WI"> {
//   if (itemRoutingInfo.length === 0) return [];

//   // Start with the first item's warehouses
//   let common = [...itemRoutingInfo[0].warehouses];

//   // Intersect with each subsequent item's warehouses
//   for (let i = 1; i < itemRoutingInfo.length; i++) {
//     common = common.filter((wh) => itemRoutingInfo[i].warehouses.includes(wh));

//     // Early exit if no common warehouses remain
//     if (common.length === 0) break;
//   }

//   console.log(`   📦 Common warehouses for all items: [${common.join(", ")}]`);
//   return common;
// }

// // =====================================================
// // OPTIMIZED PALLET CALCULATION (Simplified)
// // =====================================================

// function optimizeMultiPalletConfiguration(totalWeight: number): {
//   palletsNeeded: number;
//   weightPerPallet: number;
//   freightClass: string;
//   totalWeightWithPallets: number;
// } {
//   const MAX_SAFE_WEIGHT = 2000;
//   const palletsNeeded = Math.ceil(totalWeight / MAX_SAFE_WEIGHT);
//   const weightPerPallet = totalWeight / palletsNeeded;

//   // ADD PALLET WEIGHT HERE
//   const totalWeightWithPallets =
//     totalWeight + PALLET_WEIGHT_LBS * palletsNeeded;

//   // Simplified class calculation
//   const volume = (48 * 40 * FIXED_PALLET_HEIGHT_IN) / 1728;
//   const density = weightPerPallet / volume;

//   let freightClass = "70";
//   if (density >= 30) freightClass = "60";
//   else if (density >= 22.5) freightClass = "70";
//   else if (density < 22.5) freightClass = "77.5";

//   return {
//     palletsNeeded,
//     weightPerPallet,
//     freightClass,
//     totalWeightWithPallets,
//   };
// }

// // =====================================================
// // WWEX RATE WITH AGGRESSIVE TIMEOUT
// // =====================================================

// async function getWWEXRateFast(
//   originKey: string,
//   group: ItemGroup,
//   destination: any,
//   rate: any,
// ): Promise<any> {
//   const startTime = Date.now();

//   try {
//     const adjustedTotalWeight = group.totalWeight + PALLET_WEIGHT_LBS;

//     // const config = optimizeMultiPalletConfiguration(adjustedTotalWeight);
//     const config = optimizeMultiPalletConfiguration(group.totalWeight);

//     const handlingUnitList = [];
//     for (let i = 0; i < config.palletsNeeded; i++) {
//       // const palletWeight =
//       //   i === config.palletsNeeded - 1
//       //     ? group.totalWeight -
//       //       config.weightPerPallet * (config.palletsNeeded - 1)
//       //     : config.weightPerPallet;
//       const productWeightOnPallet =
//         i === config.palletsNeeded - 1
//           ? group.totalWeight -
//             config.weightPerPallet * (config.palletsNeeded - 1)
//           : config.weightPerPallet;

//       // Add pallet weight (50 lbs) to each pallet
//       const totalPalletWeight = productWeightOnPallet + PALLET_WEIGHT_LBS;

//       handlingUnitList.push({
//         quantity: 1,
//         packagingType: "PLT",
//         isStackable: false,
//         billedDimension: {
//           length: { value: 48, unit: "IN" },
//           width: { value: 40, unit: "IN" },
//           height: { value: FIXED_PALLET_HEIGHT_IN, unit: "IN" },
//         },
//         // weight: { value: palletWeight, unit: "LB" },
//         weight: { value: totalPalletWeight, unit: "LB" },
//         shippedItemList: [
//           {
//             commodityClass: config.freightClass,
//             isHazMat: false,
//             // weight: { value: palletWeight, unit: "LB" },
//             weight: { value: totalPalletWeight, unit: "LB" },
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
//               ...group.origin,
//               companyName: rate.origin?.company || "",
//               phone: rate.origin?.phone || "",
//               contactList: [
//                 {
//                   firstName: rate.origin?.first_name || "",
//                   lastName: rate.origin?.last_name || "",
//                   phone: rate.origin?.phone || "",
//                   contactType: "SENDER",
//                 },
//               ],
//             },
//             locationType: "COMMERCIAL",
//           },
//           destinationAddress: {
//             address: {
//               addressLineList: [destination.address1 || ""],
//               locality: destination.city || "",
//               region: destination.province || "",
//               postalCode: destination.postal_code || "",
//               countryCode: "US",
//               companyName: destination.company || "",
//               phone: destination.phone || "",
//               contactList: [
//                 {
//                   firstName: destination.first_name || "",
//                   lastName: destination.last_name || "",
//                   phone: destination.phone || "",
//                   contactType: "RECEIVER",
//                 },
//               ],
//             },
//             locationType: "RESIDENTIAL",
//           },
//           handlingUnitList: handlingUnitList,
//           totalHandlingUnitCount: config.palletsNeeded,
//           // totalWeight: { value: group.totalWeight, unit: "LB" },
//           totalWeight: { value: config.totalWeightWithPallets, unit: "LB" },
//           returnLabelFlag: false,
//           residentialDeliveryFlag: true,
//           residentialPickupFlag: false,
//           isSignatureRequired: false,
//           appointmentDeliveryFlag: false,
//           holdAtTerminalFlag: false,
//           insideDeliveryFlag: false,
//           insidePickupFlag: false,
//           carrierTerminalPickupFlag: false,
//           liftgateDeliveryFlag: true,
//           liftgatePickupFlag: false,
//           notifyBeforeDeliveryFlag: true,
//           protectionFromColdFlag: false,
//           insuredCommodityCategory: "400",
//           totalDeclaredValue: { value: "0", unit: "USD" },
//         },
//       },
//       correlationId: `${Date.now()}-${originKey}`,
//     };

//     console.log(
//       "\n🟢 WWEX Request:",
//       JSON.stringify(speedshipRequest, null, 2),
//     );

//     // const token = await getAccessToken();
//     const token = await getWWEXToken();

//     const speedshipStartTime = Date.now();

//     const response = await axios.post(
//       "https://www.speedship.com/svc/shopFlow",
//       speedshipRequest,
//       {
//         headers: {
//           Authorization: `Bearer ${token}`,
//           "Content-Type": "application/json",
//         },
//         timeout: WWEX_TIMEOUT,
//       },
//     );

//     const speedshipResponseTime = Date.now() - speedshipStartTime;
//     console.log(
//       `🟢 WWEX API response time for ${originKey}: ${speedshipResponseTime}ms`,
//     );

//     const offerList = response.data?.response?.offerList || [];
//     if (offerList.length === 0) return null;

//     const sortedOffers = offerList
//       .filter((o: any) => o.totalOfferPrice?.value)
//       .sort(
//         (a: any, b: any) =>
//           Number(a.totalOfferPrice.value) - Number(b.totalOfferPrice.value),
//       );

//     const selectedOffer = sortedOffers[0];
//     if (!selectedOffer) return null;

//     const product = selectedOffer.offeredProductList[0];
//     const speedshipRate = Number(product.offerPrice.value);
//     const transitDays =
//       Number(product.shopRQShipment?.timeInTransit?.transitDays) || 5;

//     console.log(
//       `✅ WWEX ${originKey}: $${speedshipRate} (${Date.now() - startTime}ms)`,
//     );

//     return {
//       originKey,
//       // rate: speedshipRate * 1.06, // Add 6% surcharge
//       rate: speedshipRate * 1.15, // Add 15% surcharge
//       transitDays,
//       palletsNeeded: config.palletsNeeded,
//       // weight: group.totalWeight,
//       weight: config.totalWeightWithPallets,
//     };
//   } catch (error: any) {
//     console.warn(`⚠️ WWEX ${originKey} failed: ${error.message}`);

//     await logError(`WWEX_${originKey}`, error.message, error.stack, {
//       responseData: error.response?.data,
//       statusCode: error.response?.status,
//       origin: originKey,
//     });

//     return null;
//   }
// }

// // =====================================================
// // FEDEX PRE-PROCESSING (Reuse your existing logic)
// // =====================================================

// async function preprocessFedExPackagesFast(
//   itemsByOrigin: Map<string, ItemGroup>,
// ): Promise<Map<string, any[]>> {
//   const fedexClient = new FedExClient();
//   const packagesByOrigin = new Map<string, any[]>();

//   for (const [originKey, group] of itemsByOrigin.entries()) {
//     const shopifyItems = group.items.map((item: any) => ({
//       name: item.name,
//       sku: item.sku || "",
//       quantity: item.quantity || 1,
//       grams: item.grams || 0,
//       price: item.price || 0,
//       properties: item.properties || {},
//       product_id: item.product_id || 0,
//       variant_id: item.variant_id || 0,
//     }));

//     const processedItems = fedexClient.processShopifyItemsPublic(shopifyItems);
//     const consolidatedPackages =
//       fedexClient.consolidatePackagesPublic(processedItems);

//     packagesByOrigin.set(originKey, consolidatedPackages);
//   }

//   return packagesByOrigin;
// }

// // =====================================================
// // SEFL RATE - OPTIMIZED WITH PROPER CONFIG
// // =====================================================

// async function getSEFLRateFast(
//   originKey: string,
//   group: ItemGroup,
//   destination: any,
// ): Promise<any> {
//   const startTime = Date.now();

//   try {
//     // const adjustedTotalWeight = group.totalWeight + PALLET_WEIGHT_LBS;
//     const adjustedTotalWeight = group.totalWeight;
//     const config = optimizeMultiPalletConfiguration(adjustedTotalWeight);

//     const seflWeight = adjustedTotalWeight;
//     const freightClass = parseInt(config.freightClass);

//     // ✅ CRITICAL FIX: Properly configured SEFL client
//     const seflClient = new SEFLClient({
//       username: process.env.SEFL_USERNAME || "",
//       password: process.env.SEFL_PASSWORD || "",
//       customerAccount: process.env.SEFL_CUSTOMER_ACCOUNT || "",
//       // Optional - these are already defaulted in the client
//       customerName: "ELITE FLOOR SUPPLY",
//       customerStreet: "STAFFORD",
//       customerCity: "STAFFORD",
//       customerState: "TX",
//       customerZip: "77477",
//       emailAddress: "nabit@sasbrandsloop.com",
//       maxRetries: SEFL_MAX_RETRIES,
//       retryDelay: SEFL_RETRY_DELAY,
//       timeout: SEFL_TIMEOUT,
//     });

//     console.log(`\n🟣 SEFL Request for ${originKey}:`);
//     console.log(`   Weight: ${seflWeight} lbs`);
//     console.log(`   Freight Class: ${freightClass}`);
//     console.log(`   Origin: ${group.origin.locality}, ${group.origin.region}`);
//     console.log(`   Destination: ${destination.city}, ${destination.province}`);

//     const seflStartTime = Date.now();

//     const result = await Promise.race([
//       seflClient.getShippingRate({
//         origin: {
//           zip: group.origin.postalCode,
//           city: group.origin.locality,
//           state: group.origin.region,
//         },
//         destination: {
//           zip: destination.postal_code || "",
//           city: destination.city || "",
//           state: destination.province || "",
//         },
//         pickupDate: new Date(),
//         terms: "P",
//         freightClass: freightClass,
//         weight: seflWeight,
//         units: 1,
//         length: 48,
//         width: 40,
//         height: FIXED_PALLET_HEIGHT_IN,
//         packageType: "PLT",
//         chkLAP: "on",
//         chkLGD: "on",
//         chkAN: "on",
//       }),
//       new Promise<null>((_, reject) =>
//         setTimeout(() => reject(new Error("SEFL timeout")), SEFL_TIMEOUT),
//       ),
//     ]);

//     const seflResponseTime = Date.now() - seflStartTime;
//     console.log(
//       `🟣 SEFL API response time for ${originKey}: ${seflResponseTime}ms`,
//     );

//     if (!result || !result.success || !result.rate) {
//       console.warn(`⚠️ SEFL ${originKey}: No rate returned`);
//       return null;
//     }

//     const seflRate = result.rate;
//     const transitDays = result.transitDays || 5;

//     console.log(
//       `✅ SEFL ${originKey}: $${seflRate} (${Date.now() - startTime}ms)`,
//     );

//     return {
//       originKey,
//       rate: seflRate * 1.15, // 15% markup
//       transitDays,
//       weight: seflWeight,
//       quoteNumber: result.quoteNumber,
//     };
//   } catch (error: any) {
//     console.warn(`⚠️ SEFL ${originKey} failed: ${error.message}`);
//     return null;
//   }
// }

// // =====================================================
// // MAIN POST FUNCTION - ULTRA-OPTIMIZED
// // =====================================================

// export async function POST(request: NextRequest) {
//   console.log("⚡ SPEEDSHIP API - ULTRA-OPTIMIZED v10.0");
//   const globalStartTime = Date.now();

//   try {
//     const rawBody = await request.text();
//     const hmacHeader = request.headers.get("X-Shopify-Hmac-Sha256") || "";

//     console.log("rawbody=========================>", rawBody);

//     if (!verifyShopifyWebhook(rawBody, hmacHeader)) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const body = JSON.parse(rawBody);
//     console.log("🟢 body items===================", body.rate.items);
//     const { rate } = body;
//     if (!rate) return NextResponse.json({ rates: [] });

//     const destination = rate.destination || {};
//     const items = rate.items || [];

//     // Filter out shipping protection
//     const realItems = items.filter(
//       (item: any) => !item.name?.toLowerCase().includes("shipping protection"),
//     );

//     if (realItems.length === 0) {
//       return NextResponse.json({ rates: [] });
//     }

//     // US-only validation
//     if (rate.origin?.country !== "US" || destination.country !== "US") {
//       return NextResponse.json({ rates: [] });
//     }

//     // =====================================================
//     // STEP 1: ULTRA-FAST WAREHOUSE SELECTION (< 100ms)
//     // =====================================================
//     const destCoords = await getDestinationCoords(destination);
//     const itemsByOrigin = quickWarehouseSelection(realItems, destCoords);

//     const totalWeight = Array.from(itemsByOrigin.values()).reduce(
//       (sum, g) => sum + g.totalWeight,
//       0,
//     );

//     // Weight limit check
//     if (totalWeight > 20000) {
//       return NextResponse.json({
//         rates: [
//           {
//             service_name: "Freight – Manual Quote Required",
//             service_code: "FREIGHT_OVERWEIGHT",
//             total_price: "0",
//             currency: "USD",
//             description:
//               "Order exceeds maximum freight weight. Contact support.",
//           },
//         ],
//       });
//     }

//     // =====================================================
//     // STEP 2: PARALLEL API CALLS WITH STRICT TIMEOUTS
//     // =====================================================

//     const ratePromises: Promise<any>[] = [];
//     let shouldCallFedEx = false;

//     // FedEx eligibility check
//     // const maxItemWeight = Math.max(
//     //   ...Array.from(itemsByOrigin.values()).flatMap((g) =>
//     //     g.items.map((i: any) => Number(i.grams / 453.592)),
//     //   ),
//     // );
//     let maxPerItemWeight = 0;
//     let fixedWeightItemsToalWeight = 0;
//     let isFixedWeightItemsExist = false;
//     let isMixedWeightItemsExist = false;

//     for (const [, group] of itemsByOrigin.entries()) {
//       for (const item of group.items) {
//         // Calculate per-item weight correctly
//         const isEmptyProperties =
//           !item.properties || Object.keys(item.properties).length === 0;

//         let perItemWeight = 0;
//         if (!isEmptyProperties && item.properties?.Weight) {
//           // For items with properties (ROLLS/MATS)
//           const width = parseFloat(item.properties?.["Width (ft)"] || 0);
//           const length = parseFloat(item.properties?.["Length (ft)"] || 0);
//           const areaSqFT = Number(width * length);
//           const grams = Number(item.grams) || 0;
//           const perSqFTWeight = Number((grams / 453.592).toFixed(2));
//           perItemWeight = perSqFTWeight * areaSqFT;
//         } else {
//           // For items without properties (TILES/ACCESSORIES)
//           const grams = Number(item.grams) || 0;
//           // perItemWeight = Number((grams / 453.592).toFixed(2));
//           perItemWeight = Number((grams / 453.592).toFixed(2));
//           fixedWeightItemsToalWeight += perItemWeight * item.quantity;
//           isFixedWeightItemsExist = true;
//         }

//         if (perItemWeight > maxPerItemWeight) {
//           maxPerItemWeight = perItemWeight;
//         }
//       }
//     }

//     console.log(`\n📊 FedEx Eligibility Check:`);
//     console.log(
//       `   Max per-item weight: ${maxPerItemWeight.toFixed(2)} lbs (must be < 150 lbs)`,
//     );
//     console.log(
//       `   Total weight: ${totalWeight.toFixed(2)} lbs (must be ≤ 750 lbs)`,
//     );

//     console.log(
//       "==================================================>isFixedWeightItemsExist",
//       isFixedWeightItemsExist,
//     );
//     console.log("fixedWeightItemsToalWeight", fixedWeightItemsToalWeight);

//     const shouldLenghWidthItemsCallFedex =
//       maxPerItemWeight <= 150 && totalWeight <= 750;
//     const shouldFixedWeightItemsCallFedex = fixedWeightItemsToalWeight <= 150;

//     // shouldCallFedEx = isFixedWeightItemsExist
//     //   ? fixedWeightItemsToalWeight <= 150
//     //   : maxPerItemWeight <= 150 && totalWeight <= 750;

//     shouldCallFedEx =
//       shouldLenghWidthItemsCallFedex && shouldFixedWeightItemsCallFedex;

//     console.log(
//       "=========================================================>shouldCallFedEx",
//       shouldCallFedEx,
//     );

//     // if (maxPerItemWeight <= 150 && totalWeight <= 750) {
//     if (shouldCallFedEx) {
//       // Pre-process packages ONCE
//       const packagesByOriginPromise =
//         preprocessFedExPackagesFast(itemsByOrigin);

//       ratePromises.push(
//         (async () => {
//           try {
//             const packagesByOrigin = await Promise.race([
//               packagesByOriginPromise,
//               new Promise<null>((_, reject) =>
//                 setTimeout(() => reject(new Error("FedEx prep timeout")), 2000),
//               ),
//             ]);

//             if (!packagesByOrigin) return null;

//             // Call FedEx for each origin in parallel
//             const fedexClient = new FedExClient();
//             const fedexCalls = Array.from(itemsByOrigin.entries()).map(
//               ([originKey, group]) =>
//                 (async () => {
//                   try {
//                     const packages = packagesByOrigin.get(originKey);
//                     if (!packages) return null;

//                     const shipperAddress = {
//                       streetLines: group.origin.addressLineList.filter(Boolean),
//                       city: group.origin.locality,
//                       stateOrProvinceCode: group.origin.region,
//                       postalCode: group.origin.postalCode,
//                       countryCode: group.origin.countryCode,
//                       residential: false,
//                     };

//                     const fedexRate = await Promise.race([
//                       fedexClient.getRateForOrigin(
//                         destination,
//                         packages,
//                         shipperAddress,
//                       ),
//                       new Promise<null>((_, reject) =>
//                         setTimeout(
//                           () => reject(new Error("FedEx timeout")),
//                           FEDEX_TIMEOUT,
//                         ),
//                       ),
//                     ]);

//                     return fedexRate
//                       ? {
//                           service_code: "FEDEX_SMALL_PARCEL",
//                           originKey,
//                           rate: fedexRate.rate,
//                           transitDays: fedexRate.transitDays,
//                         }
//                       : null;
//                   } catch (err) {
//                     console.warn(`⚠️ FedEx ${originKey} failed`);
//                     return null;
//                   }
//                 })(),
//             );

//             const results = await Promise.all(fedexCalls);
//             return results.filter(Boolean);
//           } catch (err) {
//             console.warn("⚠️ FedEx failed:", err);
//             return null;
//           }
//         })(),
//       );
//     }

//     // WWEX calls in parallel
//     const wwexCalls = Array.from(itemsByOrigin.entries()).map(
//       ([originKey, group]) =>
//         getWWEXRateFast(originKey, group, destination, rate),
//     );
//     ratePromises.push(...wwexCalls);

//     // SEFL calls in parallel (only for freight-weight orders)
//     // if (totalWeight > 150) {
//     // Only call SEFL for heavier shipments
//     const seflCalls = Array.from(itemsByOrigin.entries()).map(
//       ([originKey, group]) => getSEFLRateFast(originKey, group, destination),
//     );
//     ratePromises.push(...seflCalls);
//     // }

//     // =====================================================
//     // STEP 3: WAIT WITH GLOBAL TIMEOUT
//     // =====================================================

//     const allResults = await Promise.race([
//       Promise.allSettled(ratePromises),
//       new Promise<never>((_, reject) =>
//         setTimeout(() => reject(new Error("Global timeout")), MAX_TOTAL_TIME),
//       ),
//     ]).catch(() => {
//       console.warn("⚠️ Global timeout hit!");
//       return [];
//     });

//     // =====================================================
//     // STEP 4: PROCESS RESULTS
//     // =====================================================

//     const rates: any[] = [];
//     const wwexRates: any[] = [];
//     const fedexRates: any[] = [];
//     const seflRates: any[] = [];

//     for (const result of allResults as PromiseSettledResult<any>[]) {
//       if (result.status === "fulfilled" && result.value) {
//         if (Array.isArray(result.value)) {
//           // FedEx results array
//           fedexRates.push(...result.value);
//         } else if (result.value.service_code === "FEDEX_SMALL_PARCEL") {
//           fedexRates.push(result.value);
//         } else if (result.value.quoteNumber) {
//           // SEFL result (has quoteNumber)
//           seflRates.push(result.value);
//         } else if (result.value.rate) {
//           // WWEX result
//           wwexRates.push(result.value);
//         }
//       }
//     }

//     // Combine FedEx rates
//     if (shouldCallFedEx && fedexRates.length > 0) {
//       const totalFedEx = fedexRates.reduce((sum, r) => sum + r.rate, 0);
//       // const maxTransit = Math.max(...fedexRates.map((r) => r.transitDays));

//       rates.push({
//         service_name: "FedEx Small Parcel",
//         service_code: "FEDEX_SMALL_PARCEL",
//         total_price: Math.round(totalFedEx * 100).toString(),
//         currency: "USD",
//         description:
//           "Production time: 7–14 business days. Transit: 3-5 business days",
//       });
//     }

//     // Combine WWEX rates
//     if (wwexRates.length > 0) {
//       const totalWWEX = wwexRates.reduce((sum, r) => sum + r.rate, 0);
//       // const maxTransit = Math.max(...wwexRates.map((r) => r.transitDays));

//       rates.push({
//         service_name: "Speedship Freight",
//         service_code: "SPEEDSHIP_FREIGHT",
//         total_price: Math.round(totalWWEX * 100).toString(),
//         currency: "USD",
//         description:
//           "Production time: 7–14 business days. Transit: 3-5 business days",
//       });
//     }

//     // Combine SEFL rates
//     if (seflRates.length > 0) {
//       const totalSEFL = seflRates.reduce((sum, r) => sum + r.rate, 0);

//       rates.push({
//         service_name: "SEFL Freight",
//         service_code: "SEFL_FREIGHT",
//         total_price: Math.round(totalSEFL * 100).toString(),
//         currency: "USD",
//         description:
//           "Production time: 7–14 business days. Transit: 3-5 business days",
//       });
//     }

//     // Fallback
//     if (rates.length === 0) {
//       const estimatedRate = 150 + totalWeight * 0.5;
//       rates.push({
//         service_name: "Speedship Freight (Estimated)",
//         service_code: "SPEEDSHIP_FREIGHT_ESTIMATED",
//         total_price: Math.round(estimatedRate * 100).toString(),
//         currency: "USD",
//         description:
//           "Production time: 7–14 business days. Transit: 3-5 business days",
//       });
//     }

//     const totalTime = Date.now() - globalStartTime;
//     console.log(`⚡ TOTAL TIME: ${totalTime}ms`);

//     // ASYNC logging (don't await - let it happen in background)
//     // logRateRequest({
//     //   requestId: `SPEEDSHIP-${Date.now()}`,
//     //   origin: rate.origin?.postal_code || "",
//     //   destination,
//     //   weight: totalWeight,
//     //   price: parseFloat(rate.order_totals?.subtotal_price || 0),
//     //   items: realItems,
//     // }).catch(console.error);

//     return NextResponse.json({ rates });
//   } catch (error: any) {
//     console.error("🔴 Error:", error.message);

//     await logError("CARRIER_SERVICE_ERROR", error.message, error.stack);

//     // Return fallback on error
//     return NextResponse.json({
//       rates: [
//         {
//           service_name: "Speedship Freight (Estimated)",
//           service_code: "SPEEDSHIP_FREIGHT_ERROR_FALLBACK",
//           total_price: "15000",
//           currency: "USD",
//           description:
//             "Production time: 7–14 business days. Transit: 3-5 business days",
//         },
//       ],
//     });
//   }
// }

// export async function GET() {
//   try {
//     const rate = await getLatestWWEXRate();
//     return NextResponse.json({ success: true, data: rate });
//   } catch (error: any) {
//     return NextResponse.json(
//       { success: false, error: error.message },
//       { status: 500 },
//     );
//   }
// }

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import axios from "axios";
import {
  logRateRequest,
  logWWEXResponse,
  logError,
  getLatestWWEXRate,
  logFinalShippingRate,
} from "@/lib/database";
import FedExClient from "@/lib/fedex-client";
import { getWWEXToken } from "@/lib/getWWEXToken";
import SEFLClient from "@/lib/sefl-client";
import FedExLTLClient from "@/lib/fedex-ltl-client";

// =====================================================
// CRITICAL: TIMEOUT CONFIGURATION - OPTIMIZED FOR 9 SECONDS
// =====================================================
const MAX_TOTAL_TIME = 11000; // 9 seconds total
const FEDEX_TIMEOUT = 4000; // 4 seconds for FedEx
const WWEX_TIMEOUT = 13000; // 6 seconds for WWEX
const SEFL_TIMEOUT = 9000; // 6 seconds for SEFL
const SEFL_RETRY_DELAY = 1200; // 2 seconds between SEFL retries
const SEFL_MAX_RETRIES = 2; // Maximum 2 retries
const FEDEX_LTL_TIMEOUT = 5000;

// Minimum wait before returning results (if we get responses faster)
const MIN_WAIT_FOR_FREIGHT = 5000; // Wait at least 5s for WWEX/SEFL

// =====================================================
// VERIFICATION & CONSTANTS
// =====================================================

function verifyShopifyWebhook(rawBody: string, hmacHeader: string): boolean {
  const secret = process.env.SHOPIFY_API_SECRET || "";
  const hash = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");

  return hash === hmacHeader;
}

const FIXED_PALLET_HEIGHT_IN = 35;
const PALLET_WEIGHT_LBS = 50;
const geocodingCache = new Map<string, GeocodingResult>();

interface GeocodingResult {
  lat: number;
  lng: number;
}

interface ItemGroup {
  origin: (typeof ORIGIN_ADDRESSES)[keyof typeof ORIGIN_ADDRESSES];
  originKey: string;
  items: any[];
  totalWeight: number;
  perItemWeight: number;
}

const ORIGIN_ADDRESSES = {
  RLX: {
    addressLineList: ["312 East 52 Bypass"],
    locality: "Pilot Mountain",
    region: "NC",
    postalCode: "27041",
    countryCode: "US",
    coordinates: { lat: 36.3865, lng: -80.4695 },
  },
  ARC_AZ: {
    addressLineList: ["1701 N. 132nd Avenue", "Suite 100"],
    locality: "Surprise",
    region: "AZ",
    postalCode: "85379",
    countryCode: "US",
    coordinates: { lat: 33.6292, lng: -112.3679 },
  },
  ARC_WI: {
    addressLineList: ["2025 E. Norse Avenue"],
    locality: "Cudahy",
    region: "WI",
    postalCode: "53110",
    countryCode: "US",
    coordinates: { lat: 42.9597, lng: -87.8615 },
  },
};

// Fallback state coordinates
const STATE_COORDINATES: Record<string, { lat: number; lng: number }> = {
  AL: { lat: 32.806671, lng: -86.79113 },
  AK: { lat: 61.370716, lng: -152.404419 },
  AZ: { lat: 33.729759, lng: -111.431221 },
  AR: { lat: 34.969704, lng: -92.373123 },
  CA: { lat: 36.116203, lng: -119.681564 },
  CO: { lat: 39.059811, lng: -105.311104 },
  CT: { lat: 41.597782, lng: -72.755371 },
  DE: { lat: 39.318523, lng: -75.507141 },
  FL: { lat: 27.766279, lng: -81.686783 },
  GA: { lat: 33.040619, lng: -83.643074 },
  HI: { lat: 21.094318, lng: -157.498337 },
  ID: { lat: 44.240459, lng: -114.478828 },
  IL: { lat: 40.349457, lng: -88.986137 },
  IN: { lat: 39.849426, lng: -86.258278 },
  IA: { lat: 42.011539, lng: -93.210526 },
  KS: { lat: 38.5266, lng: -96.726486 },
  KY: { lat: 37.66814, lng: -84.670067 },
  LA: { lat: 31.169546, lng: -91.867805 },
  ME: { lat: 44.693947, lng: -69.381927 },
  MD: { lat: 39.063946, lng: -76.802101 },
  MA: { lat: 42.230171, lng: -71.530106 },
  MI: { lat: 43.326618, lng: -84.536095 },
  MN: { lat: 45.694454, lng: -93.900192 },
  MS: { lat: 32.741646, lng: -89.678696 },
  MO: { lat: 38.456085, lng: -92.288368 },
  MT: { lat: 46.921925, lng: -110.454353 },
  NE: { lat: 41.12537, lng: -98.268082 },
  NV: { lat: 38.313515, lng: -117.055374 },
  NH: { lat: 43.452492, lng: -71.563896 },
  NJ: { lat: 40.298904, lng: -74.521011 },
  NM: { lat: 34.840515, lng: -106.248482 },
  NY: { lat: 42.165726, lng: -74.948051 },
  NC: { lat: 35.630066, lng: -79.806419 },
  ND: { lat: 47.528912, lng: -99.784012 },
  OH: { lat: 40.388783, lng: -82.764915 },
  OK: { lat: 35.565342, lng: -96.928917 },
  OR: { lat: 44.572021, lng: -122.070938 },
  PA: { lat: 40.590752, lng: -77.209755 },
  RI: { lat: 41.680893, lng: -71.51178 },
  SC: { lat: 33.856892, lng: -80.945007 },
  SD: { lat: 44.299782, lng: -99.438828 },
  TN: { lat: 35.747845, lng: -86.692345 },
  TX: { lat: 31.054487, lng: -97.563461 },
  UT: { lat: 40.150032, lng: -111.862434 },
  VT: { lat: 44.045876, lng: -72.710686 },
  VA: { lat: 37.769337, lng: -78.169968 },
  WA: { lat: 47.400902, lng: -121.490494 },
  WV: { lat: 38.491226, lng: -80.954453 },
  WI: { lat: 44.268543, lng: -89.616508 },
  WY: { lat: 42.755966, lng: -107.30249 },
};

// =====================================================
// ULTRA-FAST GEOCODING (Skip if not critical)
// =====================================================

async function getDestinationCoords(address: {
  province?: string;
  postal_code?: string;
}): Promise<{ lat: number; lng: number }> {
  // Priority 1: Use state coordinates (instant)
  if (address.province && STATE_COORDINATES[address.province]) {
    return STATE_COORDINATES[address.province];
  }

  // Priority 2: Check cache
  const cacheKey = `${address.province}-${address.postal_code}`;
  if (geocodingCache.has(cacheKey)) {
    return geocodingCache.get(cacheKey)!;
  }

  // Priority 3: Skip geocoding entirely, use NC as fallback
  console.log(`⚡ Using NC fallback (no geocoding delay)`);
  return STATE_COORDINATES["NC"];
}

// =====================================================
// DISTANCE CALCULATION
// =====================================================

function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function findClosestWarehouse(
  warehouses: Array<"RLX" | "ARC_AZ" | "ARC_WI">,
  destCoords: { lat: number; lng: number },
): "RLX" | "ARC_AZ" | "ARC_WI" {
  if (warehouses.length === 0) {
    console.warn("⚠️ No warehouses provided, defaulting to RLX");
    return "RLX";
  }

  let closest = warehouses[0];
  let minDist = Infinity;

  for (const wh of warehouses) {
    const whCoords = ORIGIN_ADDRESSES[wh].coordinates;
    const dist = calculateDistance(
      destCoords.lat,
      destCoords.lng,
      whCoords.lat,
      whCoords.lng,
    );
    if (dist < minDist) {
      minDist = dist;
      closest = wh;
    }
  }

  console.log(
    `   ✅ Closest warehouse: ${closest} (${minDist.toFixed(0)} miles)`,
  );

  return closest;
}

// =====================================================
// PRODUCT AVAILABILITY MATRIX
// =====================================================

interface ProductAvailability {
  rlx: boolean;
  arc: boolean;
}

const PRODUCT_AVAILABILITY_MATRIX: Record<
  string,
  Record<string, ProductAvailability>
> = {
  // ROLLS
  ROLL: {
    "1/4-BLACK": { rlx: true, arc: true },
    "1/4-10%COLOR": { rlx: true, arc: true },
    "1/4-CONFETTI": { rlx: true, arc: false },
    "8mm-BLACK": { rlx: true, arc: true },
    "8mm-10%COLOR": { rlx: true, arc: true },
    "8mm-CONFETTI": { rlx: true, arc: false },
    "3/8-BLACK": { rlx: true, arc: true },
    "3/8-10%COLOR": { rlx: true, arc: true },
    "3/8-CONFETTI": { rlx: true, arc: false },
    "1/2-BLACK": { rlx: true, arc: true },
    "1/2-10%COLOR": { rlx: true, arc: true },
    "1/2-CONFETTI": { rlx: true, arc: false },
    "3/4-BLACK": { rlx: true, arc: false },
    "3/4-10%COLOR": { rlx: true, arc: false },
  },

  // TILES
  TILE: {
    "1/4-BLACK": { rlx: true, arc: false },
    "1/4-10%COLOR": { rlx: true, arc: false },
    "8mm-BLACK": { rlx: true, arc: true },
    "8mm-10%COLOR": { rlx: true, arc: true },
    "3/8-BLACK": { rlx: true, arc: false },
    "3/8-10%COLOR": { rlx: true, arc: false },
    "1/2-BLACK": { rlx: true, arc: false },
    "1/2-10%COLOR": { rlx: true, arc: false },
    "3/4-BLACK": { rlx: true, arc: false },
    "3/4-10%COLOR": { rlx: true, arc: false },
  },

  // MATS
  MAT: {
    "1/4-4x3-BLACK": { rlx: true, arc: true },
    "1/4-4x3-10%COLOR": { rlx: true, arc: true },
    "1/4-4x3-CONFETTI": { rlx: true, arc: false },
    "1/4-4x6-BLACK": { rlx: true, arc: true },
    "1/4-4x6-10%COLOR": { rlx: true, arc: true },
    "1/4-4x6-CONFETTI": { rlx: true, arc: false },
    "1/4-4x8-BLACK": { rlx: true, arc: true },
    "1/4-4x8-10%COLOR": { rlx: true, arc: true },
    "1/4-4x8-CONFETTI": { rlx: true, arc: false },

    "3/8-4x3-BLACK": { rlx: true, arc: true },
    "3/8-4x3-10%COLOR": { rlx: true, arc: true },
    "3/8-4x3-CONFETTI": { rlx: true, arc: false },
    "3/8-4x6-BLACK": { rlx: true, arc: true },
    "3/8-4x6-10%COLOR": { rlx: true, arc: true },
    "3/8-4x6-CONFETTI": { rlx: true, arc: false },
    "3/8-4x8-BLACK": { rlx: true, arc: true },
    "3/8-4x8-10%COLOR": { rlx: true, arc: true },
    "3/8-4x8-CONFETTI": { rlx: true, arc: false },

    "1/2-4x3-BLACK": { rlx: true, arc: true },
    "1/2-4x3-10%COLOR": { rlx: true, arc: true },
    "1/2-4x3-CONFETTI": { rlx: true, arc: false },
    "1/2-4x6-BLACK": { rlx: true, arc: true },
    "1/2-4x6-10%COLOR": { rlx: true, arc: true },
    "1/2-4x6-CONFETTI": { rlx: true, arc: false },
    "1/2-4x8-BLACK": { rlx: true, arc: true },
    "1/2-4x8-10%COLOR": { rlx: true, arc: true },
    "1/2-4x8-CONFETTI": { rlx: true, arc: false },

    "3/4-4x3-BLACK": { rlx: true, arc: false },
    "3/4-4x3-10%COLOR": { rlx: true, arc: false },
    "3/4-4x3-CONFETTI": { rlx: true, arc: false },
    "3/4-4x6-BLACK": { rlx: true, arc: false },
    "3/4-4x6-10%COLOR": { rlx: true, arc: false },
    "3/4-4x6-CONFETTI": { rlx: true, arc: false },
    "3/4-4x8-BLACK": { rlx: true, arc: false },
    "3/4-4x8-10%COLOR": { rlx: true, arc: false },
    "3/4-4x8-CONFETTI": { rlx: true, arc: false },
  },

  // ACCESSORIES - RLX Only
  ADHESIVE: {
    "RLX-100-1GAL": { rlx: true, arc: false },
    "RLX-100-4GAL": { rlx: true, arc: false },
    "RLX-110-2GAL": { rlx: true, arc: false },
    "MAPEI-4GAL": { rlx: true, arc: false },
  },

  CLEANER: {
    "CLX-1GAL": { rlx: true, arc: false },
  },

  TAPE: {
    "RLX-DS-3X75": { rlx: true, arc: false },
    "RLX-DS-3X75-3": { rlx: true, arc: false },
    "RLX-DS-3X75-3C": { rlx: true, arc: false },
  },
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

type ProductType =
  | "ROLL"
  | "TILE"
  | "MAT"
  | "ADHESIVE"
  | "CLEANER"
  | "TAPE"
  | "UNKNOWN";

function detectProductType(item: any): ProductType {
  const title = `${item.name || ""} ${item.variant_title || ""}`.toLowerCase();

  // Accessories first
  if (title.includes("tape") || title.includes("flooring tape")) return "TAPE";
  if (title.includes("adhesive") || title.includes("glue")) return "ADHESIVE";
  if (title.includes("cleaner")) return "CLEANER";

  // Main products
  if (title.includes("tile")) return "TILE";
  if (title.includes("mat")) return "MAT";
  if (title.includes("roll")) return "ROLL";

  // Check properties for size indicators
  if (item.properties?.["Width (ft)"] && item.properties?.["Length (ft)"]) {
    return "ROLL";
  }

  return "UNKNOWN";
}

function extractThickness(title: string): string | null {
  // Extract thickness in order of specificity
  if (title.includes("3/4") || title.includes('3/4"')) return "3/4";
  if (title.includes("1/2") || title.includes('1/2"')) return "1/2";
  if (title.includes("3/8") || title.includes('3/8"')) return "3/8";
  if (title.includes("1/4") || title.includes('1/4"')) return "1/4";
  if (title.includes("8mm") || title.includes("8 mm")) return "8mm";

  return null;
}

function extractMatSize(item: any): string | null {
  const title = `${item.name || ""}`.toLowerCase();

  // Check properties first
  if (item.properties?.["Width (ft)"] && item.properties?.["Length (ft)"]) {
    const width = parseFloat(item.properties["Width (ft)"]);
    const length = parseFloat(item.properties["Length (ft)"]);
    return `${width}x${length}`;
  }

  // Parse from title
  const patterns = [
    /(\d+)'?\s*x\s*(\d+)'?/i, // 4x6 or 4'x6'
    /(\d+)\s*ft\s*x\s*(\d+)\s*ft/i, // 4 ft x 6 ft
  ];

  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) {
      return `${match[1]}x${match[2]}`;
    }
  }

  return null;
}

function detectColorType(title: string): "BLACK" | "10%COLOR" | "CONFETTI" {
  // Confetti check first (most specific)
  if (title.includes("confetti")) return "CONFETTI";

  // ARC exclusive colors (10% COLOR category)
  if (
    title.includes("bright green") ||
    title.includes("silver") ||
    title.includes("white")
  ) {
    return "10%COLOR";
  }

  // RLX exclusive colors (10% COLOR category)
  if (
    title.includes("gray") ||
    title.includes("grey") ||
    title.includes("blugray") ||
    title.includes("blue gray") ||
    title.includes("forest green") ||
    title.includes("green") ||
    title.includes("cocoa")
  ) {
    return "10%COLOR";
  }

  // Shared colors (10% COLOR category)
  if (
    title.includes("blue") ||
    title.includes("orange") ||
    title.includes("red")
  ) {
    return "10%COLOR";
  }

  // Default to black
  return "BLACK";
}

// =====================================================
// MAIN ROUTING FUNCTION - OPTIMIZED WITH FULL MATRIX
// =====================================================

function getSimplifiedRouting(item: any): Array<"RLX" | "ARC_AZ" | "ARC_WI"> {
  const title = `${item.name || ""} ${item.variant_title || ""}`.toLowerCase();

  // STEP 1: Detect product type
  const productType = detectProductType(item);

  // STEP 2: Handle accessories (always RLX only)
  if (
    productType === "ADHESIVE" ||
    productType === "CLEANER" ||
    productType === "TAPE"
  ) {
    return ["RLX"];
  }

  // STEP 3: Handle unknown products (fallback to all warehouses)
  if (productType === "UNKNOWN") {
    console.warn(`⚠️ Unknown product type: ${item.name}`);
    return ["RLX", "ARC_AZ", "ARC_WI"];
  }

  // STEP 4: Extract thickness
  const thickness = extractThickness(title);
  if (!thickness) {
    console.warn(`⚠️ Could not extract thickness: ${item.name}`);
    return ["RLX", "ARC_AZ", "ARC_WI"];
  }

  // STEP 5: Build availability key
  let availabilityKey = "";

  if (productType === "MAT") {
    const matSize = extractMatSize(item);
    if (!matSize) {
      console.warn(`⚠️ Could not extract mat size: ${item.name}`);
      return ["RLX", "ARC_AZ", "ARC_WI"];
    }
    const colorType = detectColorType(title);
    availabilityKey = `${thickness}-${matSize}-${colorType}`;
  } else {
    // ROLL or TILE
    const colorType = detectColorType(title);
    availabilityKey = `${thickness}-${colorType}`;
  }

  // STEP 6: Look up in matrix
  const typeMatrix = PRODUCT_AVAILABILITY_MATRIX[productType];

  if (!typeMatrix || !typeMatrix[availabilityKey]) {
    console.warn(
      `⚠️ Not found in matrix: ${productType} -> ${availabilityKey}`,
    );
    console.warn(`   Product: ${item.name}`);
    // Fallback to all warehouses
    return ["RLX", "ARC_AZ", "ARC_WI"];
  }

  const availability = typeMatrix[availabilityKey];

  console.log(`   ✅ Found in Product Matrix:`);
  console.log(`      RLX Available: ${availability.rlx ? "✅" : "❌"}`);
  console.log(`      ARC Available: ${availability.arc ? "✅" : "❌"}`);

  // STEP 7: Build warehouse list
  const warehouses: Array<"RLX" | "ARC_AZ" | "ARC_WI"> = [];

  if (availability.rlx) {
    warehouses.push("RLX");
  }

  if (availability.arc) {
    warehouses.push("ARC_AZ", "ARC_WI");
  }

  // STEP 8: Apply color-based exclusions (additional check)
  const colorExclusions = applyColorExclusions(title, warehouses);

  if (colorExclusions.length === 0) {
    console.warn(`⚠️ No warehouses available after color check: ${item.name}`);
    return ["RLX"]; // Fallback to RLX
  }

  let finalRlxAvailable: boolean;
  let finalArcAvailable: boolean;
  let finalNotes: string;

  console.log(
    "colorExclusions==================================================================>",
    colorExclusions,
  );

  if (availability) {
    // We have product matrix data - combine with color check
    const arcAvailableAfterColor =
      colorExclusions.includes("ARC_AZ") || colorExclusions.includes("ARC_WI");

    // Final availability = Product Matrix AND Color Filter
    finalRlxAvailable = availability.rlx && colorExclusions.includes("RLX");

    finalArcAvailable = availability.arc && arcAvailableAfterColor;

    console.log(
      `   📊 Product Matrix: RLX=${availability.rlx}, ARC=${availability.arc}`,
    );
    console.log(
      `   🎨 Color Check: RLX=${colorExclusions.includes("RLX")}, ARC=${arcAvailableAfterColor}`,
    );
    console.log(
      `   ✅ FINAL (Product AND Color): RLX=${finalRlxAvailable}, ARC=${finalArcAvailable}`,
    );

    if (
      !finalRlxAvailable &&
      availability.rlx &&
      !colorExclusions.includes("RLX")
    ) {
      finalNotes = `Product available at RLX but color ${title} is not`;
    } else if (
      !finalArcAvailable &&
      availability.arc &&
      !arcAvailableAfterColor
    ) {
      finalNotes = `Product available at ARC but color ${title} is not`;
    } else if (finalRlxAvailable && !finalArcAvailable) {
      finalNotes = `Available only at RLX`;
    } else if (!finalRlxAvailable && finalArcAvailable) {
      finalNotes = `Available only at ARC`;
    } else if (finalRlxAvailable && finalArcAvailable) {
      finalNotes = `Available at both RLX and ARC`;
    } else {
      finalNotes = `Not available at any warehouse`;
    }

    let warehouseList: Array<"RLX" | "ARC_AZ" | "ARC_WI"> = [];

    if (finalRlxAvailable) {
      warehouseList.push("RLX");
    }
    if (finalArcAvailable) {
      warehouseList.push("ARC_AZ", "ARC_WI");
    }

    console.log(
      "================================================>warehouseList",
      warehouseList,
    );
    return warehouseList;
  }

  return colorExclusions;
}

// =====================================================
// COLOR-BASED EXCLUSIONS (Secondary check)
// =====================================================

function applyColorExclusions(
  title: string,
  warehouses: Array<"RLX" | "ARC_AZ" | "ARC_WI">,
): Array<"RLX" | "ARC_AZ" | "ARC_WI"> {
  // Shared colors (available at all warehouses)
  if (
    title.includes("black") ||
    title.includes("blue") ||
    title.includes("orange") ||
    title.includes("red")
  ) {
    console.log(`   🎨 Color Check: ${title} is available at both warehouses`);
    console.log(`      RLX Available: ✅`);
    console.log(`      ARC Available: ✅`);
    // return warehouses.filter(
    //   (wh) => wh === "RLX" || wh === "ARC_AZ" || wh === "ARC_WI",
    // );
    return ["RLX", "ARC_AZ", "ARC_WI"];
  }

  // ARC exclusive colors
  if (
    title.includes("bright green") ||
    title.includes("silver") ||
    title.includes("white")
  ) {
    console.log(`   🎨 Color Check: ${title} is ARC exclusive`);
    console.log(`      RLX Available: ❌`);
    console.log(`      ARC Available: ✅`);
    // return warehouses.filter((wh) => wh === "ARC_AZ" || wh === "ARC_WI");
    return ["ARC_AZ", "ARC_WI"];
  }

  // RLX exclusive colors
  if (
    title.includes("confetti") ||
    title.includes("gray") ||
    title.includes("grey") ||
    title.includes("blugray") ||
    title.includes("forest green") ||
    (title.includes("green") && !title.includes("bright")) ||
    title.includes("cocoa")
  ) {
    console.log(`   🎨 Color Check: ${title} is RLX exclusive`);
    console.log(`      RLX Available: ✅`);
    console.log(`      ARC Available: ❌`);
    // return warehouses.filter((wh) => wh === "RLX");
    return ["RLX"];
  }

  // No exclusions - return all warehouses
  return warehouses;
}

function calculateItemTotalWeight(item: any): number {
  const isEmptyProperties =
    !item.properties || Object.keys(item.properties).length === 0;

  if (!isEmptyProperties && item.properties?.Weight) {
    // ROLLS/MATS: use area × weight per sq ft × number of rolls
    const width = parseFloat(item.properties?.["Width (ft)"] || "0");
    const length = parseFloat(item.properties?.["Length (ft)"] || "0");
    const areaSqFT = width * length;
    const grams = Number(item.grams) || 0;
    const perSqFTWeight = Number((grams / 453.592).toFixed(2));
    const rollQuantity = parseFloat(item.properties?.["Quantity"] || "1");
    return perSqFTWeight * areaSqFT * rollQuantity;
  } else {
    // TILES/ACCESSORIES: grams per unit × quantity
    const grams = Number(item.grams) || 0;
    const quantity = item.quantity || 1;
    return Number((grams / 453.592).toFixed(2)) * quantity;
  }
}

// =====================================================
// ULTRA-FAST WAREHOUSE OPTIMIZATION
// =====================================================

function quickWarehouseSelection(
  items: any[],
  destCoords: { lat: number; lng: number },
): Map<string, ItemGroup> {
  console.log("⚡ Ultra-fast warehouse selection...");

  const itemsByOrigin = new Map<string, ItemGroup>();

  // Get routing info for all items
  const itemRoutingInfo = items.map((item) => ({
    item,
    warehouses: getSimplifiedRouting(item),
    weight: Number(item.grams / 453.592),
  }));

  console.log(
    "itemRoutingInfo==================================>",
    itemRoutingInfo,
  );

  // STRATEGY 1: Check if all items can ship from a single warehouse
  const commonWarehouses = findCommonWarehouses(itemRoutingInfo);

  if (commonWarehouses.length > 0) {
    // Find the closest warehouse among those that can fulfill ALL items
    const closest = findClosestWarehouse(commonWarehouses, destCoords);
    console.log(`⚡ Consolidating all items to ${closest} (can fulfill all)`);

    const group: ItemGroup = {
      origin: ORIGIN_ADDRESSES[closest],
      originKey: closest,
      items: [],
      totalWeight: 0,
      perItemWeight: 0,
    };

    for (const info of itemRoutingInfo) {
      group.items.push(info.item);
      group.totalWeight += calculateItemTotalWeight(info.item);
    }

    itemsByOrigin.set(closest, group);
    return itemsByOrigin;
  }

  // STRATEGY 2: Split shipment - route each item to its closest available warehouse
  console.log("⚡ Splitting shipment across multiple warehouses");

  for (const info of itemRoutingInfo) {
    const closest = findClosestWarehouse(info.warehouses, destCoords);

    if (!itemsByOrigin.has(closest)) {
      itemsByOrigin.set(closest, {
        origin: ORIGIN_ADDRESSES[closest],
        originKey: closest,
        items: [],
        totalWeight: 0,
        perItemWeight: 0,
      });
    }

    const group = itemsByOrigin.get(closest)!;
    group.items.push(info.item);
    group.totalWeight += calculateItemTotalWeight(info.item);
  }

  return itemsByOrigin;
}

// Helper function to find warehouses that can fulfill ALL items
function findCommonWarehouses(
  itemRoutingInfo: Array<{
    item: any;
    warehouses: Array<"RLX" | "ARC_AZ" | "ARC_WI">;
    weight: number;
  }>,
): Array<"RLX" | "ARC_AZ" | "ARC_WI"> {
  if (itemRoutingInfo.length === 0) return [];

  // Start with the first item's warehouses
  let common = [...itemRoutingInfo[0].warehouses];

  // Intersect with each subsequent item's warehouses
  for (let i = 1; i < itemRoutingInfo.length; i++) {
    common = common.filter((wh) => itemRoutingInfo[i].warehouses.includes(wh));

    // Early exit if no common warehouses remain
    if (common.length === 0) break;
  }

  console.log(`   📦 Common warehouses for all items: [${common.join(", ")}]`);
  return common;
}

// =====================================================
// OPTIMIZED PALLET CALCULATION (Simplified)
// =====================================================

function optimizeMultiPalletConfiguration(totalWeight: number): {
  palletsNeeded: number;
  weightPerPallet: number;
  freightClass: string;
  totalWeightWithPallets: number;
} {
  const MAX_SAFE_WEIGHT = 2000;
  const palletsNeeded = Math.ceil(totalWeight / MAX_SAFE_WEIGHT);
  const weightPerPallet = totalWeight / palletsNeeded;

  // ADD PALLET WEIGHT HERE
  const totalWeightWithPallets =
    totalWeight + PALLET_WEIGHT_LBS * palletsNeeded;

  // Simplified class calculation
  const volume = (48 * 40 * FIXED_PALLET_HEIGHT_IN) / 1728;
  const density = weightPerPallet / volume;

  let freightClass = "70";
  if (density >= 30) freightClass = "60";
  else if (density >= 22.5) freightClass = "70";
  else if (density < 22.5) freightClass = "77.5";

  return {
    palletsNeeded,
    weightPerPallet,
    freightClass,
    totalWeightWithPallets,
  };
}

// =====================================================
// WWEX RATE WITH AGGRESSIVE TIMEOUT
// =====================================================

async function getWWEXRateFast(
  originKey: string,
  group: ItemGroup,
  destination: any,
  rate: any,
): Promise<any> {
  const startTime = Date.now();

  try {
    // const adjustedTotalWeight = group.totalWeight + PALLET_WEIGHT_LBS;
    const adjustedTotalWeight = group.totalWeight;

    const config = optimizeMultiPalletConfiguration(adjustedTotalWeight);
    // const config = optimizeMultiPalletConfiguration(group.totalWeight);

    const handlingUnitList = [];
    for (let i = 0; i < config.palletsNeeded; i++) {
      // const palletWeight =
      //   i === config.palletsNeeded - 1
      //     ? group.totalWeight -
      //       config.weightPerPallet * (config.palletsNeeded - 1)
      //     : config.weightPerPallet;
      const productWeightOnPallet =
        i === config.palletsNeeded - 1
          ? group.totalWeight -
            config.weightPerPallet * (config.palletsNeeded - 1)
          : config.weightPerPallet;

      // Add pallet weight (50 lbs) to each pallet
      const totalPalletWeight = productWeightOnPallet + PALLET_WEIGHT_LBS;

      handlingUnitList.push({
        quantity: 1,
        packagingType: "PLT",
        isStackable: false,
        billedDimension: {
          length: { value: 48, unit: "IN" },
          width: { value: 40, unit: "IN" },
          height: { value: FIXED_PALLET_HEIGHT_IN, unit: "IN" },
        },
        // weight: { value: palletWeight, unit: "LB" },
        weight: { value: totalPalletWeight, unit: "LB" },
        shippedItemList: [
          {
            commodityClass: config.freightClass,
            isHazMat: false,
            // weight: { value: palletWeight, unit: "LB" },
            weight: { value: totalPalletWeight, unit: "LB" },
          },
        ],
      });
    }

    const speedshipRequest = {
      request: {
        productType: "LTL",
        shipment: {
          shipmentDate: new Date().toISOString().slice(0, 19).replace("T", " "),
          originAddress: {
            address: {
              ...group.origin,
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
            locationType: "RESIDENTIAL",
          },
          handlingUnitList: handlingUnitList,
          totalHandlingUnitCount: config.palletsNeeded,
          // totalWeight: { value: group.totalWeight, unit: "LB" },
          totalWeight: { value: config.totalWeightWithPallets, unit: "LB" },
          returnLabelFlag: false,
          residentialDeliveryFlag: true,
          residentialPickupFlag: false,
          isSignatureRequired: false,
          appointmentDeliveryFlag: false,
          holdAtTerminalFlag: false,
          insideDeliveryFlag: false,
          insidePickupFlag: false,
          carrierTerminalPickupFlag: false,
          liftgateDeliveryFlag: true,
          liftgatePickupFlag: false,
          notifyBeforeDeliveryFlag: true,
          protectionFromColdFlag: false,
          insuredCommodityCategory: "400",
          totalDeclaredValue: { value: "0", unit: "USD" },
        },
      },
      correlationId: `${Date.now()}-${originKey}`,
    };

    console.log(
      "\n🟢 WWEX Request:",
      JSON.stringify(speedshipRequest, null, 2),
    );

    // const token = await getAccessToken();
    const token = await getWWEXToken();

    const speedshipStartTime = Date.now();

    const response = await axios.post(
      "https://www.speedship.com/svc/shopFlow",
      speedshipRequest,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: WWEX_TIMEOUT,
      },
    );

    const speedshipResponseTime = Date.now() - speedshipStartTime;
    console.log(
      `🟢 WWEX API response time for ${originKey}: ${speedshipResponseTime}ms`,
    );

    const offerList = response.data?.response?.offerList || [];
    if (offerList.length === 0) return null;

    const sortedOffers = offerList
      .filter((o: any) => o.totalOfferPrice?.value)
      .sort(
        (a: any, b: any) =>
          Number(a.totalOfferPrice.value) - Number(b.totalOfferPrice.value),
      );

    const selectedOffer = sortedOffers[0];
    if (!selectedOffer) return null;

    const product = selectedOffer.offeredProductList[0];
    const speedshipRate = Number(product.offerPrice.value);
    const transitDays =
      Number(product.shopRQShipment?.timeInTransit?.transitDays) || 5;

    console.log(
      `✅ WWEX ${originKey}: $${speedshipRate} (${Date.now() - startTime}ms)`,
    );

    return {
      originKey,
      // rate: speedshipRate * 1.06, // Add 6% surcharge
      rate: speedshipRate * 1.15, // Add 15% surcharge
      transitDays,
      palletsNeeded: config.palletsNeeded,
      // weight: group.totalWeight,
      weight: config.totalWeightWithPallets,
    };
  } catch (error: any) {
    console.warn(`⚠️ WWEX ${originKey} failed: ${error.message}`);

    await logError(`WWEX_${originKey}`, error.message, error.stack, {
      responseData: error.response?.data,
      statusCode: error.response?.status,
      origin: originKey,
    });

    return null;
  }
}

// =====================================================
// FEDEX PRE-PROCESSING (Reuse your existing logic)
// =====================================================

async function preprocessFedExPackagesFast(
  itemsByOrigin: Map<string, ItemGroup>,
): Promise<Map<string, any[]>> {
  const fedexClient = new FedExClient();
  const packagesByOrigin = new Map<string, any[]>();

  for (const [originKey, group] of itemsByOrigin.entries()) {
    const shopifyItems = group.items.map((item: any) => ({
      name: item.name,
      sku: item.sku || "",
      quantity: item.quantity || 1,
      grams: item.grams || 0,
      price: item.price || 0,
      properties: item.properties || {},
      product_id: item.product_id || 0,
      variant_id: item.variant_id || 0,
    }));

    const processedItems = fedexClient.processShopifyItemsPublic(shopifyItems);
    const consolidatedPackages =
      fedexClient.consolidatePackagesPublic(processedItems);

    packagesByOrigin.set(originKey, consolidatedPackages);
  }

  return packagesByOrigin;
}

// async function getFedExLTLRateFast(
//   originKey: string,
//   group: ItemGroup,
//   destination: any,
// ): Promise<any> {
//   const startTime = Date.now();

//   try {
//     const adjustedTotalWeight = group.totalWeight;
//     const config = optimizeMultiPalletConfiguration(adjustedTotalWeight);

//     const fedexLTLClient = new FedExLTLClient();

//     // Convert to LTL freight items
//     const ltlItems = fedexLTLClient.convertToLTLFreightItems(
//       group.totalWeight,
//       config.palletsNeeded,
//       config.weightPerPallet,
//       config.freightClass,
//       PALLET_WEIGHT_LBS,
//     );

//     console.log(`\n🟠 FedEx LTL Request for ${originKey}:`);
//     console.log(`   Weight: ${config.totalWeightWithPallets} lbs`);
//     console.log(`   Freight Class: ${config.freightClass}`);
//     console.log(`   Pallets: ${config.palletsNeeded}`);

//     const ltlStartTime = Date.now();

//     const result = await Promise.race([
//       fedexLTLClient.getLTLRate(
//         group.origin,
//         destination,
//         ltlItems,
//         config.totalWeightWithPallets,
//       ),
//       new Promise<null>((_, reject) =>
//         setTimeout(
//           () => reject(new Error("FedEx LTL timeout")),
//           FEDEX_LTL_TIMEOUT,
//         ),
//       ),
//     ]);

//     const ltlResponseTime = Date.now() - ltlStartTime;
//     console.log(
//       `🟠 FedEx LTL API response time for ${originKey}: ${ltlResponseTime}ms`,
//     );

//     if (!result || !result.rate) {
//       console.warn(`⚠️ FedEx LTL ${originKey}: No rate returned`);
//       return null;
//     }

//     console.log(
//       `✅ FedEx LTL ${originKey}: $${result.rate} (${Date.now() - startTime}ms)`,
//     );

//     return {
//       originKey,
//       rate: result.rate,
//       transitDays: result.transitDays,
//       weight: result.totalWeight,
//       palletsNeeded: result.palletsNeeded,
//       serviceLevel: result.serviceLevel,
//     };
//   } catch (error: any) {
//     console.warn(`⚠️ FedEx LTL ${originKey} failed: ${error.message}`);
//     return null;
//   }
// }

async function getFedExLTLRateFast(
  originKey: string,
  group: ItemGroup,
  destination: any,
): Promise<any> {
  const startTime = Date.now();

  try {
    const adjustedTotalWeight = group.totalWeight;
    const config = optimizeMultiPalletConfiguration(adjustedTotalWeight);

    const fedexLTLClient = new FedExLTLClient();

    // Convert to LTL freight items
    const ltlItems = fedexLTLClient.convertToLTLFreightItems(
      group.totalWeight,
      config.palletsNeeded,
      config.weightPerPallet,
      config.freightClass,
      PALLET_WEIGHT_LBS,
    );

    console.log(`\n🟠 FedEx LTL Request for ${originKey}:`);
    console.log(`   Weight: ${config.totalWeightWithPallets} lbs`);
    console.log(`   Freight Class: ${config.freightClass}`);
    console.log(`   Pallets: ${config.palletsNeeded}`);

    const ltlStartTime = Date.now();

    const result = await Promise.race([
      fedexLTLClient.getLTLRate(
        group.origin,
        destination,
        ltlItems,
        config.totalWeightWithPallets,
      ),
      new Promise<null>((_, reject) =>
        setTimeout(
          () => reject(new Error("FedEx LTL timeout")),
          FEDEX_LTL_TIMEOUT,
        ),
      ),
    ]);

    const ltlResponseTime = Date.now() - ltlStartTime;
    console.log(
      `🟠 FedEx LTL API response time for ${originKey}: ${ltlResponseTime}ms`,
    );

    if (!result || !result.rate) {
      console.warn(`⚠️ FedEx LTL ${originKey}: No rate returned`);
      return null;
    }

    console.log(
      `✅ FedEx LTL ${originKey}: $${result.rate} (${Date.now() - startTime}ms)`,
    );

    return {
      originKey,
      rate: result.rate,
      transitDays: result.transitDays,
      weight: result.totalWeight,
      palletsNeeded: result.palletsNeeded,
      serviceLevel: result.serviceLevel,
      isFedExLTL: true, // ✅ explicit flag instead of string check
    };
  } catch (error: any) {
    console.warn(`⚠️ FedEx LTL ${originKey} failed: ${error.message}`);
    return null;
  }
}

// =====================================================
// SEFL RATE - OPTIMIZED WITH PROPER CONFIG
// =====================================================

async function getSEFLRateFast(
  originKey: string,
  group: ItemGroup,
  destination: any,
): Promise<any> {
  const startTime = Date.now();

  try {
    const adjustedTotalWeight = group.totalWeight;
    const config = optimizeMultiPalletConfiguration(adjustedTotalWeight);

    const seflWeight = config.totalWeightWithPallets;
    const freightClass = parseInt(config.freightClass);
    const units = config.palletsNeeded;
    
    const cubicFtPerUnit = (48 * 40 * FIXED_PALLET_HEIGHT_IN) / 1728;
    const totalCubicFt = cubicFtPerUnit * units;

    // ✅ CRITICAL FIX: Properly configured SEFL client
    const seflClient = new SEFLClient({
      username: process.env.SEFL_USERNAME || "",
      password: process.env.SEFL_PASSWORD || "",
      customerAccount: process.env.SEFL_CUSTOMER_ACCOUNT || "",
      customerName: "ELITE FLOOR SUPPLY",
      customerStreet: "STAFFORD",
      customerCity: "STAFFORD",
      customerState: "TX",
      customerZip: "77477",
      emailAddress: "nabit@sasbrandsloop.com",
      maxRetries: SEFL_MAX_RETRIES,
      retryDelay: SEFL_RETRY_DELAY,
      timeout: SEFL_TIMEOUT,
    });

    console.log(`\n🟣 SEFL Request for ${originKey}:`);
    console.log(`   Weight: ${seflWeight} lbs`);
    console.log(`   Freight Class: ${freightClass}`);
    console.log(`   Origin: ${group.origin.locality}, ${group.origin.region}`);
    console.log(`   Destination: ${destination.city}, ${destination.province}`);

    const seflStartTime = Date.now();

    const result = await Promise.race([
      seflClient.getShippingRate({
        origin: {
          zip: group.origin.postalCode,
          city: group.origin.locality,
          state: group.origin.region,
        },
        destination: {
          zip: destination.postal_code || "",
          city: destination.city || "",
          state: destination.province || "",
        },
        pickupDate: new Date(),
        terms: "P",
        freightClass: freightClass,
        weight: seflWeight,
        // units: 1,
        units,
        length: 48,
        width: 40,
        height: FIXED_PALLET_HEIGHT_IN,
        cubicFeet: totalCubicFt,
        packageType: "PLT",
        chkLAP: "on",
        chkLGD: "on",
        chkAN: "on",
      }),
      new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error("SEFL timeout")), SEFL_TIMEOUT),
      ),
    ]);

    const seflResponseTime = Date.now() - seflStartTime;
    console.log(
      `🟣 SEFL API response time for ${originKey}: ${seflResponseTime}ms`,
    );

    if (!result || !result.success || !result.rate) {
      console.warn(`⚠️ SEFL ${originKey}: No rate returned`);
      return null;
    }

    const seflRate = result.rate;
    const transitDays = result.transitDays || 5;

    console.log(
      `✅ SEFL ${originKey}: $${seflRate} (${Date.now() - startTime}ms)`,
    );

    return {
      originKey,
      rate: seflRate * 1.15, // 15% markup
      transitDays,
      weight: seflWeight,
      quoteNumber: result.quoteNumber,
    };
  } catch (error: any) {
    console.warn(`⚠️ SEFL ${originKey} failed: ${error.message}`);
    return null;
  }
}

// =====================================================
// MAIN POST FUNCTION - ULTRA-OPTIMIZED FOR 9 SECONDS
// =====================================================

export async function POST(request: NextRequest) {
  console.log("⚡ SPEEDSHIP API - ULTRA-OPTIMIZED v10.0");
  const globalStartTime = Date.now();

  try {
    const rawBody = await request.text();
    const hmacHeader = request.headers.get("X-Shopify-Hmac-Sha256") || "";

    console.log("rawbody=========================>", rawBody);

    if (!verifyShopifyWebhook(rawBody, hmacHeader)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    console.log("🟢 body items===================", body.rate.items);
    const { rate } = body;
    if (!rate) return NextResponse.json({ rates: [] });

    const destination = rate.destination || {};
    const items = rate.items || [];

    // Filter out shipping protection
    const realItems = items.filter(
      (item: any) => !item.name?.toLowerCase().includes("shipping protection"),
    );

    if (realItems.length === 0) {
      return NextResponse.json({ rates: [] });
    }

    // US-only validation
    if (rate.origin?.country !== "US" || destination.country !== "US") {
      return NextResponse.json({ rates: [] });
    }

    // =====================================================
    // STEP 1: ULTRA-FAST WAREHOUSE SELECTION (< 100ms)
    // =====================================================
    const destCoords = await getDestinationCoords(destination);
    const itemsByOrigin = quickWarehouseSelection(realItems, destCoords);

    const totalWeight = Array.from(itemsByOrigin.values()).reduce(
      (sum, g) => sum + g.totalWeight,
      0,
    );

    // Weight limit check
    if (totalWeight > 20000) {
      return NextResponse.json({
        rates: [
          {
            service_name: "Freight – Manual Quote Required",
            service_code: "FREIGHT_OVERWEIGHT",
            total_price: "0",
            currency: "USD",
            description:
              "Order exceeds maximum freight weight. Contact support.",
          },
        ],
      });
    }

    // =====================================================
    // STEP 2: PARALLEL API CALLS WITH STRICT TIMEOUTS
    // =====================================================

    const ratePromises: Promise<any>[] = [];
    let shouldCallFedEx = false;

    // FedEx eligibility check
    // const maxItemWeight = Math.max(
    //   ...Array.from(itemsByOrigin.values()).flatMap((g) =>
    //     g.items.map((i: any) => Number(i.grams / 453.592)),
    //   ),
    // );
    let maxPerItemWeight = 0;
    let fixedWeightItemsToalWeight = 0;
    let isFixedWeightItemsExist = false;

    for (const [, group] of itemsByOrigin.entries()) {
      for (const item of group.items) {
        // Calculate per-item weight correctly
        const isEmptyProperties =
          !item.properties || Object.keys(item.properties).length === 0;

        let perItemWeight = 0;
        if (!isEmptyProperties && item.properties?.Weight) {
          // For items with properties (ROLLS/MATS)
          const width = parseFloat(item.properties?.["Width (ft)"] || 0);
          const length = parseFloat(item.properties?.["Length (ft)"] || 0);
          const areaSqFT = Number(width * length);
          const grams = Number(item.grams) || 0;
          const perSqFTWeight = Number((grams / 453.592).toFixed(2));
          perItemWeight = perSqFTWeight * areaSqFT;
        } else {
          // For items without properties (TILES/ACCESSORIES)
          const grams = Number(item.grams) || 0;
          // perItemWeight = Number((grams / 453.592).toFixed(2));
          perItemWeight = Number((grams / 453.592).toFixed(2));
          fixedWeightItemsToalWeight += perItemWeight * item.quantity;
          isFixedWeightItemsExist = true;
        }

        if (perItemWeight > maxPerItemWeight) {
          maxPerItemWeight = perItemWeight;
        }
      }
    }

    console.log(`\n📊 FedEx Eligibility Check:`);
    console.log(
      `   Max per-item weight: ${maxPerItemWeight.toFixed(2)} lbs (must be < 150 lbs)`,
    );
    console.log(
      `   Total weight: ${totalWeight.toFixed(2)} lbs (must be ≤ 750 lbs)`,
    );

    console.log(
      "==================================================>isFixedWeightItemsExist",
      isFixedWeightItemsExist,
    );
    console.log("fixedWeightItemsToalWeight", fixedWeightItemsToalWeight);

    const shouldLenghWidthItemsCallFedex =
      maxPerItemWeight <= 150 && totalWeight <= 750;
    const shouldFixedWeightItemsCallFedex = fixedWeightItemsToalWeight <= 150;

    // shouldCallFedEx = isFixedWeightItemsExist
    //   ? fixedWeightItemsToalWeight <= 150
    //   : maxPerItemWeight <= 150 && totalWeight <= 750;

    shouldCallFedEx =
      shouldLenghWidthItemsCallFedex && shouldFixedWeightItemsCallFedex;

    console.log(
      "=========================================================>shouldCallFedEx",
      shouldCallFedEx,
    );

    // if (maxPerItemWeight <= 150 && totalWeight <= 750) {
    if (shouldCallFedEx) {
      // Pre-process packages ONCE
      const packagesByOriginPromise =
        preprocessFedExPackagesFast(itemsByOrigin);

      ratePromises.push(
        (async () => {
          try {
            const packagesByOrigin = await Promise.race([
              packagesByOriginPromise,
              new Promise<null>((_, reject) =>
                setTimeout(() => reject(new Error("FedEx prep timeout")), 2000),
              ),
            ]);

            if (!packagesByOrigin) return null;

            // Call FedEx for each origin in parallel
            const fedexClient = new FedExClient();
            const fedexCalls = Array.from(itemsByOrigin.entries()).map(
              ([originKey, group]) =>
                (async () => {
                  try {
                    const packages = packagesByOrigin.get(originKey);
                    if (!packages) return null;

                    const shipperAddress = {
                      streetLines: group.origin.addressLineList.filter(Boolean),
                      city: group.origin.locality,
                      stateOrProvinceCode: group.origin.region,
                      postalCode: group.origin.postalCode,
                      countryCode: group.origin.countryCode,
                      residential: false,
                    };

                    const fedexRate = await Promise.race([
                      fedexClient.getRateForOrigin(
                        destination,
                        packages,
                        shipperAddress,
                      ),
                      new Promise<null>((_, reject) =>
                        setTimeout(
                          () => reject(new Error("FedEx timeout")),
                          FEDEX_TIMEOUT,
                        ),
                      ),
                    ]);

                    return fedexRate
                      ? {
                          service_code: "FEDEX_SMALL_PARCEL",
                          originKey,
                          rate: fedexRate.rate,
                          transitDays: fedexRate.transitDays,
                        }
                      : null;
                  } catch (err) {
                    console.warn(`⚠️ FedEx ${originKey} failed`);
                    return null;
                  }
                })(),
            );

            const results = await Promise.all(fedexCalls);
            return results.filter(Boolean);
          } catch (err) {
            console.warn("⚠️ FedEx failed:", err);
            return null;
          }
        })(),
      );
    } else {
      // ✅ CALL FEDEX FREIGHT LTL
      console.log("🟠 Calling FedEx Freight LTL API");

      const fedexLTLCalls = Array.from(itemsByOrigin.entries()).map(
        ([originKey, group]) =>
          getFedExLTLRateFast(originKey, group, destination),
      );
      ratePromises.push(...fedexLTLCalls);
    }

    // 2. WWEX calls in parallel
    const wwexCalls = Array.from(itemsByOrigin.entries()).map(
      ([originKey, group]) =>
        getWWEXRateFast(originKey, group, destination, rate),
    );
    ratePromises.push(...wwexCalls);

    // 3. SEFL calls in parallel
    const SEFL_SUPPORTED_ORIGINS = ["RLX"];
    const isSingleRLXShipment =
      itemsByOrigin.size === 1 && itemsByOrigin.has("RLX");
    const seflCalls = isSingleRLXShipment
      ? Array.from(itemsByOrigin.entries())
          // .filter(([originKey]) => {
          //   if (!SEFL_SUPPORTED_ORIGINS.includes(originKey)) {
          //     console.log(
          //       `⏭️ Skipping SEFL for ${originKey} — outside SEFL Southeast network`,
          //     );
          //     return false;
          //   }
          //   return true;
          // })
          .map(([originKey, group]) =>
            getSEFLRateFast(originKey, group, destination),
          )
      : [];

    if (!isSingleRLXShipment) {
      console.log(
        `⏭️ Skipping SEFL — split shipment across multiple warehouses`,
      );
    }
    ratePromises.push(...seflCalls);

    // =====================================================
    // STEP 3: WAIT WITH GLOBAL TIMEOUT
    // =====================================================

    const allResults = await Promise.race([
      Promise.allSettled(ratePromises),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Global timeout")), MAX_TOTAL_TIME),
      ),
    ]).catch(() => {
      console.warn("⚠️ Global timeout hit!");
      return [];
    });

    // =====================================================
    // STEP 4: PROCESS RESULTS
    // =====================================================

    const rates: any[] = [];
    const wwexRates: any[] = [];
    const fedexRates: any[] = [];
    const seflRates: any[] = [];
    const fedexLTLRates: any[] = [];

    for (const result of allResults as PromiseSettledResult<any>[]) {
      if (result.status === "fulfilled" && result.value) {
        if (Array.isArray(result.value)) {
          // FedEx results array
          fedexRates.push(...result.value);
        } else if (result.value.service_code === "FEDEX_SMALL_PARCEL") {
          fedexRates.push(result.value);
        } else if (result.value.quoteNumber) {
          // SEFL result (has quoteNumber)
          seflRates.push(result.value);
        } else if (result.value.isFedExLTL) {
          // FedEx LTL result (NEW)
          fedexLTLRates.push(result.value);
        } else if (result.value.rate) {
          // WWEX result
          wwexRates.push(result.value);
        }
      }
    }

    // =====================================================
    // STEP 5: SELECT LOWEST RATE BETWEEN WWEX AND SEFL
    // =====================================================

    // Combine FedEx rates
    if (shouldCallFedEx && fedexRates.length > 0) {
      const totalFedEx = fedexRates.reduce((sum, r) => sum + r.rate, 0);
      // const maxTransit = Math.max(...fedexRates.map((r) => r.transitDays));

      rates.push({
        service_name: "FedEx Small Parcel",
        service_code: "FEDEX_SMALL_PARCEL",
        total_price: Math.round(totalFedEx * 100).toString(),
        currency: "USD",
        description:
          "Production time: 7–14 business days. Transit: 3-5 business days",
      });
    }

    // 2. FedEx Freight LTL (if not eligible for small parcel and called)
    if (!shouldCallFedEx && fedexLTLRates.length > 0) {
      const totalFedExLTL = fedexLTLRates.reduce((sum, r) => sum + r.rate, 0);

      rates.push({
        service_name: "FedEx Freight LTL",
        service_code: "FEDEX_FREIGHT_LTL",
        total_price: Math.round(totalFedExLTL * 100).toString(),
        currency: "USD",
        description:
          "Production time: 7–14 business days. Transit: 3-5 business days",
      });

      console.log(`✅ FedEx Freight LTL: $${totalFedExLTL.toFixed(2)}`);
    }

    // Compare WWEX vs SEFL and pick the lowest
    const freightRates = [];

    if (wwexRates.length > 0) {
      const totalWWEX = wwexRates.reduce((sum, r) => sum + r.rate, 0);
      freightRates.push({
        service_name: "Speedship Freight",
        service_code: "SPEEDSHIP_FREIGHT",
        rate: totalWWEX,
      });
    }

    if (seflRates.length > 0) {
      const totalSEFL = seflRates.reduce((sum, r) => sum + r.rate, 0);
      freightRates.push({
        service_name: "SEFL Freight",
        service_code: "SEFL_FREIGHT",
        rate: totalSEFL,
      });
    }

    // Pick the lowest freight rate
    if (freightRates.length > 0) {
      freightRates.sort((a, b) => a.rate - b.rate);
      const lowestFreight = freightRates[0];

      rates.push({
        service_name: lowestFreight.service_name,
        service_code: lowestFreight.service_code,
        total_price: Math.round(lowestFreight.rate * 100).toString(),
        currency: "USD",
        description:
          "Production time: 7–14 business days. Transit: 3-5 business days",
      });

      console.log(
        `\n🏆 LOWEST FREIGHT RATE: ${lowestFreight.service_name} - $${lowestFreight.rate.toFixed(2)}`,
      );
    }

    // Fallback
    if (rates.length === 0) {
      const estimatedRate = 150 + totalWeight * 0.5;
      rates.push({
        service_name: "Speedship Freight (Estimated)",
        service_code: "SPEEDSHIP_FREIGHT_ESTIMATED",
        total_price: Math.round(estimatedRate * 100).toString(),
        currency: "USD",
        description:
          "Production time: 7–14 business days. Transit: 3-5 business days",
      });
    }

    const totalTime = Date.now() - globalStartTime;
    console.log(`⚡ TOTAL TIME: ${totalTime}ms`);

    return NextResponse.json({ rates });
  } catch (error: any) {
    console.error("🔴 Error:", error.message);

    await logError("CARRIER_SERVICE_ERROR", error.message, error.stack);

    // Return fallback on error
    return NextResponse.json({
      rates: [
        {
          service_name: "Speedship Freight (Estimated)",
          service_code: "SPEEDSHIP_FREIGHT_ERROR_FALLBACK",
          total_price: "15000",
          currency: "USD",
          description:
            "Production time: 7–14 business days. Transit: 3-5 business days",
        },
      ],
    });
  }
}

export async function GET() {
  try {
    const rate = await getLatestWWEXRate();
    return NextResponse.json({ success: true, data: rate });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
