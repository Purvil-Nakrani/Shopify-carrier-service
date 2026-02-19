import axios from "axios";
import { getFEDEXToken } from "./getFEDEXToken";

// =====================================================
// TIMEOUT CONFIGURATION
// =====================================================
const FEDEX_API_TIMEOUT = 3500; // 3.5 seconds per API call

// =====================================================
// INTERFACES
// =====================================================

interface ShopifyItem {
  name: string;
  sku: string;
  quantity: number;
  grams: number;
  price: number;
  properties: any;
  product_id: number;
  variant_id: number;
}

interface ProcessedItem {
  weight: number;
  totalWeight: number;
  quantity: number;
  name: string;
  type: "ROLL" | "MAT" | "TILE";
}

interface ConsolidatedPackage {
  weight: number;
  items: ProcessedItem[];
}

interface FedExRateResponse {
  quoteId: string;
  rate: number;
  transitDays: number;
  serviceLevel: string;
  currency: string;
  packages: number;
}

// =====================================================
// OPTIMIZED PACKAGE CONSOLIDATOR
// =====================================================

class FastPackageConsolidator {
  public consolidate(items: ProcessedItem[]): ConsolidatedPackage[] {
    const packages: ConsolidatedPackage[] = [];

    // Expand items by quantity
    const expandedItems: ProcessedItem[] = [];
    for (const item of items) {
      for (let i = 0; i < item.quantity; i++) {
        expandedItems.push({ ...item, quantity: 1 });
      }
    }

    // Sort by weight (heaviest first)
    expandedItems.sort((a, b) => b.weight - a.weight);

    // Simple bin packing
    for (const item of expandedItems) {
      let placed = false;

      for (const pkg of packages) {
        if (pkg.weight + item.weight <= 150) {
          pkg.weight += item.weight;
          pkg.items.push(item);
          placed = true;
          break;
        }
      }

      if (!placed) {
        packages.push({
          weight: item.weight,
          items: [item],
        });
      }
    }

    return packages;
  }
}

// =====================================================
// MAIN FEDEX CLIENT
// =====================================================

export class FedExClient {
  private apiUrl = process.env.FEDEX_API_URL_SMALL;
  private accountNumber = process.env.FEDEX_ACCOUNT_SMALL || "";

  // =====================================================
  // HELPER: Extract thickness
  // =====================================================
  private extractThickness(name: string): number {
    if (!name) return 0.25;

    const fractionMatch = name.match(/\b(\d+)\s*\/\s*(\d+)(?=")?/);
    if (fractionMatch) {
      return Number(fractionMatch[1]) / Number(fractionMatch[2]);
    }

    const mmMatch = name.match(/\b(\d+(?:\.\d+)?)\s*mm\b/i);
    if (mmMatch) {
      return Number(mmMatch[1]) / 25.4;
    }

    return 0.25;
  }

  // =====================================================
  // HELPER: Extract dimensions
  // =====================================================
  private extractDimensions(
    name: string,
  ): { width: number; length: number } | null {
    const feetMatch = name.match(/(\d+)'\s*x\s*(\d+)'/i);
    if (feetMatch) {
      return { width: Number(feetMatch[1]), length: Number(feetMatch[2]) };
    }

    const plainMatch = name.match(/(\d+)\s*x\s*(\d+)/i);
    if (plainMatch) {
      const val1 = Number(plainMatch[1]);
      const val2 = Number(plainMatch[2]);
      if (val1 < 10 && val2 < 10) {
        return { width: val1, length: val2 };
      }
    }

    return null;
  }

  // =====================================================
  // HELPER: Calculate roll diameter
  // =====================================================
  private calculateRollDiameter(
    thicknessIn: number,
    lengthFt: number,
    coreDiameterIn = 4,
  ): number {
    const lengthIn = lengthFt * 12;
    return Math.sqrt(
      Math.pow(coreDiameterIn, 2) + (4 * thicknessIn * lengthIn) / Math.PI,
    );
  }

  private getProductType(item: ShopifyItem): "ROLL" | "MAT" | "TILE" {
    const hasWidthFt = Number(item.properties?.["Width (ft)"]) > 0;
    const hasLengthFt = Number(item.properties?.["Length (ft)"]) > 0;

    if (hasWidthFt && hasLengthFt) {
      return "ROLL";
    }

    if (item.name?.toLowerCase().includes("mat")) {
      return "MAT";
    }

    return "TILE";
  }

  // =====================================================
  // PROCESS SHOPIFY ITEMS (PUBLIC - for pre-processing)
  // =====================================================
  // public processShopifyItemsPublic(items: ShopifyItem[]): ProcessedItem[] {
  //   const processed: ProcessedItem[] = [];

  //   for (const item of items) {
  //     // Calculate per-item weight correctly
  //     const isEmptyProperties =
  //       !item.properties || Object.keys(item.properties).length === 0;

  //     let isRoll = false;
  //     const isMat = item.name?.toLowerCase().includes("mat");

  //     const type = isRoll ? "ROLL" : isMat ? "MAT" : "TILE";

  //     let perItemWeight = 0;
  //     let quantity = 0;
  //     let totalWeight = 0;
  //     if (!isEmptyProperties && item.properties?.Weight) {
  //       // For items with properties (ROLLS/MATS)
  //       const width = parseFloat(item.properties?.["Width (ft)"] || 0);
  //       const length = parseFloat(item.properties?.["Length (ft)"] || 0);
  //       const areaSqFT = Number(width * length);
  //       const grams = Number(item.grams) || 0;
  //       const perSqFTWeight = Number((grams / 453.592).toFixed(2));
  //       perItemWeight = perSqFTWeight * areaSqFT;
  //       quantity = item.properties?.Quantity;
  //       totalWeight = Number(item.properties.Weight);
  //       isRoll = true;
  //     } else {
  //       // For items without properties (TILES/ACCESSORIES)
  //       const grams = Number(item.grams) || 0;
  //       perItemWeight = Number((grams / 453.592).toFixed(2));
  //       quantity = item.quantity;
  //       totalWeight = perItemWeight * quantity;
  //     }

  //     // const perItemWeight = item.properties?.Weight
  //     //   ? Number(item.properties.Weight)
  //     //   : Number((item.grams / 453.592).toFixed(2));

  //     // const quantity = item.properties?.Quantity || item.quantity || 1;

  //     const thickness = this.extractThickness(item.name);

  //     let length = 48,
  //       width = 48,
  //       height = 8;

  //     if (type === "ROLL") {
  //       const rollWidthFt = Number(item.properties?.["Width (ft)"] || 4);
  //       const rollLengthFt = Number(item.properties?.["Length (ft)"] || 10);
  //       const rollDiameter = Math.ceil(
  //         this.calculateRollDiameter(thickness, rollLengthFt),
  //       );
  //       length = rollWidthFt * 12;
  //       width = rollDiameter;
  //       height = rollDiameter;
  //     } else if (type === "MAT") {
  //       const dims = this.extractDimensions(item.name);
  //       if (dims) {
  //         length = (dims.length * 12) / 2;
  //         width = dims.width * 12;
  //         height = 6;
  //       } else {
  //         length = 36;
  //         width = 48;
  //         height = 6;
  //       }
  //     } else {
  //       const dims = this.extractDimensions(item.name);
  //       if (dims) {
  //         length = dims.length * 12;
  //         width = dims.width * 12;
  //         height = thickness;
  //       } else {
  //         length = 24;
  //         width = 24;
  //         height = thickness;
  //       }
  //     }

  //     processed.push({
  //       weight: perItemWeight,
  //       // totalWeight: perItemWeight * quantity,
  //       totalWeight,
  //       length,
  //       width,
  //       height,
  //       quantity,
  //       name: item.name,
  //       type,
  //     });
  //   }

  //   return processed;
  // }
  public processShopifyItemsPublic(items: ShopifyItem[]): ProcessedItem[] {
    const processedItems: ProcessedItem[] = [];

    for (const item of items) {
      const type = this.getProductType(item);

      // Calculate per-item weight correctly
      const isEmptyProperties =
        !item.properties || Object.keys(item.properties).length === 0;

      let perItemWeight = 0;
      let quantity = 0;
      let totalWeight = 0;
      if (!isEmptyProperties && item.properties?.Weight) {
        // For items with properties (ROLLS/MATS)
        const width = parseFloat(item.properties?.["Width (ft)"] || 0);
        const length = parseFloat(item.properties?.["Length (ft)"] || 0);
        const areaSqFT = Number(width * length);
        const grams = Number(item.grams) || 0;
        const perSqFTWeight = Number((grams / 453.592).toFixed(2));
        perItemWeight = perSqFTWeight * areaSqFT;
        quantity = item.properties?.Quantity;
        totalWeight = Number(item.properties.Weight);
      } else {
        // For items without properties (TILES/ACCESSORIES)
        const grams = Number(item.grams) || 0;
        perItemWeight = Number((grams / 453.592).toFixed(2));
        quantity = item.quantity;
        totalWeight = perItemWeight * quantity;
      }

      processedItems.push({
        weight: perItemWeight,
        totalWeight: perItemWeight * quantity,
        quantity,
        name: item.name,
        type,
      });

      console.log(
        `   Weight: ${perItemWeight} lbs × ${quantity} = ${
          perItemWeight * quantity
        } lbs`,
      );
    }

    return processedItems;
  }

  // =====================================================
  // CONSOLIDATE PACKAGES (PUBLIC - for pre-processing)
  // =====================================================
  public consolidatePackagesPublic(
    items: ProcessedItem[],
  ): ConsolidatedPackage[] {
    const consolidator = new FastPackageConsolidator();
    return consolidator.consolidate(items);
  }

  // =====================================================
  // GET SINGLE SERVICE RATE (Optimized)
  // =====================================================
  private async getSingleServiceRate(
    destination: any,
    packages: ConsolidatedPackage[],
    accessToken: string,
    shipperAddress: any,
    serviceType: string,
  ): Promise<{ service: string; rate: number; transitDays: number } | null> {
    try {
      const fedexRequest = {
        accountNumber: { value: this.accountNumber },
        rateRequestControlParameters: {
          returnTransitTimes: true,
        },
        requestedShipment: {
          shipDateStamp: new Date().toISOString().split("T")[0],
          // pickupType: "USE_SCHEDULED_PICKUP",
          pickupType: "DROPOFF_AT_FEDEX_LOCATION",
          serviceType: serviceType,
          packagingType: "YOUR_PACKAGING",
          preferredCurrency: "USD",
          // rateRequestType: ["LIST", "ACCOUNT"],
          rateRequestType: ["ACCOUNT"],
          shipper: {
            address: shipperAddress,
          },
          recipient: {
            address: {
              streetLines: [destination.address1],
              city: destination.city,
              stateOrProvinceCode: destination.province,
              postalCode: destination.postal_code,
              countryCode: destination.country,
              residential: true,
            },
          },
          requestedPackageLineItems: packages.map((pkg, i) => ({
            sequenceNumber: i + 1,
            groupPackageCount: 1,
            weight: {
              units: "LB",
              value: Number(pkg.weight.toFixed(1)),
            },
            dimensions: {
              length: 24,
              width: 24,
              height: 24,
              units: "IN",
            },
          })),
        },
      };

      console.log("\n🟢 Fedex Request:", JSON.stringify(fedexRequest, null, 2));

      const response = await axios.post(
        `${this.apiUrl}/rate/v1/rates/quotes`,
        fedexRequest,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "X-locale": "en_US",
          },
          timeout: FEDEX_API_TIMEOUT,
        },
      );

      const reply = response.data.output.rateReplyDetails[0];
      const shipment = reply.ratedShipmentDetails[0];
      const transitDays = this.extractTransitDays(reply);

      console.log(
        "relplay==========================================>",
        shipment,
      );
      return {
        service: serviceType,
        rate: shipment.totalNetFedExCharge,
        transitDays,
      };
    } catch (error: any) {
      console.warn(`⚠️ ${serviceType} not available`);
      return null;
    }
  }

  // =====================================================
  // EXTRACT TRANSIT DAYS
  // =====================================================
  private extractTransitDays(reply: any): number {
    const enumVal = reply.operationalDetail?.transitTime;
    if (enumVal) {
      const match = enumVal.match(/\d+/);
      if (match) return Number(match[0]);

      const MAP: Record<string, number> = {
        ONE_DAY: 1,
        TWO_DAYS: 2,
        THREE_DAYS: 3,
        FOUR_DAYS: 4,
        FIVE_DAYS: 5,
        SIX_DAYS: 6,
        SEVEN_DAYS: 7,
      };
      if (MAP[enumVal]) return MAP[enumVal];
    }

    const desc = reply.commit?.transitDays?.description;
    if (desc) {
      const match = desc.match(/\d+/);
      if (match) return Number(match[0]);
    }

    return 5;
  }

  // =====================================================
  // MAIN RATE FUNCTION - ORIGINAL (KEPT FOR COMPATIBILITY)
  // =====================================================

  async getSplitShipmentRate(request: any): Promise<any> {
    console.log("🟢 FedEx: Processing rate request for CHEAPEST option...");
    const startTime = Date.now();
    try {
    } catch (error: any) {}
  }

  // =====================================================
  // GET RATE FOR ORIGIN (Optimized for speed)
  // =====================================================
  async getRateForOrigin(
    destination: any,
    packages: ConsolidatedPackage[],
    shipperAddress: any,
  ): Promise<FedExRateResponse> {
    const startTime = Date.now();

    try {
      if (packages.length === 0) {
        throw new Error("No packages to ship");
      }

      const accessToken = await getFEDEXToken();

      // Try both services in parallel for speed
      const services = [
        // "FEDEX_GROUND",
        "GROUND_HOME_DELIVERY",
        // "FEDEX_EXPRESS_SAVER",
        // "FEDEX_2_DAY",
        // "FEDEX_2_DAY_AM",
        // "STANDARD_OVERNIGHT",
        // "PRIORITY_OVERNIGHT",
        // "FIRST_OVERNIGHT",
      ];

      const ratePromises = services.map((service) =>
        this.getSingleServiceRate(
          destination,
          packages,
          accessToken,
          shipperAddress,
          service,
        ),
      );

      const results = await Promise.all(ratePromises);
      const validRates = results.filter(Boolean) as {
        service: string;
        rate: number;
        transitDays: number;
      }[];

      if (validRates.length === 0) {
        throw new Error("No rates available");
      }

      // Sort by price
      validRates.sort((a, b) => a.rate - b.rate);
      const cheapest = validRates[0];

      // Add 6% surcharge
      // const finalRate = +(cheapest.rate * 1.06).toFixed(2);
      const finalRate = +(cheapest.rate * 1.25).toFixed(2);
      // const finalRate = Number(cheapest.rate.toFixed(2));

      const elapsed = Date.now() - startTime;
      console.log(
        `✅ FedEx: $${finalRate} (${cheapest.service}) - ${elapsed}ms`,
      );

      return {
        quoteId: `FEDEX-${Date.now()}`,
        rate: finalRate,
        currency: "USD",
        transitDays: cheapest.transitDays,
        serviceLevel: cheapest.service,
        packages: packages.length,
      };
    } catch (error: any) {
      console.error(`🔴 FedEx Error: ${error.message}`);
      throw error;
    }
  }
}

export default FedExClient;
