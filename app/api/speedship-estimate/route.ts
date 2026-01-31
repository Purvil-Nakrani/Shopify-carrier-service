import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import axios from "axios";
import {
  logRateRequest,
  logWWEXResponse,
  getCachedRate,
  cacheRate,
  logError,
  getLatestWWEXRate,
  logFinalShippingRate,
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

const apiUrl = "https://auth.wwex.com";

const clientId =
  process.env.WWEX_CLIENT_ID || "TDWIzAaXFdcFtrwDg5Wo6ppnLYZdsGTm";
const clientSecret =
  process.env.WWEX_CLIENT_SECRET ||
  "V547FsGpINlNRj8QilFfkv-cyAUE136U8zshl7SkgltllPTO5iaeDnm-Ks-Ny2s7";

let accessToken: string | null = null;
let tokenExpiry = 0;

const getAccessToken = async () => {
  if (accessToken && Date.now() < tokenExpiry) {
    return accessToken;
  }

  if (!clientId || !clientSecret) {
    throw new Error("WWEx credentials missing (CLIENT_ID / CLIENT_SECRET)");
  }

  console.log("🟢 Requesting WWEx OAuth token...");

  const response = await axios.post(
    `${apiUrl}/oauth/token`,
    new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      audience: "wwex-apig",
    }),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    },
  );

  accessToken = response.data.access_token;
  tokenExpiry = Date.now() + 55 * 60 * 1000;

  console.log("🟢 WWEx OAuth token obtained");
  return accessToken;
};
// =====================================================
// GEOCODING INTERFACES AND CACHE
// =====================================================

interface GeocodingResult {
  lat: number;
  lng: number;
}

const geocodingCache = new Map<string, GeocodingResult>();
const FIXED_PALLET_HEIGHT_IN = 30;

// =====================================================
// GEOCODING FUNCTIONS
// =====================================================

async function geocodeAddress(address: {
  address1?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  country?: string;
}): Promise<GeocodingResult | null> {
  try {
    const addressString =
      `${address.address1 || ""}, ${address.city || ""}, ${address.province || ""} ${address.postal_code || ""}, ${address.country || "US"}`.trim();

    console.log(`   🌐 Geocoding address: ${addressString}`);

    // Using Nominatim (OpenStreetMap) - Free
    const response = await axios.get(
      "https://nominatim.openstreetmap.org/search",
      {
        params: {
          q: addressString,
          format: "json",
          limit: 1,
        },
        headers: {
          "User-Agent": "SpeedshipRoutingApp/1.0",
        },
        timeout: 5000,
      },
    );

    if (response.data && response.data.length > 0) {
      const result = {
        lat: parseFloat(response.data[0].lat),
        lng: parseFloat(response.data[0].lon),
      };
      console.log(`   ✅ Geocoded to: ${result.lat}, ${result.lng}`);
      return result;
    }

    console.warn("   ⚠️ Geocoding failed, no results found");
    return null;
  } catch (error: any) {
    console.error("   🔴 Geocoding error:", error.message);
    return null;
  }
}

async function getCachedGeocode(address: {
  address1?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  country?: string;
}): Promise<GeocodingResult | null> {
  const cacheKey = `${address.address1}-${address.city}-${address.province}-${address.postal_code}`;

  if (geocodingCache.has(cacheKey)) {
    console.log("   💾 Using cached geocoding result");
    return geocodingCache.get(cacheKey)!;
  }

  const result = await geocodeAddress(address);

  if (result) {
    geocodingCache.set(cacheKey, result);
  }

  return result;
}

// =====================================================
// COLOR-BASED ROUTING
// =====================================================

type ColorGroup =
  | "DOUBLE_SIDED_TAPE"
  | "ADHESIVE_GLUE"
  | "FLOORING_GLUE"
  | "FLOOR_CLEANER"
  | "BLACK"
  | "BLUE"
  | "ORANGE"
  | "RED"
  | "BRIGHT_GREEN"
  | "SILVER"
  | "WHITE"
  | "CONFETTI"
  | "GRAY"
  | "BLUE_GRAY"
  | "FOREST_GREEN"
  | "GREEN"
  | "COCOA"
  | "BLUGRAY";

function getColorGroup(item: any): ColorGroup {
  const title = `${item.name || ""} ${item.variant_title || ""}`.toLowerCase();

  if (title.includes("tape")) return "DOUBLE_SIDED_TAPE";
  if (title.includes("adhesive") || title.includes("RLX"))
    return "ADHESIVE_GLUE";
  if (title.includes("glue") || title.includes("Flooring"))
    return "FLOORING_GLUE";
  if (title.includes("cleaner")) return "FLOOR_CLEANER";

  // ARC Exclusive Colors
  if (title.includes("bright green")) return "BRIGHT_GREEN";
  if (title.includes("silver")) return "SILVER";
  if (title.includes("white")) return "WHITE";

  // RubberLogix Exclusive Colors
  if (title.includes("confetti")) return "CONFETTI";
  if (title.includes("gray") && !title.includes("blue")) return "GRAY";
  if (title.includes("blue") && title.includes("gray")) return "BLUE_GRAY";
  if (title.includes("blugray")) return "BLUGRAY";
  if (title.includes("forest green")) return "FOREST_GREEN";
  if (title.includes("green")) return "GREEN";
  if (title.includes("cocoa")) return "COCOA";

  // Colors Both Offer
  if (title.includes("black")) return "BLACK";
  if (title.includes("blue") && !title.includes("gray")) return "BLUE";
  if (title.includes("orange")) return "ORANGE";
  // if (title.includes("red") && !title.includes("brick")) return "RED";
  if (title.includes("red") && title.includes("brick")) return "RED";

  // Default fallback
  return "BLACK";
}

const COLOR_WAREHOUSE_MAP: Record<
  ColorGroup,
  Array<"RLX" | "ARC_AZ" | "ARC_WI">
> = {
  // ARC Exclusive Colors
  BRIGHT_GREEN: ["ARC_AZ", "ARC_WI"],
  SILVER: ["ARC_AZ", "ARC_WI"],
  WHITE: ["ARC_AZ", "ARC_WI"],

  // RubberLogix Exclusive Colors
  CONFETTI: ["RLX"],
  GRAY: ["RLX"],
  BLUE_GRAY: ["RLX"],
  BLUGRAY: ["RLX"],
  FOREST_GREEN: ["RLX"],
  GREEN: ["RLX"],
  COCOA: ["RLX"],

  //RLX Exclusive Accessories
  DOUBLE_SIDED_TAPE: ["RLX"],
  ADHESIVE_GLUE: ["RLX"],
  FLOORING_GLUE: ["RLX"],
  FLOOR_CLEANER: ["RLX"],

  // Colors Both Offer
  BLACK: ["RLX", "ARC_AZ", "ARC_WI"],
  BLUE: ["RLX", "ARC_AZ", "ARC_WI"],
  ORANGE: ["RLX", "ARC_AZ", "ARC_WI"],
  RED: ["RLX", "ARC_AZ", "ARC_WI"],
};

// =====================================================
// WAREHOUSE ADDRESSES
// =====================================================

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
// DISTANCE CALCULATION
// =====================================================

function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180; //-0.076
  const dLng = ((lng2 - lng1) * Math.PI) / 180; //-0.116
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// =====================================================
// FIND CLOSEST WAREHOUSE - WITH EXACT ADDRESS
// =====================================================

async function findClosestWarehouseExact(
  availableWarehouses: Array<"RLX" | "ARC_AZ" | "ARC_WI">,
  destinationAddress: {
    address1?: string;
    city?: string;
    province?: string;
    postal_code?: string;
    country?: string;
  },
): Promise<"RLX" | "ARC_AZ" | "ARC_WI"> {
  // Try to get exact coordinates for destination
  let destCoords = await getCachedGeocode(destinationAddress);

  // Fallback to state coordinates if geocoding fails
  if (!destCoords && destinationAddress.province) {
    console.log("   ⚠️ Geocoding failed, falling back to state coordinates");
    destCoords = STATE_COORDINATES[destinationAddress.province];
  }

  if (!destCoords) {
    console.log(
      `   ⚠️ Could not determine coordinates, defaulting to first warehouse`,
    );
    return availableWarehouses[0];
  }

  let closestWarehouse = availableWarehouses[0];
  let minDistance = Infinity;

  for (const warehouse of availableWarehouses) {
    const warehouseCoords = ORIGIN_ADDRESSES[warehouse].coordinates;
    const distance = calculateDistance(
      destCoords.lat,
      destCoords.lng,
      warehouseCoords.lat,
      warehouseCoords.lng,
    );

    console.log(`   📏 Distance to ${warehouse}: ${distance.toFixed(0)} miles`);

    if (distance < minDistance) {
      minDistance = distance;
      closestWarehouse = warehouse;
    }
  }

  console.log(
    `   ✅ Closest warehouse: ${closestWarehouse} (${minDistance.toFixed(0)} miles)`,
  );
  return closestWarehouse;
}

// =====================================================
// FREIGHT FUNCTIONS
// =====================================================

function generateCacheKey(
  origin: string,
  destination: string,
  weight: number,
): string {
  const weightBucket = Math.ceil(weight / 100) * 100;
  return `speedship-${origin}-${destination}-${weightBucket}`;
}

type FreightMode = "LTL" | "FTL";

function determineFreightMode(
  totalWeight: number,
  palletsNeeded: number,
): FreightMode {
  if (totalWeight > 20000 || palletsNeeded >= 8) {
    return "FTL";
  }
  return "LTL";
}

function calculateDensityAndClass(
  weight: number,
  length: number,
  width: number,
  height: number,
): { density: number; freightClass: string } {
  const volume = (length * width * height) / 1728;
  if (volume === 0) return { density: 0, freightClass: "70" };

  console.log("volume===================>", volume);

  const density = weight / volume;

  console.log("density============================>", density);
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

interface PalletConfig {
  palletsNeeded: number;
  weightPerPallet: number;
  height: number;
  density: number;
  freightClass: string;
  estimatedSavings: number;
}

function optimizeMultiPalletConfiguration(totalWeight: number): PalletConfig {
  const MAX_SAFE_WEIGHT = 2000;
  const MIN_WEIGHT_PER_PALLET = 1200;

  const minPallets = Math.ceil(totalWeight / MAX_SAFE_WEIGHT);
  const maxPallets = Math.min(
    Math.ceil(totalWeight / MIN_WEIGHT_PER_PALLET),
    8,
  );

  console.log(`\n💰 PALLET OPTIMIZATION FOR ${totalWeight} LBS:`);
  console.log(
    `   Testing ${minPallets} to ${maxPallets} pallet configurations...`,
  );

  let bestConfig: PalletConfig | null = null;
  const classToNumber = (cls: string) => parseFloat(cls);

  for (let palletCount = minPallets; palletCount <= maxPallets; palletCount++) {
    const weightPerPallet = totalWeight / palletCount;
    // const height = optimizePalletHeight(weightPerPallet);
    const height = FIXED_PALLET_HEIGHT_IN;
    const { density, freightClass } = calculateDensityAndClass(
      weightPerPallet,
      48,
      40,
      height,
    );
    const classNum = classToNumber(freightClass);

    console.log(
      `   ${palletCount} pallets: ${weightPerPallet.toFixed(
        0,
      )} lbs/pallet, ${height}" high, density ${density.toFixed(
        2,
      )}, class ${freightClass}`,
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

  console.log("\n✅ SELECTED CONFIGURATION:");
  console.log(`   Pallets: ${bestConfig.palletsNeeded}`);
  console.log(
    `   Weight per pallet: ${bestConfig.weightPerPallet.toFixed(2)} lbs`,
  );
  console.log(`   Height: ${bestConfig.height}"`);
  console.log(`   Density: ${bestConfig.density.toFixed(2)} lbs/cu.ft`);
  console.log(`   Freight Class: ${bestConfig.freightClass}`);
  if (bestConfig.estimatedSavings > 0) {
    console.log(`   💵 Estimated savings: ${bestConfig.estimatedSavings}\n`);
  }

  return bestConfig;
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

function hasAccessorials(offer: any): boolean {
  const product = offer?.offeredProductList?.[0];
  return (
    Array.isArray(product?.accessorialChargeList) &&
    product.accessorialChargeList.length > 0
  );
}

// =====================================================
// MAIN POST FUNCTION
// =====================================================

export async function POST(request: NextRequest) {
  console.log("🟢 Speedship API - Exact Address Distance-Based Routing v7.0");
  const startTime = Date.now();

  let res;

  try {
    const rawBody = await request.text();
    const hmacHeader = request.headers.get("X-Shopify-Hmac-Sha256") || "";
    // console.log("🟢 hmacHeader===================", hmacHeader);
    console.log("rawbody=========================>", rawBody);

    // Verify webhook authenticity
    if (!verifyShopifyWebhook(rawBody, hmacHeader)) {
      console.error("🔴 Invalid Shopify webhook signature");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    console.log("🟢 body items===================", body.rate.items);
    const requestId = `SPEEDSHIP-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    const { rate } = body;
    if (!rate) return NextResponse.json({ rates: [] });

    const destination = rate.destination || {};
    const items = rate.items || [];

    console.log(`\n🎯 Destination: ${destination.address1}`);
    console.log(
      `   ${destination.city}, ${destination.province} ${destination.postal_code}`,
    );

    // =====================================================
    // VALIDATE US DOMESTIC SHIPPING
    // =====================================================
    const originCountry = rate.origin?.country || "US";
    const destinationCountry = destination.country || "US";

    if (originCountry !== "US" || destinationCountry !== "US") {
      console.warn(
        `🔴 Speedship only supports US domestic shipping. Origin: ${originCountry}, Destination: ${destinationCountry}`,
      );
      return NextResponse.json({ rates: [] });
    }

    function isShippingProtection(item: any): boolean {
      const title = `${item.name || ""}`.toLowerCase();
      return title.includes("shipping protection");
    }

    // =====================================================
    // GROUP ITEMS BY CLOSEST WAREHOUSE (USING EXACT ADDRESS)
    // =====================================================
    interface ItemGroup {
      origin: (typeof ORIGIN_ADDRESSES)[keyof typeof ORIGIN_ADDRESSES];
      originKey: string;
      items: any[];
      totalWeight: number;
      perItemWeight: number;
    }

    const itemsByOrigin = new Map<string, ItemGroup>();

    for (const item of items) {
      // 🚫 SKIP SHIPPING PROTECTION COMPLETELY
      if (isShippingProtection(item)) {
        console.log(
          `🛡️ Skipping Shipping Protection from routing: ${item.name}`,
        );
        continue;
      }

      const isEmptyProperties =
        !item.properties || Object.keys(item.properties).length === 0;

      let perItemWeight = 0;
      if (!isEmptyProperties && item.properties?.Weight) {
        const width = parseFloat(item.properties?.["Width (ft)"] || 0);
        const length = parseFloat(item.properties?.["Length (ft)"] || 0);

        const areaSqFT = Number(width * length);

        const grams = Number(item.grams) || 0;
        const perSqFTWeight = Number((grams / 453.592).toFixed(2));
        perItemWeight = perSqFTWeight * areaSqFT;
      } else {
        const grams = Number(item.grams) || 0;
        perItemWeight = Number((grams / 453.592).toFixed(2));
      }

      const itemQuantity = isEmptyProperties
        ? item.quantity
        : item.properties.Quantity || item.quantity;

      // STEP 1: Detect color group
      const colorGroup = getColorGroup(item);

      // STEP 2: Allowed warehouses by color
      const allowedWarehouses = COLOR_WAREHOUSE_MAP[colorGroup];

      // STEP 3: Pick closest warehouse using EXACT ADDRESS
      const selectedWarehouse = await findClosestWarehouseExact(
        allowedWarehouses,
        destination,
      );

      // // STEP 4: Origin address
      const originAddress = ORIGIN_ADDRESSES[selectedWarehouse];

      console.log(`\n📦 Item: ${item.name}`);
      console.log(`   🎨 Color Group: ${colorGroup}`);
      console.log(
        `   🏭 Selected Warehouse: ${selectedWarehouse} (${originAddress.locality}, ${originAddress.region})`,
      );

      // Group items by warehouse
      if (!itemsByOrigin.has(selectedWarehouse)) {
        itemsByOrigin.set(selectedWarehouse, {
          origin: originAddress,
          originKey: selectedWarehouse,
          items: [],
          totalWeight: 0,
          perItemWeight: 0,
        });
      }

      const group = itemsByOrigin.get(selectedWarehouse)!;
      const totalItemWeight = perItemWeight * itemQuantity;

      group.items.push({
        ...item,
        perItemWeight,
        itemQuantity,
        totalItemWeight,
      });
      group.totalWeight += totalItemWeight;
    }

    console.log(`\n🟢 SHIPMENT SUMMARY:`);
    itemsByOrigin.forEach((group, key) => {
      console.log(
        `   📍 ${key}: ${group.origin.locality}, ${group.origin.region}`,
      );
      console.log(
        `      Items: ${
          group.items.length
        }, Weight: ${group.totalWeight.toFixed(2)} lbs`,
      );
    });

    // Log request to database
    const totalWeightForLog = Array.from(itemsByOrigin.values()).reduce(
      (sum, group) => sum + group.totalWeight,
      0,
    );

    // =====================================================
    // HARD STOP: MAX FREIGHT WEIGHT CHECK (Shopify-safe)
    // =====================================================
    const MAX_FREIGHT_WEIGHT = 20000;

    if (totalWeightForLog > MAX_FREIGHT_WEIGHT) {
      console.warn(
        `🔴 Total shipment weight ${totalWeightForLog.toFixed(
          2,
        )} lbs exceeds maximum allowed ${MAX_FREIGHT_WEIGHT} lbs`,
      );

      return NextResponse.json({
        rates: [
          {
            service_name: "Freight – Manual Quote Required",
            service_code: "FREIGHT_OVERWEIGHT",
            total_price: "0",
            currency: "USD",
            description:
              "This order exceeds the maximum freight weight limit. Please contact support to arrange a custom shipping quote.",
          },
        ],
      });
    }

    await logRateRequest({
      requestId,
      origin: rate.origin?.postal_code || "",
      destination,
      weight: totalWeightForLog,
      price: parseFloat(rate.order_totals?.subtotal_price || 0),
      items: items.map((item: any) => ({
        ...item,
        shippingMethod: "Speedship API",
      })),
    });

    // =====================================================
    // PROCESS EACH ORIGIN SEPARATELY
    // =====================================================
    const allShipmentRates: any[] = [];
    const rates = [];

    for (const [originKey, group] of itemsByOrigin.entries()) {
      const finalWeight = group.totalWeight;

      console.log(`\n\n🚚 ========================================`);
      console.log(
        `🚚 PROCESSING SHIPMENT FROM: ${group.origin.locality}, ${group.origin.region}`,
      );
      console.log(`🚚 Weight: ${finalWeight.toFixed(2)} lbs`);
      console.log(`🚚 ========================================\n`);

      const optimizedConfig = optimizeMultiPalletConfiguration(finalWeight);
      const palletsNeeded = optimizedConfig.palletsNeeded;
      const weightPerPallet = optimizedConfig.weightPerPallet;
      const optimizedHeight = FIXED_PALLET_HEIGHT_IN;
      const freightClass = optimizedConfig.freightClass;

      const freightMode = determineFreightMode(finalWeight, palletsNeeded);

      console.log("🚚 FREIGHT MODE DECISION:");
      console.log(`   Total Weight: ${finalWeight} lbs`);
      console.log(`   Pallets: ${palletsNeeded}`);
      console.log(`   Selected Mode: ${freightMode}`);

      // Build handling units
      const handlingUnitList = [];
      for (let i = 0; i < palletsNeeded; i++) {
        const isLastPallet = i === palletsNeeded - 1;
        const palletWeight = isLastPallet
          ? finalWeight - weightPerPallet * (palletsNeeded - 1)
          : weightPerPallet;

        const { freightClass: palletClass } = calculateDensityAndClass(
          palletWeight,
          48,
          40,
          optimizedHeight,
        );

        handlingUnitList.push({
          quantity: 1,
          packagingType: "PLT",
          isStackable: false,
          billedDimension: {
            length: { value: 48, unit: "IN" },
            width: { value: 40, unit: "IN" },
            height: { value: optimizedHeight, unit: "IN" },
          },
          weight: { value: Math.ceil(palletWeight), unit: "LB" },
          shippedItemList: [
            {
              commodityClass: palletClass,
              isHazMat: false,
              weight: { value: Math.ceil(palletWeight), unit: "LB" },
            },
          ],
        });
      }

      // Build WWEX request
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
                // locationType: "RESIDENTIAL",
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
                // locationType: "COMMERCIAL",
                locationType: "RESIDENTIAL",
              },
              totalWeight: { value: Math.ceil(finalWeight), unit: "LB" },
              description: `Full Truckload - ${palletsNeeded} pallets from ${group.origin.locality}`,
              residentialDeliveryFlag: true,
              residentialPickupFlag: false,
              liftgateDeliveryFlag: false,
              // liftgateDeliveryFlag: true,
              liftgatePickupFlag: false,
              insideDeliveryFlag: false,
              insidePickupFlag: false,
              holdAtTerminalFlag: false,
              notifyBeforeDeliveryFlag: false,
              carrierTerminalPickupFlag: false,
              protectionFromColdFlag: false,
              isSignatureRequired: false,
              insuredCommodityCategory: "400",
              totalDeclaredValue: { value: "0", unit: "USD" },
            },
          },
          correlationId: `${requestId}-${originKey}`,
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
              totalHandlingUnitCount: palletsNeeded,
              totalWeight: { value: Math.ceil(finalWeight), unit: "LB" },
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
          correlationId: `${requestId}-${originKey}`,
        };
      }

      console.log("💰 COST OPTIMIZATIONS APPLIED:");
      console.log(`   ✅ Optimized pallets: ${palletsNeeded}`);
      console.log(`   ✅ Optimized height: ${optimizedHeight}"`);
      console.log(`   ✅ Freight class: ${freightClass}`);

      console.log(
        "\n🟢 WWEX Request:",
        JSON.stringify(speedshipRequest, null, 2),
      );

      // =====================================================
      // CALL WWEX API
      // =====================================================
      const speedshipStartTime = Date.now();

      const token = await getAccessToken();

      try {
        const response = await axios.post(
          "https://www.speedship.com/svc/shopFlow",
          speedshipRequest,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            timeout: 40000,
          },
        );

        const speedshipResponseTime = Date.now() - speedshipStartTime;
        console.log(
          `🟢 WWEX API response time for ${originKey}: ${speedshipResponseTime}ms`,
        );

        res = response.data;

        const offerList = response.data?.response?.offerList || [];

        if (offerList.length === 0) {
          console.warn(`⚠️ No offers from WWEX for ${originKey}`);
          continue;
        }

        const sortedOffers = offerList
          .filter((o: any) => o.totalOfferPrice?.value)
          .sort(
            (a: any, b: any) =>
              Number(a.totalOfferPrice.value) - Number(b.totalOfferPrice.value),
          );

        console.log(
          `💰 WWEX returned ${sortedOffers.length} offers for ${originKey}:`,
        );
        sortedOffers.forEach((offer: any, idx: number) => {
          const product = offer.offeredProductList[0];
          console.log(
            `   ${idx + 1}. ${offer.totalOfferPrice.value} - ${
              product?.shopRQShipment?.timeInTransit?.serviceLevel || "Standard"
            }`,
          );
        });

        const selectedOffer = sortedOffers[0];
        if (!selectedOffer) {
          console.warn(`⚠️ No valid offers for ${originKey}`);
          continue;
        }

        const product = selectedOffer.offeredProductList[0];
        const speedshipRate = Number(product.offerPrice.value);
        const transitDays =
          Number(product.shopRQShipment?.timeInTransit?.transitDays) || 5;
        const serviceLevel =
          product.shopRQShipment?.timeInTransit?.serviceLevel || "Freight";
        const offerID = product.offerId;
        const productTransactionId = product.productTransactionId;
        const quoteId = `SPEEDSHIP-${Date.now()}`;

        console.log(`\n💰 SELECTED RATE FOR ${originKey}:`);
        console.log(`   Rate: ${speedshipRate.toFixed(2)}`);
        console.log(`   Transit: ${transitDays} days`);
        console.log(`   Service: ${serviceLevel}`);
        console.log(`   OfferId: ${offerID}`);
        console.log(`   ProductTransactionId: ${productTransactionId}`);

        // Log Speedship response with all important details
        await logWWEXResponse({
          requestId,
          quoteId: quoteId,
          rate: speedshipRate,
          transitDays,
          serviceLevel: `Speedship ${serviceLevel}`,
          responseTimeMs: speedshipResponseTime,
          rawResponse: response.data,
        });

        allShipmentRates.push({
          origin: group.origin,
          originKey,
          rate: speedshipRate,
          transitDays,
          serviceLevel,
          palletsNeeded,
          weight: finalWeight,
          offer: selectedOffer,
          responseTimeMs: speedshipResponseTime,
        });
      } catch (error: any) {
        console.error(`🔴 WWEX API Error for ${originKey}:`, error.message);
        if (error.response) {
          console.error("🔴 Response:", error.response.data);
          console.error("🔴 Status:", error.response.status);
        }
        await logError(
          `SPEEDSHIP_API_ERROR_${originKey}`,
          error.message,
          error.stack,
          {
            responseData: error.response?.data,
            statusCode: error.response?.status,
            origin: originKey,
          },
        );
      }
    }

    // =====================================================
    // COMBINE ALL RATES
    // =====================================================
    if (allShipmentRates.length > 0) {
      let totalRate = allShipmentRates.reduce((sum, r) => sum + r.rate, 0);
      console.log("total rate===============================>", totalRate);
      totalRate = totalRate * 1.06;
      console.log(
        "after 6% add total rate=======================================>",
        totalRate,
      );
      const maxTransitDays = Math.max(
        ...allShipmentRates.map((r) => r.transitDays),
      );
      const totalPallets = allShipmentRates.reduce(
        (sum, r) => sum + r.palletsNeeded,
        0,
      );
      const origins = allShipmentRates.map(
        (r) => `${r.origin.locality}, ${r.origin.region}`,
      );

      console.log("\n\n🎯 ========================================");
      console.log("🎯 FINAL COMBINED RATE");
      console.log("🎯 ========================================");
      console.log(`   Total Rate: ${totalRate.toFixed(2)}`);
      console.log(`   Max Transit: ${maxTransitDays} days`);
      console.log(`   Total Pallets: ${totalPallets}`);
      console.log(`   Origins: ${origins.join(" + ")}`);

      const productionTimeText = "Production time: 7–14 business days.";

      const shippingText = `Transit: 3-5 business days`;

      const description = `${productionTimeText} ${shippingText}`;

      // const description =
      //   allShipmentRates.length === 1
      //     ? `${maxTransitDays} business days (${totalPallets} pallet${
      //         totalPallets > 1 ? "s" : ""
      //       } from ${origins[0]})`
      //     : `${maxTransitDays} business days (${
      //         allShipmentRates.length
      //       } shipments: ${origins.join(" & ")})`;

      const formatDate = (d: Date) => d.toISOString().split("T")[0];

      rates.push({
        service_name: "Speedship Freight",
        service_code: "SPEEDSHIP_FREIGHT",
        total_price: Math.round(totalRate * 100).toString() || "100",
        currency: "USD",
        description,
        // min_delivery_date: formatDate(getDeliveryDate(maxTransitDays + 7)),
        // max_delivery_date: formatDate(getDeliveryDate(maxTransitDays + 9)),
      });

      console.log("rates========================>", rates);

      await logFinalShippingRate({
        requestId: "",
        combinedRate: totalRate,
        transitDays: maxTransitDays,
        destination: destination,
        items: items,
      });

      console.log("✅ Successfully created combined rate");
    } else {
      console.warn("⚠️ No valid rates obtained");
      const totalWeight = Array.from(itemsByOrigin.values()).reduce(
        (sum, g) => sum + g.totalWeight,
        0,
      );
      const estimatedRate = 150 + totalWeight * 0.5;

      rates.push({
        service_name: "Speedship Freight (Estimated)",
        service_code: "SPEEDSHIP_FREIGHT_FALLBACK",
        total_price: Math.round(estimatedRate * 100).toString(),
        currency: "USD",
        description: "Estimated 7 business days",
        min_delivery_date: getDeliveryDate(7).toISOString(),
        max_delivery_date: getDeliveryDate(9).toISOString(),
      });
    }

    return NextResponse.json({ rates });
    // return NextResponse.json({ rates: [] });
  } catch (error: any) {
    console.error("🔴 Speedship Estimate Error:", error);
    await logError("SPEEDSHIP_ESTIMATE_ERROR", error.message, error.stack);
    return NextResponse.json({ rates: [] });
  }
}

export async function GET() {
  try {
    const rate = await getLatestWWEXRate();

    return NextResponse.json({
      success: true,
      data: rate,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
