// import axios from "axios";

// // =====================================================
// // INTERFACES
// // =====================================================

// interface ShopifyItem {
//   name: string;
//   sku: string;
//   quantity: number;
//   grams: number;
//   price: number;
//   properties: any;
//   product_id: number;
//   variant_id: number;
// }

// // interface FedExRateRequest {
// //   origin: {
// //     country: string;
// //     postal_code: string;
// //     province: string;
// //     city: string;
// //     address1: string;
// //     phone: string;
// //     company_name?: string;
// //   };
// //   destination: {
// //     country: string;
// //     postal_code: string;
// //     province: string;
// //     city: string;
// //     address1: string;
// //     phone?: string;
// //     company_name?: string;
// //   };
// //   items: ShopifyItem[];
// //   currency: string;
// //   totalWeight: number;
// // }
// interface FedExRateRequest {
//   origin?: {
//     country: string;
//     postal_code: string;
//     province: string;
//     city: string;
//     address1: string;
//     address2?: string;
//     phone: string;
//     company_name?: string;
//   };
//   // Add support for multiple warehouse origins
//   origins?: Array<{
//     warehouseKey: string;
//     address: {
//       address1: string;
//       address2?: string;
//       city: string;
//       province: string;
//       postal_code: string;
//       country: string;
//       company?: string;
//       phone?: string;
//     };
//     totalWeight: number;
//     items: ShopifyItem[];
//   }>;
//   destination: {
//     country: string;
//     postal_code: string;
//     province: string;
//     city: string;
//     address1: string;
//     phone?: string;
//     company_name?: string;
//   };
//   items: ShopifyItem[];
//   currency: string;
//   totalWeight: number;
// }

// interface FedExRateResponse {
//   quoteId: string;
//   rate: number;
//   transitDays: number;
//   serviceLevel: string;
//   currency: string;
//   packages: number;
// }

// interface ProcessedItem {
//   weight: number;
//   totalWeight: number;
//   length: number;
//   width: number;
//   height: number;
//   quantity: number;
//   name: string;
//   type: "ROLL" | "MAT" | "TILE";
// }

// interface ConsolidatedPackage {
//   weight: number;
//   items: ProcessedItem[];
//   dimensions: {
//     length: number;
//     width: number;
//     height: number;
//   };
// }

// // =====================================================
// // PACKAGE OPTIMIZATION CLASSES
// // =====================================================

// class HeavyItemSplitter {
//   static preprocessItems(items: ProcessedItem[]): ProcessedItem[] {
//     const result: ProcessedItem[] = [];

//     for (const item of items) {
//       if (item.totalWeight > 68 && item.quantity > 1) {
//         for (let i = 0; i < item.quantity; i++) {
//           result.push({ ...item, quantity: 1, totalWeight: item.weight });
//         }
//         console.log(
//           `   ⚡ Split heavy item: ${item.name} (${item.totalWeight} lbs) into ${item.quantity} units`,
//         );
//       } else {
//         result.push(item);
//       }
//     }

//     return result;
//   }
// }

// class LTLDetector {
//   static shouldUseLTL(packages: ConsolidatedPackage[]): boolean {
//     const totalWeight = packages.reduce((sum, pkg) => sum + pkg.weight, 0);
//     const totalPackages = packages.length;

//     return (
//       totalWeight > 500 ||
//       totalPackages > 10 ||
//       packages.some((pkg) => pkg.weight > 150)
//     );
//   }

//   static logLTLRecommendation(packages: ConsolidatedPackage[]): void {
//     const totalWeight = packages.reduce((sum, pkg) => sum + pkg.weight, 0);

//     console.log("\n⚠️  LTL FREIGHT RECOMMENDED:");
//     console.log(`   • Total weight: ${totalWeight.toFixed(2)} lbs`);
//     console.log(`   • Packages: ${packages.length}`);
//     console.log(`   • Consider using FedEx Freight or freight forwarder`);
//     console.log(`   • Potential savings: 30-50% vs parcel shipping\n`);
//   }
// }

// class OptimizedPackageConsolidator {
//   private readonly OPTIMAL_WEIGHTS = [10, 20, 50, 70];

//   private calculateDimWeight(
//     length: number,
//     width: number,
//     height: number,
//   ): number {
//     return (length * width * height) / 139;
//   }

//   private getBillableWeight(pkg: ConsolidatedPackage): number {
//     const dimWeight = this.calculateDimWeight(
//       pkg.dimensions.length,
//       pkg.dimensions.width,
//       pkg.dimensions.height,
//     );
//     return Math.max(pkg.weight, dimWeight);
//   }

//   private estimatePackageCost(pkg: ConsolidatedPackage): number {
//     const billableWeight = this.getBillableWeight(pkg);

//     let baseRate = 15;
//     let perLbRate = 0.5;

//     if (billableWeight <= 10) {
//       baseRate = 12;
//       perLbRate = 0.45;
//     } else if (billableWeight <= 20) {
//       baseRate = 15;
//       perLbRate = 0.42;
//     } else if (billableWeight <= 50) {
//       baseRate = 18;
//       perLbRate = 0.38;
//     } else if (billableWeight <= 70) {
//       baseRate = 22;
//       perLbRate = 0.35;
//     } else {
//       baseRate = 25;
//       perLbRate = 0.32;
//     }

//     return baseRate + billableWeight * perLbRate;
//   }

//   protected calculateTotalCost(packages: ConsolidatedPackage[]): number {
//     return packages.reduce(
//       (sum, pkg) => sum + this.estimatePackageCost(pkg),
//       0,
//     );
//   }

//   public consolidatePackages(items: ProcessedItem[]): ConsolidatedPackage[] {
//     console.log("\n🔵 Starting package optimization...");

//     const expandedItems: ProcessedItem[] = [];
//     for (const item of items) {
//       for (let i = 0; i < item.quantity; i++) {
//         expandedItems.push({ ...item, quantity: 1 });
//       }
//     }

//     const strategies = [
//       this.strategyMaxWeight(expandedItems),
//       this.strategyOptimalTiers(expandedItems),
//       this.strategyMinimizePackages(expandedItems),
//       this.strategyBalanced(expandedItems),
//     ];

//     let bestStrategy = strategies[0];
//     let lowestCost = this.calculateTotalCost(strategies[0]);

//     console.log("\n📊 Evaluating packing strategies:");

//     const strategyNames = [
//       "Max Weight (150 lbs)",
//       // "Optimal Tiers",
//       // "Minimize Packages",
//       // "Balanced Distribution",
//     ];

//     strategies.forEach((strategy, index) => {
//       const cost = this.calculateTotalCost(strategy);
//       const totalWeight = strategy.reduce((sum, pkg) => sum + pkg.weight, 0);
//       const avgWeight = totalWeight / strategy.length;

//       console.log(`\n   ${strategyNames[index]}:`);
//       console.log(`   • Packages: ${strategy.length}`);
//       console.log(`   • Avg weight: ${avgWeight.toFixed(1)} lbs`);
//       console.log(`   • Estimated cost: $${cost.toFixed(2)}`);

//       if (cost < lowestCost) {
//         lowestCost = cost;
//         bestStrategy = strategy;
//         console.log(`   ✅ NEW BEST!`);
//       }
//     });

//     console.log(
//       `\n✅ Selected best strategy: Estimated savings of $${(
//         this.calculateTotalCost(strategies[0]) - lowestCost
//       ).toFixed(2)}\n`,
//     );

//     return bestStrategy;
//   }

//   private strategyMaxWeight(items: ProcessedItem[]): ConsolidatedPackage[] {
//     const packages: ConsolidatedPackage[] = [];
//     const sortedItems = [...items].sort((a, b) => b.weight - a.weight);

//     for (const item of sortedItems) {
//       let placed = false;

//       for (const pkg of packages) {
//         if (pkg.weight + item.weight <= 150) {
//           this.addItemToPackage(pkg, item);
//           placed = true;
//           break;
//         }
//       }

//       if (!placed) {
//         packages.push(this.createPackage(item));
//       }
//     }

//     return packages;
//   }

//   private strategyOptimalTiers(items: ProcessedItem[]): ConsolidatedPackage[] {
//     const packages: ConsolidatedPackage[] = [];
//     const sortedItems = [...items].sort((a, b) => b.weight - a.weight);

//     for (const item of sortedItems) {
//       let placed = false;
//       let bestFit: { pkg: ConsolidatedPackage; score: number } | null = null;

//       for (const pkg of packages) {
//         const newWeight = pkg.weight + item.weight;

//         if (newWeight <= 150) {
//           let score = 0;
//           for (const optimal of this.OPTIMAL_WEIGHTS) {
//             const distance = Math.abs(newWeight - optimal);
//             if (distance < 5) {
//               score = 100 - distance;
//               break;
//             }
//           }

//           if (score > 0 || !bestFit) {
//             if (!bestFit || score > bestFit.score) {
//               bestFit = { pkg, score };
//             }
//           }
//         }
//       }

//       if (bestFit) {
//         this.addItemToPackage(bestFit.pkg, item);
//         placed = true;
//       }

//       if (!placed) {
//         packages.push(this.createPackage(item));
//       }
//     }

//     return packages;
//   }

//   private strategyMinimizePackages(
//     items: ProcessedItem[],
//   ): ConsolidatedPackage[] {
//     const packages: ConsolidatedPackage[] = [];
//     const sortedItems = [...items].sort((a, b) => b.weight - a.weight);

//     for (const item of sortedItems) {
//       let bestPkg: ConsolidatedPackage | null = null;
//       let maxAvailable = 0;

//       for (const pkg of packages) {
//         const available = 150 - pkg.weight;
//         if (available >= item.weight && available > maxAvailable) {
//           maxAvailable = available;
//           bestPkg = pkg;
//         }
//       }

//       if (bestPkg) {
//         this.addItemToPackage(bestPkg, item);
//       } else {
//         packages.push(this.createPackage(item));
//       }
//     }

//     return packages;
//   }

//   private strategyBalanced(items: ProcessedItem[]): ConsolidatedPackage[] {
//     const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
//     const targetPackages = Math.ceil(totalWeight / 70);
//     const targetWeight = totalWeight / targetPackages;

//     const packages: ConsolidatedPackage[] = [];
//     const sortedItems = [...items].sort((a, b) => b.weight - a.weight);

//     for (const item of sortedItems) {
//       let placed = false;
//       let bestPkg: ConsolidatedPackage | null = null;
//       let minDeviation = Infinity;

//       for (const pkg of packages) {
//         const newWeight = pkg.weight + item.weight;
//         if (newWeight <= 150) {
//           const deviation = Math.abs(newWeight - targetWeight);
//           if (deviation < minDeviation) {
//             minDeviation = deviation;
//             bestPkg = pkg;
//           }
//         }
//       }

//       if (bestPkg && bestPkg.weight + item.weight <= targetWeight * 1.3) {
//         this.addItemToPackage(bestPkg, item);
//         placed = true;
//       }

//       if (!placed) {
//         packages.push(this.createPackage(item));
//       }
//     }

//     return packages;
//   }

//   private createPackage(item: ProcessedItem): ConsolidatedPackage {
//     return {
//       weight: item.weight,
//       items: [item],
//       dimensions: {
//         length: item.length,
//         width: item.width,
//         height: item.height,
//       },
//     };
//   }

//   private addItemToPackage(
//     pkg: ConsolidatedPackage,
//     item: ProcessedItem,
//   ): void {
//     pkg.weight += item.weight;
//     pkg.items.push(item);
//     pkg.dimensions.length = Math.max(pkg.dimensions.length, item.length);
//     pkg.dimensions.width = Math.max(pkg.dimensions.width, item.width);
//     pkg.dimensions.height = Math.max(pkg.dimensions.height, item.height);
//   }
// }

// class OptimizedPackageConsolidatorV2 extends OptimizedPackageConsolidator {
//   public consolidatePackagesAdvanced(items: ProcessedItem[]): {
//     packages: ConsolidatedPackage[];
//     recommendation: "PARCEL" | "LTL";
//     estimatedSavings: number;
//   } {
//     console.log("\n🔵 Starting advanced package optimization...");

//     const preprocessed = HeavyItemSplitter.preprocessItems(items);
//     const packages = super.consolidatePackages(preprocessed);

//     const shouldUseLTL = LTLDetector.shouldUseLTL(packages);

//     if (shouldUseLTL) {
//       LTLDetector.logLTLRecommendation(packages);

//       const parcelCost = this.calculateTotalCost(packages);
//       const estimatedLTLCost = this.estimateLTLCost(packages);
//       const savings = parcelCost - estimatedLTLCost;

//       return {
//         packages,
//         recommendation: savings > 50 ? "LTL" : "PARCEL",
//         estimatedSavings: Math.max(0, savings),
//       };
//     }

//     return {
//       packages,
//       recommendation: "PARCEL",
//       estimatedSavings: 0,
//     };
//   }

//   private estimateLTLCost(packages: ConsolidatedPackage[]): number {
//     const totalWeight = packages.reduce((sum, pkg) => sum + pkg.weight, 0);

//     const baseRate = 150;
//     let perCwtRate = 30;

//     if (totalWeight > 1000) perCwtRate = 25;
//     if (totalWeight > 2000) perCwtRate = 20;
//     if (totalWeight > 5000) perCwtRate = 15;

//     const cwt = totalWeight / 100;
//     return baseRate + cwt * perCwtRate;
//   }
// }

// // =====================================================
// // MAIN FEDEX CLIENT
// // =====================================================

// export class FedExClient {
//   private apiUrl = process.env.FEDEX_API_URL_SMALL;
//   private clientId = process.env.FEDEX_CLIENT_ID_SMALL;
//   private clientSecret = process.env.FEDEX_CLIENT_SECRET_SMALL;
//   private accountNumber = process.env.FEDEX_ACCOUNT_SMALL || "";

//   private accessToken: string | null = null;
//   private tokenExpiry = 0;

//   // =====================================================
//   // OAUTH TOKEN
//   // =====================================================

//   private async getAccessToken(): Promise<any> {
//     if (this.accessToken && Date.now() < this.tokenExpiry) {
//       return this.accessToken;
//     }

//     if (!this.clientId || !this.clientSecret) {
//       throw new Error("FedEx credentials missing (CLIENT_ID / CLIENT_SECRET)");
//     }

//     console.log("🟢 Requesting FedEx OAuth token...");

//     const response = await axios.post(
//       `${this.apiUrl}/oauth/token`,
//       new URLSearchParams({
//         grant_type: "client_credentials",
//         client_id: this.clientId,
//         client_secret: this.clientSecret,
//       }),
//       {
//         headers: {
//           "Content-Type": "application/x-www-form-urlencoded",
//         },
//       },
//     );

//     this.accessToken = response.data.access_token;
//     this.tokenExpiry = Date.now() + 55 * 60 * 1000;

//     console.log("🟢 FedEx OAuth token obtained");
//     return this.accessToken;
//   }

//   // =====================================================
//   // HELPER: Extract thickness from product name
//   // =====================================================

//   private extractThickness(name: string): number {
//     if (!name) return 0.25;

//     const fractionMatch = name.match(/\b(\d+)\s*\/\s*(\d+)(?=")?/);
//     if (fractionMatch) {
//       const num = Number(fractionMatch[1]);
//       const den = Number(fractionMatch[2]);
//       return num / den;
//     }

//     const mmMatch = name.match(/\b(\d+(?:\.\d+)?)\s*mm\b/i);
//     if (mmMatch) {
//       const mm = Number(mmMatch[1]);
//       return mm / 25.4;
//     }

//     return 0.25;
//   }

//   // =====================================================
//   // HELPER: Extract dimensions from name
//   // =====================================================

//   private extractDimensionsFromName(
//     name: string,
//   ): { width: number; length: number } | null {
//     const feetMatch = name.match(/(\d+)'\s*x\s*(\d+)'/i);
//     if (feetMatch) {
//       return { width: Number(feetMatch[1]), length: Number(feetMatch[2]) };
//     }

//     const inchMatch = name.match(/(\d+)"\s*x\s*(\d+)"/i);
//     if (inchMatch) {
//       return {
//         width: Number(inchMatch[1]) / 12,
//         length: Number(inchMatch[2]) / 12,
//       };
//     }

//     const plainMatch = name.match(/(\d+)\s*x\s*(\d+)/i);
//     if (plainMatch) {
//       const val1 = Number(plainMatch[1]);
//       const val2 = Number(plainMatch[2]);

//       if (val1 < 10 && val2 < 10) {
//         return { width: val1, length: val2 };
//       } else {
//         return {
//           width: val1 / 12,
//           length: val2 / 12,
//         };
//       }
//     }

//     return null;
//   }

//   // =====================================================
//   // HELPER: Calculate roll diameter
//   // =====================================================

//   private calculateRollDiameter(
//     thicknessIn: number,
//     lengthFt: number,
//     coreDiameterIn = 4,
//   ): number {
//     const lengthIn = lengthFt * 12;
//     return Math.sqrt(
//       Math.pow(coreDiameterIn, 2) + (4 * thicknessIn * lengthIn) / Math.PI,
//     );
//   }

//   // =====================================================
//   // HELPER: Determine product type
//   // =====================================================

//   private getProductType(item: ShopifyItem): "ROLL" | "MAT" | "TILE" {
//     const hasWidthFt = Number(item.properties?.["Width (ft)"]) > 0;
//     const hasLengthFt = Number(item.properties?.["Length (ft)"]) > 0;

//     if (hasWidthFt && hasLengthFt) {
//       return "ROLL";
//     }

//     if (item.name?.toLowerCase().includes("mat")) {
//       return "MAT";
//     }

//     return "TILE";
//   }

//   // =====================================================
//   // PROCESS SHOPIFY ITEMS
//   // =====================================================

//   protected processShopifyItems(items: ShopifyItem[]): ProcessedItem[] {
//     const processedItems: ProcessedItem[] = [];

//     for (const item of items) {
//       const type = this.getProductType(item);

//       let perItemWeight = 0;

//       if (item.properties?.Weight) {
//         perItemWeight = Number(item.properties.Weight);
//       } else {
//         perItemWeight = Number((item.grams / 453.592).toFixed(2));
//       }

//       const isEmptyProperties =
//         !item.properties ||
//         (typeof item.properties === "object" &&
//           Object.keys(item.properties).length === 0);

//       const quantity = isEmptyProperties
//         ? item.quantity
//         : Number(item.properties.Quantity || item.quantity);

//       let length = 48;
//       let width = 48;
//       let height = 8;

//       const thickness = this.extractThickness(item.name);

//       if (type === "ROLL") {
//         const rollWidthFt = Number(item.properties?.["Width (ft)"] || 4);
//         const rollLengthFt = Number(item.properties?.["Length (ft)"] || 10);

//         const rollDiameter = Math.ceil(
//           this.calculateRollDiameter(thickness, rollLengthFt),
//         );

//         length = rollWidthFt * 12;
//         width = rollDiameter;
//         height = rollDiameter;

//         console.log(`🟢 ROLL: ${item.name}`);
//         console.log(`   Thickness: ${thickness}"`);
//         console.log(`   Roll: ${rollWidthFt}' wide × ${rollLengthFt}' long`);
//         console.log(`   Calculated diameter: ${rollDiameter}"`);
//         console.log(
//           `   Package dimensions: ${length}" × ${width}" × ${height}"`,
//         );
//       } else if (type === "MAT") {
//         const dims = this.extractDimensionsFromName(item.name);

//         if (dims) {
//           length = (dims.length * 12) / 2;
//           width = dims.width * 12;
//           height = 6;
//         } else {
//           length = (6 * 12) / 2;
//           width = 4 * 12;
//           height = 6;
//         }

//         console.log(`🟢 MAT: ${item.name}`);
//         console.log(`   Thickness: ${thickness}"`);
//         console.log(
//           `   Original size: ${dims?.width || 4}' × ${dims?.length || 6}'`,
//         );
//         console.log(
//           `   Folded dimensions: ${length}" × ${width}" × ${height}"`,
//         );
//       } else {
//         const dims = this.extractDimensionsFromName(item.name);

//         if (dims) {
//           length = dims.length * 12;
//           width = dims.width * 12;
//           height = thickness;
//         } else {
//           length = 24;
//           width = 24;
//           height = thickness;
//         }

//         console.log(`🟢 TILE: ${item.name}`);
//         console.log(`   Thickness: ${thickness}"`);
//         console.log(
//           `   Tile size: ${dims?.width || 2}' × ${dims?.length || 2}'`,
//         );
//         console.log(
//           `   Package dimensions: ${length}" × ${width}" × ${height}"`,
//         );
//       }

//       processedItems.push({
//         weight: perItemWeight,
//         totalWeight: perItemWeight * quantity,
//         length,
//         width,
//         height,
//         quantity,
//         name: item.name,
//         type,
//       });

//       console.log(
//         `   Weight: ${perItemWeight} lbs × ${quantity} = ${
//           perItemWeight * quantity
//         } lbs`,
//       );
//     }

//     return processedItems;
//   }

//   // =====================================================
//   // SMART PACKAGE CONSOLIDATION (UPDATED)
//   // =====================================================

//   protected consolidatePackages(items: ProcessedItem[]): ConsolidatedPackage[] {
//     const optimizer = new OptimizedPackageConsolidatorV2();
//     const result = optimizer.consolidatePackagesAdvanced(items);

//     if (result.recommendation === "LTL") {
//       console.log(
//         `💰 Potential savings with LTL: $${result.estimatedSavings.toFixed(2)}`,
//       );
//     }

//     return result.packages;
//   }

//   // =====================================================
//   // GET ALL SERVICE RATES AND RETURN CHEAPEST
//   // =====================================================

//   // private async getAllServiceRates(
//   //   request: FedExRateRequest,
//   //   packages: ConsolidatedPackage[],
//   //   accessToken: string,
//   // ): Promise<{ service: string; rate: number; transitDays: number }[]> {
//   //   const services = [
//   //     "FEDEX_GROUND",
//   //     "GROUND_HOME_DELIVERY",
//   //     "FEDEX_EXPRESS_SAVER",
//   //     "FEDEX_2_DAY",
//   //     "FEDEX_2_DAY_AM",
//   //     "STANDARD_OVERNIGHT",
//   //     "PRIORITY_OVERNIGHT",
//   //     "FIRST_OVERNIGHT",
//   //   ];

//   //   const rates: { service: string; rate: number; transitDays: number }[] = [];

//   //   for (const serviceType of services) {
//   //     try {
//   //       // const fedexRequest = {
//   //       //   accountNumber: { value: this.accountNumber },
//   //       //   rateRequestControlParameters: {
//   //       //     returnTransitTimes: true,
//   //       //   },
//   //       //   requestedShipment: {
//   //       //     shipDateStamp: new Date().toISOString().split("T")[0],
//   //       //     pickupType: "DROPOFF_AT_FEDEX_LOCATION",
//   //       //     serviceType: serviceType,
//   //       //     packagingType: "YOUR_PACKAGING",
//   //       //     preferredCurrency: "USD",
//   //       //     rateRequestType: ["ACCOUNT"],
//   //       //     // shipper: {
//   //       //     //   address: {
//   //       //     //     streetLines: [request.origin.address1],
//   //       //     //     city: request.origin.city,
//   //       //     //     stateOrProvinceCode: request.origin.province,
//   //       //     //     postalCode: request.origin.postal_code,
//   //       //     //     countryCode: request.origin.country,
//   //       //     //   },
//   //       //     // },
//   //       //     shipper: {
//   //       //       address: {
//   //       //         streetLines: ["312 East 52 Bypass"],
//   //       //         city: "Pilot Mountain",
//   //       //         stateOrProvinceCode: "North Carolina",
//   //       //         postalCode: "27041",
//   //       //         countryCode: "US",
//   //       //       },
//   //       //     },
//   //       //     recipient: {
//   //       //       address: {
//   //       //         streetLines: [request.destination.address1],
//   //       //         city: request.destination.city,
//   //       //         stateOrProvinceCode: request.destination.province,
//   //       //         postalCode: request.destination.postal_code,
//   //       //         countryCode: request.destination.country,
//   //       //       },
//   //       //     },
//   //       //     requestedPackageLineItems: packages.map((pkg, i) => ({
//   //       //       sequenceNumber: i + 1,
//   //       //       groupPackageCount: 1,
//   //       //       weight: {
//   //       //         units: "LB",
//   //       //         value: Number(pkg.weight.toFixed(1)),
//   //       //       },
//   //       //       dimensions: {
//   //       //         length: Math.ceil(pkg.dimensions.length),
//   //       //         width: Math.ceil(pkg.dimensions.width),
//   //       //         height: Math.ceil(pkg.dimensions.height),
//   //       //         units: "IN",
//   //       //       },
//   //       //     })),
//   //       //   },
//   //       // };
//   //       const fedexRequest = {
//   //         accountNumber: { value: this.accountNumber },
//   //         rateRequestControlParameters: {
//   //           returnTransitTimes: true,
//   //         },
//   //         requestedShipment: {
//   //           shipDateStamp: new Date().toISOString().split("T")[0],
//   //           pickupType: "DROPOFF_AT_FEDEX_LOCATION",
//   //           serviceType: serviceType,
//   //           // serviceType: "STANDARD_OVERNIGHT",
//   //           packagingType: "YOUR_PACKAGING",
//   //           preferredCurrency: "USD",
//   //           // rateRequestType: ["ACCOUNT"],
//   //           rateRequestType: ["LIST", "ACCOUNT"],
//   //           shipper: {
//   //             address: {
//   //               streetLines: ["312 East 52 Bypass"],
//   //               city: "Pilot Mountain",
//   //               stateOrProvinceCode: "NC",
//   //               postalCode: "27041",
//   //               countryCode: "US",
//   //               residential: false,
//   //             },
//   //           },

//   //           recipient: {
//   //             address: {
//   //               streetLines: [request.destination.address1],
//   //               city: request.destination.city,
//   //               stateOrProvinceCode: request.destination.province,
//   //               postalCode: request.destination.postal_code,
//   //               countryCode: request.destination.country,
//   //               residential: false,
//   //             },
//   //           },
//   //           requestedPackageLineItems: packages.map((pkg, i) => ({
//   //             sequenceNumber: i + 1,
//   //             // sequenceNumber: 1,
//   //             groupPackageCount: 1,
//   //             weight: {
//   //               units: "LB",
//   //               // value: Math.ceil(pkg.weight),
//   //               value: Number(pkg.weight.toFixed(1)),
//   //             },
//   //             // dimensions: {
//   //             //   length: Math.ceil(pkg.dimensions.length),
//   //             //   width: Math.ceil(pkg.dimensions.width),
//   //             //   height: Math.ceil(pkg.dimensions.height),
//   //             //   // height: 3,
//   //             //   units: "IN",
//   //             // },
//   //           })),
//   //         },
//   //       };

//   //       const response = await axios.post(
//   //         `${this.apiUrl}/rate/v1/rates/quotes`,
//   //         fedexRequest,
//   //         {
//   //           headers: {
//   //             Authorization: `Bearer ${accessToken}`,
//   //             "Content-Type": "application/json",
//   //             "X-locale": "en_US",
//   //           },
//   //           timeout: 15000,
//   //         },
//   //       );

//   //       const reply = response.data.output.rateReplyDetails[0];
//   //       const shipment = reply.ratedShipmentDetails[0];
//   //       const transitDays = this.getFedExTransitDays(reply);

//   //       rates.push({
//   //         service: serviceType,
//   //         rate: shipment.totalNetFedExCharge,
//   //         transitDays,
//   //       });

//   //       console.log(
//   //         `   ${serviceType}: $${shipment.totalNetFedExCharge} (${transitDays} days)`,
//   //       );
//   //     } catch (error: any) {
//   //       console.log(`   ${serviceType}: Not available`);
//   //     }
//   //   }

//   //   return rates;
//   // }
//   private async getAllServiceRates(
//     request: FedExRateRequest,
//     packages: ConsolidatedPackage[],
//     accessToken: string,
//     shipperAddress?: any, // Add optional shipper address parameter
//   ): Promise<{ service: string; rate: number; transitDays: number }[]> {
//     const services = [
//       "FEDEX_GROUND",
//       "GROUND_HOME_DELIVERY",
//       // "FEDEX_EXPRESS_SAVER",
//       // "FEDEX_2_DAY",
//       // "FEDEX_2_DAY_AM",
//       // "STANDARD_OVERNIGHT",
//       // "PRIORITY_OVERNIGHT",
//       // "FIRST_OVERNIGHT",
//     ];

//     const rates: { service: string; rate: number; transitDays: number }[] = [];

//     // Use provided shipper address or default to RLX
//     const finalShipperAddress = shipperAddress || {
//       streetLines: ["312 East 52 Bypass"],
//       city: "Pilot Mountain",
//       stateOrProvinceCode: "NC",
//       postalCode: "27041",
//       countryCode: "US",
//       residential: false,
//     };

//     for (const serviceType of services) {
//       try {
//         const fedexRequest = {
//           accountNumber: { value: this.accountNumber },
//           rateRequestControlParameters: {
//             returnTransitTimes: true,
//           },
//           requestedShipment: {
//             shipDateStamp: new Date().toISOString().split("T")[0],
//             pickupType: "DROPOFF_AT_FEDEX_LOCATION",
//             serviceType: serviceType,
//             packagingType: "YOUR_PACKAGING",
//             preferredCurrency: "USD",
//             rateRequestType: ["LIST", "ACCOUNT"],
//             shipper: {
//               address: finalShipperAddress, // Use the warehouse address
//             },
//             recipient: {
//               address: {
//                 streetLines: [request.destination.address1],
//                 city: request.destination.city,
//                 stateOrProvinceCode: request.destination.province,
//                 postalCode: request.destination.postal_code,
//                 countryCode: request.destination.country,
//                 residential: false,
//               },
//             },
//             requestedPackageLineItems: packages.map((pkg, i) => ({
//               sequenceNumber: i + 1,
//               groupPackageCount: 1,
//               weight: {
//                 units: "LB",
//                 value: Number(pkg.weight.toFixed(1)),
//               },
//             })),
//           },
//         };

//         console.log(
//           "\n🟢 Fedex Request:",
//           JSON.stringify(fedexRequest, null, 2),
//         );

//         const response = await axios.post(
//           `${this.apiUrl}/rate/v1/rates/quotes`,
//           fedexRequest,
//           {
//             headers: {
//               Authorization: `Bearer ${accessToken}`,
//               "Content-Type": "application/json",
//               "X-locale": "en_US",
//             },
//             timeout: 10000,
//           },
//         );

//         const reply = response.data.output.rateReplyDetails[0];
//         const shipment = reply.ratedShipmentDetails[0];
//         const transitDays = this.getFedExTransitDays(reply);

//         rates.push({
//           service: serviceType,
//           rate: shipment.totalNetFedExCharge,
//           transitDays,
//         });

//         console.log(
//           `   ${serviceType}: $${shipment.totalNetFedExCharge} (${transitDays} days)`,
//         );
//       } catch (error: any) {
//         console.log(`   ${serviceType}: Not available`);
//       }
//     }

//     return rates;
//   }

//   // =====================================================
//   // MAIN RATE FUNCTION - GETS CHEAPEST RATE
//   // =====================================================

//   // async getSplitShipmentRate(
//   //   request: FedExRateRequest,
//   // ): Promise<FedExRateResponse> {
//   //   console.log("🟢 FedEx: Processing rate request for CHEAPEST option...");
//   //   const startTime = Date.now();

//   //   try {
//   //     const processed = this.processShopifyItems(request.items);

//   //     const consolidatedPackages = this.consolidatePackages(processed);

//   //     console.log(`\n🟢 Optimized Packaging:`);
//   //     console.log(
//   //       `   Total items: ${processed.reduce((sum, p) => sum + p.quantity, 0)}`,
//   //     );
//   //     console.log(
//   //       `   Consolidated into: ${consolidatedPackages.length} packages`,
//   //     );

//   //     consolidatedPackages.forEach((pkg, i) => {
//   //       console.log(
//   //         `   Package ${i + 1}: ${pkg.weight.toFixed(2)} lbs ` +
//   //           `(${pkg.items.length} items) - ` +
//   //           `${pkg.dimensions.length.toFixed(0)}" × ${pkg.dimensions.width.toFixed(
//   //             0,
//   //           )}" × ${pkg.dimensions.height.toFixed(0)}"`,
//   //       );
//   //     });

//   //     const totalWeight = consolidatedPackages.reduce(
//   //       (sum, pkg) => sum + pkg.weight,
//   //       0,
//   //     );
//   //     console.log(`   Total weight: ${totalWeight.toFixed(2)} lbs\n`);

//   //     if (consolidatedPackages.length === 0) {
//   //       throw new Error("No packages to ship");
//   //     }

//   //     const accessToken = await this.getAccessToken();

//   //     console.log("🟢 Comparing all available FedEx services:");
//   //     const allRates = await this.getAllServiceRates(
//   //       request,
//   //       consolidatedPackages,
//   //       accessToken,
//   //     );

//   //     if (allRates.length === 0) {
//   //       throw new Error("No rates available from FedEx");
//   //     }

//   //     allRates.sort((a, b) => a.rate - b.rate);

//   //     const cheapest = allRates[0];

//   //     console.log(`\n✅ CHEAPEST OPTION: ${cheapest.service}`);
//   //     console.log(`   Rate: $${cheapest.rate}`);
//   //     console.log(`   Transit: ${cheapest.transitDays} days`);
//   //     console.log(`   Packages: ${consolidatedPackages.length}`);
//   //     console.log(
//   //       `   Cost per package: $${(
//   //         cheapest.rate / consolidatedPackages.length
//   //       ).toFixed(2)}\n`,
//   //     );

//   //     const responseTime = Date.now() - startTime;
//   //     console.log(`🟢 Total processing time: ${responseTime}ms`);

//   //     return {
//   //       quoteId: `FEDEX-${Date.now()}`,
//   //       rate: cheapest.rate,
//   //       currency: "USD",
//   //       transitDays: cheapest.transitDays,
//   //       serviceLevel: cheapest.service,
//   //       packages: consolidatedPackages.length,
//   //     };
//   //   } catch (error: any) {
//   //     const responseTime = Date.now() - startTime;
//   //     console.error("🔴 FedEx API Error:", error.message);

//   //     if (error.response) {
//   //       console.error(
//   //         "🔴 FedEx Error Response:",
//   //         JSON.stringify(error.response.data, null, 2),
//   //       );
//   //       console.error("🔴 Status:", error.response.status);
//   //     }

//   //     return this.getFallbackRate(request, responseTime);
//   //   }
//   // }
//   async getSplitShipmentRate(
//     request: FedExRateRequest,
//   ): Promise<FedExRateResponse> {
//     console.log("🟢 FedEx: Processing rate request for CHEAPEST option...");
//     const startTime = Date.now();

//     try {
//       // Determine which origin to use
//       let shipperAddress;
//       let itemsToProcess = request.items;

//       if (request.origins && request.origins.length > 0) {
//         // Use the first/primary warehouse origin
//         const primaryOrigin = request.origins.reduce((max, current) =>
//           current.totalWeight > max.totalWeight ? current : max,
//         );

//         console.log(`🟢 Using warehouse origin: ${primaryOrigin.warehouseKey}`);
//         console.log(
//           `   📍 ${primaryOrigin.address.city}, ${primaryOrigin.address.province}`,
//         );
//         console.log(
//           `   ⚖️  Weight: ${primaryOrigin.totalWeight.toFixed(2)} lbs`,
//         );

//         shipperAddress = {
//           streetLines: [
//             primaryOrigin.address.address1,
//             primaryOrigin.address.address2,
//           ].filter(Boolean),
//           city: primaryOrigin.address.city,
//           stateOrProvinceCode: primaryOrigin.address.province,
//           postalCode: primaryOrigin.address.postal_code,
//           countryCode: primaryOrigin.address.country,
//           residential: false,
//         };

//         // Use items from the warehouse
//         itemsToProcess = primaryOrigin.items;
//       } else {
//         // Fallback to original origin
//         console.log("🟢 Using original Shopify origin");
//         shipperAddress = {
//           streetLines: [request.origin?.address1 || ""],
//           city: request.origin?.city || "",
//           stateOrProvinceCode: request.origin?.province || "",
//           postalCode: request.origin?.postal_code || "",
//           countryCode: request.origin?.country || "US",
//           residential: false,
//         };
//       }

//       const processed = this.processShopifyItems(itemsToProcess);
//       const consolidatedPackages = this.consolidatePackages(processed);

//       console.log(`\n🟢 Optimized Packaging:`);
//       console.log(
//         `   Total items: ${processed.reduce((sum, p) => sum + p.quantity, 0)}`,
//       );
//       console.log(
//         `   Consolidated into: ${consolidatedPackages.length} packages`,
//       );

//       consolidatedPackages.forEach((pkg, i) => {
//         console.log(
//           `   Package ${i + 1}: ${pkg.weight.toFixed(2)} lbs ` +
//             `(${pkg.items.length} items) - ` +
//             `${pkg.dimensions.length.toFixed(0)}" × ${pkg.dimensions.width.toFixed(
//               0,
//             )}" × ${pkg.dimensions.height.toFixed(0)}"`,
//         );
//       });

//       const totalWeight = consolidatedPackages.reduce(
//         (sum, pkg) => sum + pkg.weight,
//         0,
//       );
//       console.log(`   Total weight: ${totalWeight.toFixed(2)} lbs\n`);

//       if (consolidatedPackages.length === 0) {
//         throw new Error("No packages to ship");
//       }

//       const accessToken = await this.getAccessToken();

//       console.log("🟢 Comparing all available FedEx services:");
//       const allRates = await this.getAllServiceRates(
//         request,
//         consolidatedPackages,
//         accessToken,
//         shipperAddress, // Pass the warehouse shipper address
//       );

//       if (allRates.length === 0) {
//         throw new Error("No rates available from FedEx");
//       }

//       allRates.sort((a, b) => a.rate - b.rate);
//       const cheapest = allRates[0];

//       console.log(`\n✅ CHEAPEST OPTION: ${cheapest.service}`);
//       console.log(`   Rate: $${cheapest.rate}`);
//       console.log(`   Transit: ${cheapest.transitDays} days`);
//       console.log(`   Packages: ${consolidatedPackages.length}`);
//       console.log(
//         `   Cost per package: $${(
//           cheapest.rate / consolidatedPackages.length
//         ).toFixed(2)}\n`,
//       );

//       const responseTime = Date.now() - startTime;
//       console.log(`🟢 Total processing time: ${responseTime}ms`);

//       return {
//         quoteId: `FEDEX-${Date.now()}`,
//         rate: cheapest.rate,
//         currency: "USD",
//         transitDays: cheapest.transitDays,
//         serviceLevel: cheapest.service,
//         packages: consolidatedPackages.length,
//       };
//     } catch (error: any) {
//       const responseTime = Date.now() - startTime;
//       console.error("🔴 FedEx API Error:", error.message);

//       if (error.response) {
//         console.error(
//           "🔴 FedEx Error Response:",
//           JSON.stringify(error.response.data, null, 2),
//         );
//         console.error("🔴 Status:", error.response.status);
//       }

//       return this.getFallbackRate(request, responseTime);
//     }
//   }

//   // =====================================================
//   // HELPER: Extract transit days from FedEx response
//   // =====================================================

//   private getFedExTransitDays(reply: any): number {
//     const enumVal = reply.operationalDetail?.transitTime;
//     if (enumVal) {
//       const match = enumVal.match(/\d+/);
//       if (match) return Number(match[0]);

//       const MAP: Record<string, number> = {
//         ONE_DAY: 1,
//         TWO_DAYS: 2,
//         THREE_DAYS: 3,
//         FOUR_DAYS: 4,
//         FIVE_DAYS: 5,
//         SIX_DAYS: 6,
//         SEVEN_DAYS: 7,
//       };
//       if (MAP[enumVal]) return MAP[enumVal];
//     }

//     const desc = reply.commit?.transitDays?.description;
//     if (desc) {
//       const match = desc.match(/\d+/);
//       if (match) return Number(match[0]);
//     }

//     return 5;
//   }

//   // =====================================================
//   // FALLBACK RATE CALCULATION
//   // =====================================================

//   private getFallbackRate(
//     request: FedExRateRequest,
//     responseTime: number,
//   ): FedExRateResponse {
//     console.log("🟢 Using FedEx fallback rate calculation");

//     const processed = this.processShopifyItems(request.items);
//     const packages = this.consolidatePackages(processed);
//     const totalWeight = packages.reduce((sum, pkg) => sum + pkg.weight, 0);

//     console.log(
//       `🟢 Fallback: ${packages.length} packages, ${totalWeight.toFixed(2)} lbs total`,
//     );

//     const baseRatePerPackage = 15;
//     const perLbRate = 0.35;
//     const estimatedRate =
//       packages.length * baseRatePerPackage + totalWeight * perLbRate;

//     return {
//       quoteId: `FEDEX-FALLBACK-${Date.now()}`,
//       rate: Math.round(estimatedRate * 100) / 100,
//       transitDays: 5,
//       serviceLevel: "Ground (Estimated)",
//       currency: "USD",
//       packages: packages.length,
//     };
//   }
// }

// export default FedExClient;

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
  length: number;
  width: number;
  height: number;
  quantity: number;
  name: string;
  type: "ROLL" | "MAT" | "TILE";
}

interface ConsolidatedPackage {
  weight: number;
  items: ProcessedItem[];
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
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
          pkg.dimensions.length = Math.max(pkg.dimensions.length, item.length);
          pkg.dimensions.width = Math.max(pkg.dimensions.width, item.width);
          pkg.dimensions.height = Math.max(pkg.dimensions.height, item.height);
          placed = true;
          break;
        }
      }

      if (!placed) {
        packages.push({
          weight: item.weight,
          items: [item],
          dimensions: {
            length: item.length,
            width: item.width,
            height: item.height,
          },
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

  // =====================================================
  // PROCESS SHOPIFY ITEMS (PUBLIC - for pre-processing)
  // =====================================================
  public processShopifyItemsPublic(items: ShopifyItem[]): ProcessedItem[] {
    const processed: ProcessedItem[] = [];

    for (const item of items) {
      const isRoll = Number(item.properties?.["Width (ft)"]) > 0 && 
                     Number(item.properties?.["Length (ft)"]) > 0;
      const isMat = item.name?.toLowerCase().includes("mat");
      
      const type = isRoll ? "ROLL" : isMat ? "MAT" : "TILE";

      const perItemWeight = item.properties?.Weight
        ? Number(item.properties.Weight)
        : Number((item.grams / 453.592).toFixed(2));

      const quantity =
        item.properties?.Quantity || item.quantity || 1;

      const thickness = this.extractThickness(item.name);

      let length = 48,
        width = 48,
        height = 8;

      if (type === "ROLL") {
        const rollWidthFt = Number(item.properties?.["Width (ft)"] || 4);
        const rollLengthFt = Number(item.properties?.["Length (ft)"] || 10);
        const rollDiameter = Math.ceil(
          this.calculateRollDiameter(thickness, rollLengthFt),
        );
        length = rollWidthFt * 12;
        width = rollDiameter;
        height = rollDiameter;
      } else if (type === "MAT") {
        const dims = this.extractDimensions(item.name);
        if (dims) {
          length = (dims.length * 12) / 2;
          width = dims.width * 12;
          height = 6;
        } else {
          length = 36;
          width = 48;
          height = 6;
        }
      } else {
        const dims = this.extractDimensions(item.name);
        if (dims) {
          length = dims.length * 12;
          width = dims.width * 12;
          height = thickness;
        } else {
          length = 24;
          width = 24;
          height = thickness;
        }
      }

      processed.push({
        weight: perItemWeight,
        totalWeight: perItemWeight * quantity,
        length,
        width,
        height,
        quantity,
        name: item.name,
        type,
      });
    }

    return processed;
  }

  // =====================================================
  // CONSOLIDATE PACKAGES (PUBLIC - for pre-processing)
  // =====================================================
  public consolidatePackagesPublic(items: ProcessedItem[]): ConsolidatedPackage[] {
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
          pickupType: "USE_SCHEDULED_PICKUP",
          serviceType: serviceType,
          packagingType: "YOUR_PACKAGING",
          preferredCurrency: "USD",
          rateRequestType: ["LIST", "ACCOUNT"],
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
              length: Math.min(Math.ceil(pkg.dimensions.length), 108).toString(),
              width: Math.min(Math.ceil(pkg.dimensions.width), 108).toString(),
              height: Math.min(Math.ceil(pkg.dimensions.height), 108).toString(),
              units: "IN",
            },
          })),
        },
      };

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
      const services = ["FEDEX_GROUND", "GROUND_HOME_DELIVERY"];
      
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
      const finalRate = +(cheapest.rate * 1.06).toFixed(2);

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

// import axios from "axios";
// import { getFEDEXToken } from "./getFEDEXToken";

// // =====================================================
// // INTERFACES
// // =====================================================

// interface ShopifyItem {
//   name: string;
//   sku: string;
//   quantity: number;
//   grams: number;
//   price: number;
//   properties: any;
//   product_id: number;
//   variant_id: number;
// }

// interface FedExRateRequest {
//   origin?: {
//     country: string;
//     postal_code: string;
//     province: string;
//     city: string;
//     address1: string;
//     address2?: string;
//     phone: string;
//     company_name?: string;
//   };
//   origins?: Array<{
//     warehouseKey: string;
//     address: {
//       address1: string;
//       address2?: string;
//       city: string;
//       province: string;
//       postal_code: string;
//       country: string;
//       company?: string;
//       phone?: string;
//     };
//     totalWeight: number;
//     items: ShopifyItem[];
//   }>;
//   destination: {
//     country: string;
//     postal_code: string;
//     province: string;
//     city: string;
//     address1: string;
//     phone?: string;
//     company_name?: string;
//   };
//   items: ShopifyItem[];
//   currency: string;
//   totalWeight: number;
// }

// interface FedExRateResponse {
//   quoteId: string;
//   rate: number;
//   transitDays: number;
//   serviceLevel: string;
//   currency: string;
//   packages: number;
// }

// interface ProcessedItem {
//   weight: number;
//   totalWeight: number;
//   length: number;
//   width: number;
//   height: number;
//   quantity: number;
//   name: string;
//   type: "ROLL" | "MAT" | "TILE";
// }

// interface ConsolidatedPackage {
//   weight: number;
//   items: ProcessedItem[];
//   dimensions: {
//     length: number;
//     width: number;
//     height: number;
//   };
// }

// // =====================================================
// // PACKAGE OPTIMIZATION CLASSES
// // =====================================================

// class HeavyItemSplitter {
//   static preprocessItems(items: ProcessedItem[]): ProcessedItem[] {
//     const result: ProcessedItem[] = [];

//     for (const item of items) {
//       if (item.totalWeight > 68 && item.quantity > 1) {
//         for (let i = 0; i < item.quantity; i++) {
//           result.push({ ...item, quantity: 1, totalWeight: item.weight });
//         }
//         console.log(
//           `   ⚡ Split heavy item: ${item.name} (${item.totalWeight} lbs) into ${item.quantity} units`,
//         );
//       } else {
//         result.push(item);
//       }
//     }

//     return result;
//   }
// }

// class LTLDetector {
//   static shouldUseLTL(packages: ConsolidatedPackage[]): boolean {
//     const totalWeight = packages.reduce((sum, pkg) => sum + pkg.weight, 0);
//     const totalPackages = packages.length;

//     return (
//       totalWeight > 500 ||
//       totalPackages > 10 ||
//       packages.some((pkg) => pkg.weight > 150)
//     );
//   }

//   static logLTLRecommendation(packages: ConsolidatedPackage[]): void {
//     const totalWeight = packages.reduce((sum, pkg) => sum + pkg.weight, 0);

//     console.log("\n⚠️  LTL FREIGHT RECOMMENDED:");
//     console.log(`   • Total weight: ${totalWeight.toFixed(2)} lbs`);
//     console.log(`   • Packages: ${packages.length}`);
//     console.log(`   • Consider using FedEx Freight or freight forwarder`);
//     console.log(`   • Potential savings: 30-50% vs parcel shipping\n`);
//   }
// }

// class OptimizedPackageConsolidator {
//   private readonly OPTIMAL_WEIGHTS = [10, 20, 50, 70];

//   private calculateDimWeight(
//     length: number,
//     width: number,
//     height: number,
//   ): number {
//     return (length * width * height) / 139;
//   }

//   private getBillableWeight(pkg: ConsolidatedPackage): number {
//     const dimWeight = this.calculateDimWeight(
//       pkg.dimensions.length,
//       pkg.dimensions.width,
//       pkg.dimensions.height,
//     );
//     return Math.max(pkg.weight, dimWeight);
//   }

//   private estimatePackageCost(pkg: ConsolidatedPackage): number {
//     const billableWeight = this.getBillableWeight(pkg);

//     let baseRate = 15;
//     let perLbRate = 0.5;

//     if (billableWeight <= 10) {
//       baseRate = 12;
//       perLbRate = 0.45;
//     } else if (billableWeight <= 20) {
//       baseRate = 15;
//       perLbRate = 0.42;
//     } else if (billableWeight <= 50) {
//       baseRate = 18;
//       perLbRate = 0.38;
//     } else if (billableWeight <= 70) {
//       baseRate = 22;
//       perLbRate = 0.35;
//     } else {
//       baseRate = 25;
//       perLbRate = 0.32;
//     }

//     return baseRate + billableWeight * perLbRate;
//   }

//   protected calculateTotalCost(packages: ConsolidatedPackage[]): number {
//     return packages.reduce(
//       (sum, pkg) => sum + this.estimatePackageCost(pkg),
//       0,
//     );
//   }

//   public consolidatePackages(items: ProcessedItem[]): ConsolidatedPackage[] {
//     console.log("\n🔵 Starting package optimization...");

//     const expandedItems: ProcessedItem[] = [];
//     for (const item of items) {
//       for (let i = 0; i < item.quantity; i++) {
//         expandedItems.push({ ...item, quantity: 1 });
//       }
//     }

//     const strategies = [this.strategyMaxWeight(expandedItems)];

//     let bestStrategy = strategies[0];
//     let lowestCost = this.calculateTotalCost(strategies[0]);

//     console.log("\n📊 Evaluating packing strategies:");

//     const strategyNames = ["Max Weight (150 lbs)"];

//     strategies.forEach((strategy, index) => {
//       const cost = this.calculateTotalCost(strategy);
//       const totalWeight = strategy.reduce((sum, pkg) => sum + pkg.weight, 0);
//       const avgWeight = totalWeight / strategy.length;

//       console.log(`\n   ${strategyNames[index]}:`);
//       console.log(`   • Packages: ${strategy.length}`);
//       console.log(`   • Avg weight: ${avgWeight.toFixed(1)} lbs`);
//       console.log(`   • Estimated cost: $${cost.toFixed(2)}`);

//       if (cost < lowestCost) {
//         lowestCost = cost;
//         bestStrategy = strategy;
//         console.log(`   ✅ NEW BEST!`);
//       }
//     });

//     console.log(
//       `\n✅ Selected best strategy: Estimated savings of $${(
//         this.calculateTotalCost(strategies[0]) - lowestCost
//       ).toFixed(2)}\n`,
//     );

//     return bestStrategy;
//   }

//   private strategyMaxWeight(items: ProcessedItem[]): ConsolidatedPackage[] {
//     const packages: ConsolidatedPackage[] = [];
//     const sortedItems = [...items].sort((a, b) => b.weight - a.weight);

//     for (const item of sortedItems) {
//       let placed = false;

//       for (const pkg of packages) {
//         if (pkg.weight + item.weight <= 150) {
//           this.addItemToPackage(pkg, item);
//           placed = true;
//           break;
//         }
//       }

//       if (!placed) {
//         packages.push(this.createPackage(item));
//       }
//     }

//     return packages;
//   }

//   private createPackage(item: ProcessedItem): ConsolidatedPackage {
//     return {
//       weight: item.weight,
//       items: [item],
//       dimensions: {
//         length: item.length,
//         width: item.width,
//         height: item.height,
//       },
//     };
//   }

//   private addItemToPackage(
//     pkg: ConsolidatedPackage,
//     item: ProcessedItem,
//   ): void {
//     pkg.weight += item.weight;
//     pkg.items.push(item);
//     pkg.dimensions.length = Math.max(pkg.dimensions.length, item.length);
//     pkg.dimensions.width = Math.max(pkg.dimensions.width, item.width);
//     pkg.dimensions.height = Math.max(pkg.dimensions.height, item.height);
//   }
// }

// class OptimizedPackageConsolidatorV2 extends OptimizedPackageConsolidator {
//   public consolidatePackagesAdvanced(items: ProcessedItem[]): {
//     packages: ConsolidatedPackage[];
//     recommendation: "PARCEL" | "LTL";
//     estimatedSavings: number;
//   } {
//     console.log("\n🔵 Starting advanced package optimization...");

//     const preprocessed = HeavyItemSplitter.preprocessItems(items);
//     const packages = super.consolidatePackages(preprocessed);

//     const shouldUseLTL = LTLDetector.shouldUseLTL(packages);

//     if (shouldUseLTL) {
//       LTLDetector.logLTLRecommendation(packages);

//       const parcelCost = this.calculateTotalCost(packages);
//       const estimatedLTLCost = this.estimateLTLCost(packages);
//       const savings = parcelCost - estimatedLTLCost;

//       return {
//         packages,
//         recommendation: savings > 50 ? "LTL" : "PARCEL",
//         estimatedSavings: Math.max(0, savings),
//       };
//     }

//     return {
//       packages,
//       recommendation: "PARCEL",
//       estimatedSavings: 0,
//     };
//   }

//   private estimateLTLCost(packages: ConsolidatedPackage[]): number {
//     const totalWeight = packages.reduce((sum, pkg) => sum + pkg.weight, 0);

//     const baseRate = 150;
//     let perCwtRate = 30;

//     if (totalWeight > 1000) perCwtRate = 25;
//     if (totalWeight > 2000) perCwtRate = 20;
//     if (totalWeight > 5000) perCwtRate = 15;

//     const cwt = totalWeight / 100;
//     return baseRate + cwt * perCwtRate;
//   }
// }

// // =====================================================
// // MAIN FEDEX CLIENT
// // =====================================================

// export class FedExClient {
//   private apiUrl = process.env.FEDEX_API_URL_SMALL;
//   private clientId = process.env.FEDEX_CLIENT_ID_SMALL;
//   private clientSecret = process.env.FEDEX_CLIENT_SECRET_SMALL;
//   private accountNumber = process.env.FEDEX_ACCOUNT_SMALL || "";

//   private accessToken: string | null = null;
//   private tokenExpiry = 0;

//   // =====================================================
//   // OAUTH TOKEN
//   // =====================================================

//   private async getAccessToken(): Promise<any> {
//     if (this.accessToken && Date.now() < this.tokenExpiry) {
//       return this.accessToken;
//     }

//     if (!this.clientId || !this.clientSecret) {
//       throw new Error("FedEx credentials missing (CLIENT_ID / CLIENT_SECRET)");
//     }

//     console.log("🟢 Requesting FedEx OAuth token...");

//     const response = await axios.post(
//       `${this.apiUrl}/oauth/token`,
//       new URLSearchParams({
//         grant_type: "client_credentials",
//         client_id: this.clientId,
//         client_secret: this.clientSecret,
//       }),
//       {
//         headers: {
//           "Content-Type": "application/x-www-form-urlencoded",
//         },
//       },
//     );

//     this.accessToken = response.data.access_token;
//     this.tokenExpiry = Date.now() + 55 * 60 * 1000;

//     console.log("🟢 FedEx OAuth token obtained");
//     return this.accessToken;
//   }

//   // =====================================================
//   // HELPER: Extract thickness from product name
//   // =====================================================

//   private extractThickness(name: string): number {
//     if (!name) return 0.25;

//     const fractionMatch = name.match(/\b(\d+)\s*\/\s*(\d+)(?=")?/);
//     if (fractionMatch) {
//       const num = Number(fractionMatch[1]);
//       const den = Number(fractionMatch[2]);
//       return num / den;
//     }

//     const mmMatch = name.match(/\b(\d+(?:\.\d+)?)\s*mm\b/i);
//     if (mmMatch) {
//       const mm = Number(mmMatch[1]);
//       return mm / 25.4;
//     }

//     return 0.25;
//   }

//   // =====================================================
//   // HELPER: Extract dimensions from name
//   // =====================================================

//   private extractDimensionsFromName(
//     name: string,
//   ): { width: number; length: number } | null {
//     const feetMatch = name.match(/(\d+)'\s*x\s*(\d+)'/i);
//     if (feetMatch) {
//       return { width: Number(feetMatch[1]), length: Number(feetMatch[2]) };
//     }

//     const inchMatch = name.match(/(\d+)"\s*x\s*(\d+)"/i);
//     if (inchMatch) {
//       return {
//         width: Number(inchMatch[1]) / 12,
//         length: Number(inchMatch[2]) / 12,
//       };
//     }

//     const plainMatch = name.match(/(\d+)\s*x\s*(\d+)/i);
//     if (plainMatch) {
//       const val1 = Number(plainMatch[1]);
//       const val2 = Number(plainMatch[2]);

//       if (val1 < 10 && val2 < 10) {
//         return { width: val1, length: val2 };
//       } else {
//         return {
//           width: val1 / 12,
//           length: val2 / 12,
//         };
//       }
//     }

//     return null;
//   }

//   // =====================================================
//   // HELPER: Calculate roll diameter
//   // =====================================================

//   private calculateRollDiameter(
//     thicknessIn: number,
//     lengthFt: number,
//     coreDiameterIn = 4,
//   ): number {
//     const lengthIn = lengthFt * 12;
//     return Math.sqrt(
//       Math.pow(coreDiameterIn, 2) + (4 * thicknessIn * lengthIn) / Math.PI,
//     );
//   }

//   // =====================================================
//   // HELPER: Determine product type
//   // =====================================================

//   private getProductType(item: ShopifyItem): "ROLL" | "MAT" | "TILE" {
//     const hasWidthFt = Number(item.properties?.["Width (ft)"]) > 0;
//     const hasLengthFt = Number(item.properties?.["Length (ft)"]) > 0;

//     if (hasWidthFt && hasLengthFt) {
//       return "ROLL";
//     }

//     if (item.name?.toLowerCase().includes("mat")) {
//       return "MAT";
//     }

//     return "TILE";
//   }

//   // =====================================================
//   // PROCESS SHOPIFY ITEMS
//   // =====================================================

//   protected processShopifyItems(items: ShopifyItem[]): ProcessedItem[] {
//     const processedItems: ProcessedItem[] = [];

//     for (const item of items) {
//       const type = this.getProductType(item);

//       let perItemWeight = 0;

//       if (item.properties?.Weight) {
//         perItemWeight = Number(item.properties.Weight);
//       } else {
//         perItemWeight = Number((item.grams / 453.592).toFixed(2));
//       }

//       const isEmptyProperties =
//         !item.properties ||
//         (typeof item.properties === "object" &&
//           Object.keys(item.properties).length === 0);

//       const quantity = isEmptyProperties
//         ? item.quantity
//         : Number(item.properties.Quantity || item.quantity);

//       let length = 48;
//       let width = 48;
//       let height = 8;

//       const thickness = this.extractThickness(item.name);

//       if (type === "ROLL") {
//         const rollWidthFt = Number(item.properties?.["Width (ft)"] || 4);
//         const rollLengthFt = Number(item.properties?.["Length (ft)"] || 10);

//         const rollDiameter = Math.ceil(
//           this.calculateRollDiameter(thickness, rollLengthFt),
//         );

//         length = rollWidthFt * 12;
//         width = rollDiameter;
//         height = rollDiameter;

//         console.log(`🟢 ROLL: ${item.name}`);
//         console.log(`   Thickness: ${thickness}"`);
//         console.log(`   Roll: ${rollWidthFt}' wide × ${rollLengthFt}' long`);
//         console.log(`   Calculated diameter: ${rollDiameter}"`);
//         console.log(
//           `   Package dimensions: ${length}" × ${width}" × ${height}"`,
//         );
//       } else if (type === "MAT") {
//         const dims = this.extractDimensionsFromName(item.name);

//         if (dims) {
//           length = (dims.length * 12) / 2;
//           width = dims.width * 12;
//           height = 6;
//         } else {
//           length = (6 * 12) / 2;
//           width = 4 * 12;
//           height = 6;
//         }

//         console.log(`🟢 MAT: ${item.name}`);
//         console.log(`   Thickness: ${thickness}"`);
//         console.log(
//           `   Original size: ${dims?.width || 4}' × ${dims?.length || 6}'`,
//         );
//         console.log(
//           `   Folded dimensions: ${length}" × ${width}" × ${height}"`,
//         );
//       } else {
//         const dims = this.extractDimensionsFromName(item.name);

//         if (dims) {
//           length = dims.length * 12;
//           width = dims.width * 12;
//           height = thickness;
//         } else {
//           length = 24;
//           width = 24;
//           height = thickness;
//         }

//         console.log(`🟢 TILE: ${item.name}`);
//         console.log(`   Thickness: ${thickness}"`);
//         console.log(
//           `   Tile size: ${dims?.width || 2}' × ${dims?.length || 2}'`,
//         );
//         console.log(
//           `   Package dimensions: ${length}" × ${width}" × ${height}"`,
//         );
//       }

//       processedItems.push({
//         weight: perItemWeight,
//         totalWeight: perItemWeight * quantity,
//         length,
//         width,
//         height,
//         quantity,
//         name: item.name,
//         type,
//       });

//       console.log(
//         `   Weight: ${perItemWeight} lbs × ${quantity} = ${
//           perItemWeight * quantity
//         } lbs`,
//       );
//     }

//     return processedItems;
//   }

//   // =====================================================
//   // SMART PACKAGE CONSOLIDATION
//   // =====================================================

//   protected consolidatePackages(items: ProcessedItem[]): ConsolidatedPackage[] {
//     const optimizer = new OptimizedPackageConsolidatorV2();
//     const result = optimizer.consolidatePackagesAdvanced(items);

//     if (result.recommendation === "LTL") {
//       console.log(
//         `💰 Potential savings with LTL: $${result.estimatedSavings.toFixed(2)}`,
//       );
//     }

//     return result.packages;
//   }

//   // =====================================================
//   // PUBLIC METHODS FOR EXTERNAL USE
//   // =====================================================

//   public processShopifyItemsPublic(items: ShopifyItem[]): ProcessedItem[] {
//     return this.processShopifyItems(items);
//   }

//   public consolidatePackagesPublic(
//     items: ProcessedItem[],
//   ): ConsolidatedPackage[] {
//     return this.consolidatePackages(items);
//   }

//   // =====================================================
//   // GET ALL SERVICE RATES
//   // =====================================================

//   private async getAllServiceRates(
//     request: FedExRateRequest,
//     packages: ConsolidatedPackage[],
//     accessToken: string,
//     shipperAddress?: any,
//   ): Promise<{ service: string; rate: number; transitDays: number }[]> {
//     const services = ["FEDEX_GROUND", "GROUND_HOME_DELIVERY"];

//     const rates: { service: string; rate: number; transitDays: number }[] = [];

//     const finalShipperAddress = shipperAddress || {
//       streetLines: ["312 East 52 Bypass"],
//       city: "Pilot Mountain",
//       stateOrProvinceCode: "NC",
//       postalCode: "27041",
//       countryCode: "US",
//       residential: false,
//     };

//     for (const serviceType of services) {
//       try {
//         const fedexRequest = {
//           accountNumber: { value: this.accountNumber },
//           rateRequestControlParameters: {
//             returnTransitTimes: true,
//           },
//           requestedShipment: {
//             shipDateStamp: new Date().toISOString().split("T")[0],
//             // pickupType: "DROPOFF_AT_FEDEX_LOCATION",
//             pickupType: "USE_SCHEDULED_PICKUP",
//             serviceType: serviceType,
//             packagingType: "YOUR_PACKAGING",
//             preferredCurrency: "USD",
//             rateRequestType: ["LIST", "ACCOUNT"],
//             shipper: {
//               address: finalShipperAddress,
//             },
//             recipient: {
//               address: {
//                 streetLines: [request.destination.address1],
//                 city: request.destination.city,
//                 stateOrProvinceCode: request.destination.province,
//                 postalCode: request.destination.postal_code,
//                 countryCode: request.destination.country,
//                 // residential: false,
//                 residential: true,
//               },
//             },
//             requestedPackageLineItems: packages.map((pkg, i) => ({
//               sequenceNumber: i + 1,
//               groupPackageCount: 1,
//               weight: {
//                 units: "LB",
//                 value: Number(pkg.weight.toFixed(1)),
//               },
//               dimensions: {
//                 length: "14",
//                 width: "10",
//                 height: "7",
//                 units: "IN",
//               },
//             })),
//           },
//         };

//         console.log(
//           "\n🟢 Fedex Request:",
//           JSON.stringify(fedexRequest, null, 2),
//         );

//         const response = await axios.post(
//           `${this.apiUrl}/rate/v1/rates/quotes`,
//           fedexRequest,
//           {
//             headers: {
//               Authorization: `Bearer ${accessToken}`,
//               "Content-Type": "application/json",
//               "X-locale": "en_US",
//             },
//             timeout: 10000,
//           },
//         );

//         const reply = response.data.output.rateReplyDetails[0];
//         const shipment = reply.ratedShipmentDetails[0];
//         const transitDays = this.getFedExTransitDays(reply);

//         rates.push({
//           service: serviceType,
//           rate: shipment.totalNetFedExCharge,
//           transitDays,
//         });

//         console.log(
//           `   ${serviceType}: $${shipment.totalNetFedExCharge} (${transitDays} days)`,
//         );
//       } catch (error: any) {
//         console.log(`   ${serviceType}: Not available`);
//       }
//     }

//     return rates;
//   }

//   // =====================================================
//   // MAIN RATE FUNCTION - ORIGINAL (KEPT FOR COMPATIBILITY)
//   // =====================================================

//   async getSplitShipmentRate(
//     request: FedExRateRequest,
//   ): Promise<FedExRateResponse> {
//     console.log("🟢 FedEx: Processing rate request for CHEAPEST option...");
//     const startTime = Date.now();

//     try {
//       let shipperAddress;
//       let itemsToProcess = request.items;

//       if (request.origins && request.origins.length > 0) {
//         const primaryOrigin = request.origins.reduce((max, current) =>
//           current.totalWeight > max.totalWeight ? current : max,
//         );

//         console.log(`🟢 Using warehouse origin: ${primaryOrigin.warehouseKey}`);
//         console.log(
//           `   📍 ${primaryOrigin.address.city}, ${primaryOrigin.address.province}`,
//         );
//         console.log(
//           `   ⚖️  Weight: ${primaryOrigin.totalWeight.toFixed(2)} lbs`,
//         );

//         shipperAddress = {
//           streetLines: [
//             primaryOrigin.address.address1,
//             primaryOrigin.address.address2,
//           ].filter(Boolean),
//           city: primaryOrigin.address.city,
//           stateOrProvinceCode: primaryOrigin.address.province,
//           postalCode: primaryOrigin.address.postal_code,
//           countryCode: primaryOrigin.address.country,
//           residential: false,
//         };

//         itemsToProcess = primaryOrigin.items;
//       } else {
//         console.log("🟢 Using original Shopify origin");
//         shipperAddress = {
//           streetLines: [request.origin?.address1 || ""],
//           city: request.origin?.city || "",
//           stateOrProvinceCode: request.origin?.province || "",
//           postalCode: request.origin?.postal_code || "",
//           countryCode: request.origin?.country || "US",
//           residential: false,
//         };
//       }

//       const processed = this.processShopifyItems(itemsToProcess);
//       const consolidatedPackages = this.consolidatePackages(processed);

//       console.log(`\n🟢 Optimized Packaging:`);
//       console.log(
//         `   Total items: ${processed.reduce((sum, p) => sum + p.quantity, 0)}`,
//       );
//       console.log(
//         `   Consolidated into: ${consolidatedPackages.length} packages`,
//       );

//       consolidatedPackages.forEach((pkg, i) => {
//         console.log(
//           `   Package ${i + 1}: ${pkg.weight.toFixed(2)} lbs ` +
//             `(${pkg.items.length} items) - ` +
//             `${pkg.dimensions.length.toFixed(0)}" × ${pkg.dimensions.width.toFixed(
//               0,
//             )}" × ${pkg.dimensions.height.toFixed(0)}"`,
//         );
//       });

//       const totalWeight = consolidatedPackages.reduce(
//         (sum, pkg) => sum + pkg.weight,
//         0,
//       );
//       console.log(`   Total weight: ${totalWeight.toFixed(2)} lbs\n`);

//       if (consolidatedPackages.length === 0) {
//         throw new Error("No packages to ship");
//       }

//       // const accessToken = await this.getAccessToken();
//       const accessToken = await getFEDEXToken();

//       console.log("🟢 Comparing all available FedEx services:");
//       const allRates = await this.getAllServiceRates(
//         request,
//         consolidatedPackages,
//         accessToken,
//         shipperAddress,
//       );

//       if (allRates.length === 0) {
//         throw new Error("No rates available from FedEx");
//       }

//       allRates.sort((a, b) => a.rate - b.rate);
//       const cheapest = allRates[0];

//       // Add 6% extra charge on the base rate
//       const surchargePercentage = 6;
//       const finalRate = +(
//         cheapest.rate *
//         (1 + surchargePercentage / 100)
//       ).toFixed(2);

//       console.log(`\n✅ CHEAPEST OPTION: ${cheapest.service}`);
//       // console.log(`   Rate: $${cheapest.rate}`);
//       console.log(`   Base Rate: $${cheapest.rate}`);
//       console.log(
//         `   Rate after ${surchargePercentage}% surcharge: $${finalRate}`,
//       );
//       console.log(`   Transit: ${cheapest.transitDays} days`);
//       console.log(`   Packages: ${consolidatedPackages.length}`);

//       const responseTime = Date.now() - startTime;
//       console.log(`🟢 Total processing time: ${responseTime}ms`);

//       return {
//         quoteId: `FEDEX-${Date.now()}`,
//         // rate: cheapest.rate,
//         rate: finalRate,
//         currency: "USD",
//         transitDays: cheapest.transitDays,
//         serviceLevel: cheapest.service,
//         packages: consolidatedPackages.length,
//       };
//     } catch (error: any) {
//       const responseTime = Date.now() - startTime;
//       console.error("🔴 FedEx API Error:", error.message);

//       if (error.response) {
//         console.error(
//           "🔴 FedEx Error Response:",
//           JSON.stringify(error.response.data, null, 2),
//         );
//         console.error("🔴 Status:", error.response.status);
//       }

//       return this.getFallbackRate(request, responseTime);
//     }
//   }

//   // =====================================================
//   // NEW METHOD: Get rate with pre-processed packages
//   // =====================================================

//   async getRateForOrigin(
//     destination: any,
//     packages: ConsolidatedPackage[],
//     shipperAddress: any,
//   ): Promise<FedExRateResponse> {
//     console.log(
//       "🟢 FedEx: Getting rate for specific origin (pre-processed packages)...",
//     );
//     const startTime = Date.now();

//     try {
//       console.log(`\n🟢 Pre-processed Packages:`);
//       console.log(`   Total packages: ${packages.length}`);

//       packages.forEach((pkg, i) => {
//         console.log(
//           `   Package ${i + 1}: ${pkg.weight.toFixed(2)} lbs - ` +
//             `${pkg.dimensions.length.toFixed(0)}" × ${pkg.dimensions.width.toFixed(
//               0,
//             )}" × ${pkg.dimensions.height.toFixed(0)}"`,
//         );
//       });

//       const totalWeight = packages.reduce((sum, pkg) => sum + pkg.weight, 0);
//       console.log(`   Total weight: ${totalWeight.toFixed(2)} lbs\n`);

//       if (packages.length === 0) {
//         throw new Error("No packages to ship");
//       }

//       // const accessToken = await this.getAccessToken();
//       const accessToken = await getFEDEXToken();

//       console.log(
//         "======================================================================>",
//       );

//       console.log("🟢 Comparing all available FedEx services:");
//       const allRates = await this.getAllServiceRates(
//         { destination } as any,
//         packages,
//         accessToken,
//         shipperAddress,
//       );

//       if (allRates.length === 0) {
//         throw new Error("No rates available from FedEx");
//       }

//       allRates.sort((a, b) => a.rate - b.rate);
//       const cheapest = allRates[0];

//       // Add 6% extra charge on the base rate
//       const surchargePercentage = 6;
//       const finalRate = +(
//         cheapest.rate *
//         (1 + surchargePercentage / 100)
//       ).toFixed(2);

//       console.log(`\n✅ CHEAPEST OPTION: ${cheapest.service}`);
//       // console.log(`   Rate: $${cheapest.rate}`);
//       console.log(`   Base Rate: $${cheapest.rate}`);
//       console.log(
//         `   Rate after ${surchargePercentage}% surcharge: $${finalRate}`,
//       );
//       console.log(`   Transit: ${cheapest.transitDays} days`);
//       console.log(`   Packages: ${packages.length}`);

//       const responseTime = Date.now() - startTime;
//       console.log(`🟢 Processing time: ${responseTime}ms`);

//       return {
//         quoteId: `FEDEX-${Date.now()}`,
//         // rate: cheapest.rate,
//         rate: finalRate,
//         currency: "USD",
//         transitDays: cheapest.transitDays,
//         serviceLevel: cheapest.service,
//         packages: packages.length,
//       };
//     } catch (error: any) {
//       const responseTime = Date.now() - startTime;
//       console.error("🔴 FedEx API Error:", error.message);

//       if (error.response) {
//         console.error(
//           "🔴 FedEx Error Response:",
//           JSON.stringify(error.response.data, null, 2),
//         );
//         console.error("🔴 Status:", error.response.status);
//       }

//       throw error;
//     }
//   }

//   // =====================================================
//   // HELPER: Extract transit days from FedEx response
//   // =====================================================

//   private getFedExTransitDays(reply: any): number {
//     const enumVal = reply.operationalDetail?.transitTime;
//     if (enumVal) {
//       const match = enumVal.match(/\d+/);
//       if (match) return Number(match[0]);

//       const MAP: Record<string, number> = {
//         ONE_DAY: 1,
//         TWO_DAYS: 2,
//         THREE_DAYS: 3,
//         FOUR_DAYS: 4,
//         FIVE_DAYS: 5,
//         SIX_DAYS: 6,
//         SEVEN_DAYS: 7,
//       };
//       if (MAP[enumVal]) return MAP[enumVal];
//     }

//     const desc = reply.commit?.transitDays?.description;
//     if (desc) {
//       const match = desc.match(/\d+/);
//       if (match) return Number(match[0]);
//     }

//     return 5;
//   }

//   // =====================================================
//   // FALLBACK RATE CALCULATION
//   // =====================================================

//   private getFallbackRate(
//     request: FedExRateRequest,
//     responseTime: number,
//   ): FedExRateResponse {
//     console.log("🟢 Using FedEx fallback rate calculation");

//     const processed = this.processShopifyItems(request.items);
//     const packages = this.consolidatePackages(processed);
//     const totalWeight = packages.reduce((sum, pkg) => sum + pkg.weight, 0);

//     console.log(
//       `🟢 Fallback: ${packages.length} packages, ${totalWeight.toFixed(2)} lbs total`,
//     );

//     const baseRatePerPackage = 15;
//     const perLbRate = 0.35;
//     const estimatedRate =
//       packages.length * baseRatePerPackage + totalWeight * perLbRate;

//     return {
//       quoteId: `FEDEX-FALLBACK-${Date.now()}`,
//       rate: Math.round(estimatedRate * 100) / 100,
//       transitDays: 5,
//       serviceLevel: "Ground (Estimated)",
//       currency: "USD",
//       packages: packages.length,
//     };
//   }
// }

// export default FedExClient;
