// // =====================================================
// // FEDEX FREIGHT LTL RATE IMPLEMENTATION
// // =====================================================

// import axios from "axios";
// import FedExClient from "./fedex-client";

// interface FreightClass {
//   class: string; // "50", "55", "60", "65", "70", "77.5", "85", "92.5", "100", "110", "125", "150", "175", "200", "250", "300", "400", "500"
//   description: string;
// }

// interface FreightDimensions {
//   length: number;
//   width: number;
//   height: number;
//   units: "IN" | "CM";
// }

// interface FreightLineItem {
//   weight: {
//     value: number;
//     units: "LB" | "KG";
//   };
//   dimensions?: FreightDimensions;
//   freightClass?: string;
//   handlingUnits?: number;
//   packagingType?: string; // "PALLET", "SKID", "BOX", "CRATE"
//   description: string;
// }

// interface FedExFreightRateRequest {
//   origin: {
//     address1: string;
//     city: string;
//     province: string;
//     postal_code: string;
//     country: string;
//   };
//   destination: {
//     address1: string;
//     city: string;
//     province: string;
//     postal_code: string;
//     country: string;
//   };
//   lineItems: FreightLineItem[];
//   accountNumber?: string;
// }

// interface FedExFreightRateResponse {
//   quoteId: string;
//   rate: number;
//   currency: string;
//   transitDays: number;
//   serviceLevel: string;
//   freightClass: string;
//   totalWeight: number;
//   numberOfPallets: number;
//   estimatedSavings?: number;
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

// interface FedExRateRequest {
//   origin: {
//     postalCode: string;
//     country: string;
//   };
//   destination: {
//     postalCode: string;
//     city: string;
//     province: string;
//     country: string;
//   };
//   items: Array<{
//     weight: number;
//     totalWeight: number;
//     length: number;
//     width: number;
//     height: number;
//     quantity: number;
//     perItemWeight: number;
//   }>;
// }

// interface FedExRateResponse {
//   quoteId: string;
//   rate: number;
//   currency: string;
//   transitDays: number;
//   serviceLevel: string;
//   packages: number;
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

// // =====================================================
// // FREIGHT CLASS CALCULATOR
// // =====================================================

// class FreightClassCalculator {
//   /**
//    * Determine freight class based on density (lbs per cubic foot)
//    * Density = Weight (lbs) / Volume (cubic feet)
//    */
//   static calculateFreightClass(
//     weight: number,
//     length: number,
//     width: number,
//     height: number,
//   ): string {
//     const volumeCubicInches = length * width * height;
//     const volumeCubicFeet = volumeCubicInches / 1728; // 12^3
//     const density = weight / volumeCubicFeet;

//     console.log(`   📦 Density calculation:`);
//     console.log(`      Weight: ${weight} lbs`);
//     console.log(`      Volume: ${volumeCubicFeet.toFixed(2)} cu ft`);
//     console.log(`      Density: ${density.toFixed(2)} lbs/cu ft`);

//     // Freight class based on density ranges
//     if (density > 50) return "50";
//     if (density > 35) return "55";
//     if (density > 30) return "60";
//     if (density > 22.5) return "65";
//     if (density > 15) return "70";
//     if (density > 13.5) return "77.5";
//     if (density > 12) return "85";
//     if (density > 10.5) return "92.5";
//     if (density > 9) return "100";
//     if (density > 8) return "110";
//     if (density > 7) return "125";
//     if (density > 6) return "150";
//     if (density > 5) return "175";
//     if (density > 4) return "200";
//     if (density > 3) return "250";
//     if (density > 2) return "300";
//     if (density > 1) return "400";
//     return "500";
//   }

//   /**
//    * Get recommended freight class for common rubber/foam products
//    */
//   static getRecommendedClass(productType: string): string {
//     const classMap: Record<string, string> = {
//       ROLL: "77.5", // Rubber rolls typically class 77.5
//       MAT: "85", // Rubber mats typically class 85
//       TILE: "92.5", // Rubber tiles typically class 92.5
//     };

//     return classMap[productType] || "85";
//   }
// }

// // =====================================================
// // PALLET OPTIMIZER FOR LTL
// // =====================================================

// class PalletOptimizer {
//   private static readonly STANDARD_PALLET = {
//     length: 48,
//     width: 40,
//     maxHeight: 96,
//     maxWeight: 2500,
//   };

//   /**
//    * Consolidate packages onto pallets for LTL shipping
//    */
//   static optimizePallets(packages: ConsolidatedPackage[]): {
//     pallets: FreightLineItem[];
//     totalWeight: number;
//   } {
//     console.log("\n🚚 Optimizing pallets for LTL freight...");

//     const pallets: FreightLineItem[] = [];
//     let currentPallet: ConsolidatedPackage[] = [];
//     let currentWeight = 0;
//     let currentHeight = 0;

//     // Sort packages by weight (heaviest first)
//     const sortedPackages = [...packages].sort((a, b) => b.weight - a.weight);

//     for (const pkg of sortedPackages) {
//       const pkgHeight = pkg.dimensions.height;

//       // Check if package fits on current pallet
//       if (
//         currentWeight + pkg.weight <= this.STANDARD_PALLET.maxWeight &&
//         currentHeight + pkgHeight <= this.STANDARD_PALLET.maxHeight
//       ) {
//         currentPallet.push(pkg);
//         currentWeight += pkg.weight;
//         currentHeight += pkgHeight;
//       } else {
//         // Current pallet is full, create new pallet
//         if (currentPallet.length > 0) {
//           pallets.push(
//             this.createPallet(currentPallet, currentWeight, currentHeight),
//           );
//         }

//         currentPallet = [pkg];
//         currentWeight = pkg.weight;
//         currentHeight = pkgHeight;
//       }
//     }

//     // Add final pallet
//     if (currentPallet.length > 0) {
//       pallets.push(
//         this.createPallet(currentPallet, currentWeight, currentHeight),
//       );
//     }

//     const totalWeight = pallets.reduce((sum, p) => sum + p.weight.value, 0);

//     console.log(`   ✅ Optimized into ${pallets.length} pallet(s)`);
//     pallets.forEach((pallet, i) => {
//       console.log(
//         `   Pallet ${i + 1}: ${pallet.weight.value} lbs, ` +
//           `${pallet.dimensions?.length}" × ${pallet.dimensions?.width}" × ${pallet.dimensions?.height}" ` +
//           `(Class ${pallet.freightClass})`,
//       );
//     });

//     return { pallets, totalWeight };
//   }

//   private static createPallet(
//     packages: ConsolidatedPackage[],
//     weight: number,
//     height: number,
//   ): FreightLineItem {
//     // Determine freight class based on combined packages
//     const avgType = packages[0]?.items[0]?.type || "MAT";
//     const freightClass = FreightClassCalculator.getRecommendedClass(avgType);

//     // Also calculate based on density for accuracy
//     const calculatedClass = FreightClassCalculator.calculateFreightClass(
//       weight,
//       this.STANDARD_PALLET.length,
//       this.STANDARD_PALLET.width,
//       height,
//     );

//     // Use the lower class (higher density = lower class number = cheaper)
//     const finalClass = Math.min(
//       parseInt(freightClass),
//       parseInt(calculatedClass),
//     ).toString();

//     return {
//       weight: {
//         value: Math.ceil(weight),
//         units: "LB",
//       },
//       dimensions: {
//         length: this.STANDARD_PALLET.length,
//         width: this.STANDARD_PALLET.width,
//         height: Math.ceil(height),
//         units: "IN",
//       },
//       freightClass: finalClass,
//       handlingUnits: 1,
//       packagingType: "PALLET",
//       description: `Pallet of ${packages.length} package(s) - Rubber products`,
//     };
//   }
// }

// // =====================================================
// // FEDEX FREIGHT LTL CLIENT
// // =====================================================

// export class FedExFreightClient {
//   private apiUrl = process.env.FEDEX_API_URL_LTL;
//   private clientId = process.env.FEDEX_CLIENT_ID_LTL;
//   private clientSecret = process.env.FEDEX_CLIENT_SECRET_LTL;
//   private accountNumber = process.env.FEDEX_ACCOUNT_LTL || "";

//   private accessToken: string | null = null;
//   private tokenExpiry = 0;

//   // =====================================================
//   // OAUTH TOKEN (Same as parcel)
//   // =====================================================

//   private async getAccessToken(): Promise<any> {
//     if (this.accessToken && Date.now() < this.tokenExpiry) {
//       return this.accessToken;
//     }

//     if (!this.clientId || !this.clientSecret) {
//       throw new Error("FedEx credentials missing (CLIENT_ID / CLIENT_SECRET)");
//     }

//     console.log("apiurl================================>",this.apiUrl)
//     console.log("clientId=================================>",this.clientId)
//     console.log("clientSecret===============================>",this.clientSecret)
    
//     console.log("🟢 Requesting FedEx OAuth token for Freight...");

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

//     console.log("🟢 FedEx Freight OAuth token obtained");
//     return this.accessToken;
//   }

//   // =====================================================
//   // GET LTL FREIGHT RATE
//   // =====================================================

//   //   async getFreightRate(
//   //     request: FedExFreightRateRequest,
//   //   ): Promise<FedExFreightRateResponse> {
//   //     console.log("\n🚚 FedEx Freight: Processing LTL rate request...");
//   //     const startTime = Date.now();

//   //     try {
//   //       const accessToken = await this.getAccessToken();

//   //       // Build FedEx Freight API request
//   //       //   const fedexFreightRequest = {
//   //       //     accountNumber: {
//   //       //       value: this.accountNumber,
//   //       //     },
//   //       //     rateRequestControlParameters: {
//   //       //       returnTransitTimes: true,
//   //       //       rateSortOrder: "COMMITASCENDING",
//   //       //     },
//   //       //     requestedShipment: {
//   //       //       shipper: {
//   //       //         address: {
//   //       //           streetLines: [request.origin.address1],
//   //       //           city: request.origin.city,
//   //       //           stateOrProvinceCode: request.origin.province,
//   //       //           postalCode: request.origin.postal_code,
//   //       //           countryCode: request.origin.country,
//   //       //         },
//   //       //       },
//   //       //       recipient: {
//   //       //         address: {
//   //       //           streetLines: [request.destination.address1],
//   //       //           city: request.destination.city,
//   //       //           stateOrProvinceCode: request.destination.province,
//   //       //           postalCode: request.destination.postal_code,
//   //       //           countryCode: request.destination.country,
//   //       //         },
//   //       //       },
//   //       //       serviceType: "FEDEX_FREIGHT_ECONOMY", // or "FEDEX_FREIGHT_PRIORITY"
//   //       //       pickupType: "USE_SCHEDULED_PICKUP",
//   //       //       packagingType: "YOUR_PACKAGING",
//   //       //       freightShipmentDetail: {
//   //       //         fedExFreightAccountNumber: {
//   //       //           value: this.accountNumber,
//   //       //         },
//   //       //         role: "SHIPPER",
//   //       //         totalHandlingUnits: request.lineItems.reduce(
//   //       //           (sum, item) => sum + (item.handlingUnits || 1),
//   //       //           0,
//   //       //         ),
//   //       //         lineItems: request.lineItems.map((item, index) => ({
//   //       //           sequenceNumber: index + 1,
//   //       //           freightClass: item.freightClass,
//   //       //           classProvidedByCustomer: true,
//   //       //           weight: {
//   //       //             units: item.weight.units,
//   //       //             value: item.weight.value,
//   //       //           },
//   //       //           dimensions: item.dimensions,
//   //       //           packaging: item.packagingType || "PALLET",
//   //       //           pieces: item.handlingUnits || 1,
//   //       //           description: item.description,
//   //       //         })),
//   //       //       },
//   //       //       totalWeight: {
//   //       //         units: "LB",
//   //       //         value: request.lineItems.reduce(
//   //       //           (sum, item) => sum + item.weight.value,
//   //       //           0,
//   //       //         ),
//   //       //       },
//   //       //       preferredCurrency: "USD",
//   //       //     },
//   //       //   };
//   //       const fedexFreightRequest = {
//   //         accountNumber: {
//   //           value: this.accountNumber,
//   //         },
//   //         requestedShipment: {
//   //           shipper: {
//   //             address: {
//   //               streetLines: [request.origin.address1],
//   //               city: request.origin.city,
//   //               stateOrProvinceCode: request.origin.province,
//   //               postalCode: request.origin.postal_code,
//   //               countryCode: request.origin.country,
//   //             },
//   //           },
//   //           recipient: {
//   //             address: {
//   //               streetLines: [request.destination.address1],
//   //               city: request.destination.city,
//   //               stateOrProvinceCode: request.destination.province,
//   //               postalCode: request.destination.postal_code,
//   //               countryCode: request.destination.country,
//   //             },
//   //           },
//   //           pickupType: "USE_SCHEDULED_PICKUP",
//   //           serviceType: "FEDEX_FREIGHT_ECONOMY",
//   //           packagingType: "YOUR_PACKAGING",

//   //           // ✅ FREIGHT-SPECIFIC DETAILS
//   //           freightShipmentDetail: {
//   //             fedExFreightAccountNumber: {
//   //               value: this.accountNumber,
//   //             },
//   //             role: "SHIPPER",

//   //             // ✅ CORRECT LINE ITEMS FORMAT
//   //             lineItem: request.lineItems.map((item, index) => ({
//   //               weight: {
//   //                 units: item.weight.units,
//   //                 value: item.weight.value,
//   //               },
//   //               dimensions: item.dimensions
//   //                 ? {
//   //                     length: item.dimensions.length,
//   //                     width: item.dimensions.width,
//   //                     height: item.dimensions.height,
//   //                     units: item.dimensions.units,
//   //                   }
//   //                 : undefined,
//   //               freightClass: item.freightClass,
//   //               classProvidedByCustomer: true,
//   //               handlingUnits: item.handlingUnits || 1,
//   //               packaging: item.packagingType || "PALLET",
//   //               description: item.description || "Freight Shipment",
//   //               id: String(index + 1),
//   //             })),
//   //           },

//   //           totalWeight: {
//   //             units: "LB",
//   //             value: request.lineItems.reduce(
//   //               (sum, item) => sum + item.weight.value,
//   //               0,
//   //             ),
//   //           },

//   //           shippingChargesPayment: {
//   //             paymentType: "SENDER",
//   //           },
//   //         },
//   //       };

//   //       console.log("\n📤 Sending FedEx Freight API request...");

//   //       const response = await axios.post(
//   //         `${this.apiUrl}/freight/v1/rates/quotes`,
//   //         fedexFreightRequest,
//   //         {
//   //           headers: {
//   //             Authorization: `Bearer ${accessToken}`,
//   //             "Content-Type": "application/json",
//   //             "X-locale": "en_US",
//   //           },
//   //           timeout: 20000,
//   //         },
//   //       );

//   //       const rateReply = response.data.output.rateReplyDetails[0];
//   //       const shipmentDetails = rateReply.ratedShipmentDetails[0];

//   //       const totalWeight = request.lineItems.reduce(
//   //         (sum, item) => sum + item.weight.value,
//   //         0,
//   //       );

//   //       const transitDays = this.extractTransitDays(rateReply);

//   //       const responseTime = Date.now() - startTime;
//   //       console.log(`\n✅ FedEx Freight Quote Received (${responseTime}ms):`);
//   //       console.log(`   Service: ${rateReply.serviceType}`);
//   //       console.log(`   Rate: $${shipmentDetails.totalNetFedExCharge}`);
//   //       console.log(`   Transit: ${transitDays} business days`);
//   //       console.log(`   Total Weight: ${totalWeight} lbs`);
//   //       console.log(`   Pallets: ${request.lineItems.length}`);

//   //       return {
//   //         quoteId: `FEDEX-FREIGHT-${Date.now()}`,
//   //         rate: shipmentDetails.totalNetFedExCharge,
//   //         currency: shipmentDetails.currency || "USD",
//   //         transitDays,
//   //         serviceLevel: rateReply.serviceType,
//   //         freightClass: request.lineItems[0]?.freightClass || "85",
//   //         totalWeight,
//   //         numberOfPallets: request.lineItems.length,
//   //       };
//   //     } catch (error: any) {
//   //       const responseTime = Date.now() - startTime;
//   //       console.error("\n🔴 FedEx Freight API Error:", error.message);

//   //       if (error.response) {
//   //         console.error(
//   //           "🔴 Response:",
//   //           JSON.stringify(error.response.data, null, 2),
//   //         );
//   //       }

//   //       return this.getFreightFallbackRate(request, responseTime);
//   //     }
//   //   }
//   async getFreightRate(
//     request: FedExFreightRateRequest,
//   ): Promise<FedExFreightRateResponse> {
//     console.log("\n🚚 FedEx Freight: Processing LTL rate request...");
//     const startTime = Date.now();

//     try {
//       const accessToken = await this.getAccessToken();

//       const totalWeight = request.lineItems.reduce(
//         (sum, item) => sum + item.weight.value,
//         0,
//       );

//       // Build FedEx Freight API request (matching official format)
//       const fedexFreightRequest = {
//         accountNumber: {
//           value: this.accountNumber,
//         },
//         rateRequestControlParameters: {
//           returnTransitTimes: true,
//           servicesNeededOnRateFailure: true,
//           rateSortOrder: "COMMITASCENDING",
//         },
//         freightRequestedShipment: {
//           shipper: {
//             address: {
//               streetLines: [request.origin.address1],
//               city: request.origin.city,
//               stateOrProvinceCode: request.origin.province,
//               postalCode: request.origin.postal_code,
//               countryCode: request.origin.country,
//               residential: false,
//             },
//           },
//           recipient: {
//             address: {
//               streetLines: [request.destination.address1],
//               city: request.destination.city,
//               stateOrProvinceCode: request.destination.province,
//               postalCode: request.destination.postal_code,
//               countryCode: request.destination.country,
//               residential: true,
//             },
//           },
//           serviceType: "FEDEX_FREIGHT_ECONOMY", // or "FEDEX_FREIGHT_PRIORITY"
//           preferredCurrency: "USD",
//           rateRequestType: ["LIST", "ACCOUNT"],
//           shipDateStamp: new Date().toISOString().split("T")[0],
//           totalWeight: totalWeight,
//           freightShipmentDetail: {
//             role: "SHIPPER",
//             accountNumber: {
//               value: this.accountNumber,
//             },
//             totalHandlingUnits: request.lineItems.reduce(
//               (sum, item) => sum + (item.handlingUnits || 1),
//               0,
//             ),
//             lineItem: request.lineItems.map((item, index) => ({
//               id: `${index + 1}`,
//               freightClass: `CLASS_0${item.freightClass.replace(".", "")}`, // e.g., "CLASS_050", "CLASS_0775"
//               handlingUnits: item.handlingUnits || 1,
//               pieces: item.handlingUnits || 1,
//               description: item.description || "Freight Shipment",
//               weight: {
//                 units: item.weight.units,
//                 value: item.weight.value,
//               },
//               dimensions: item.dimensions
//                 ? {
//                     length: item.dimensions.length,
//                     width: item.dimensions.width,
//                     height: item.dimensions.height,
//                     units: item.dimensions.units,
//                   }
//                 : undefined,
//               subPackagingType: item.packagingType || "PALLET",
//             })),
//           },
//           //   shippingChargesPayment: {
//           //     paymentType: "SENDER",
//           //     payor: {
//           //       responsibleParty: {
//           //         accountNumber: { value: this.accountNumber },
//           //         address: {
//           //           streetLines: [request.origin.address1],
//           //           city: request.origin.city,
//           //           stateOrProvinceCode: request.origin.province,
//           //           postalCode: request.origin.postal_code,
//           //           countryCode: request.origin.country,
//           //           residential: false,
//           //         },
//           //         contact: {
//           //           personName: "Shafin MOmin",
//           //           companyName: "Your Company",
//           //           emailAddress: "sasbrandsloop@gmail.com",
//           //           phoneNumber: "832814270",
//           //         },
//           //       },
//           //     },
//           //   },
//         },
//       };

//       console.log("\n📤 Sending FedEx Freight API request...");
//       console.log(JSON.stringify(fedexFreightRequest, null, 2));

//       const response = await axios.post(
//         `${this.apiUrl}/rate/v1/freight/rates/quotes`,
//         // `https://apis-sandbox.fedex.com/rate/v1/freight/rates/quotes`,
//         fedexFreightRequest,
//         {
//           headers: {
//             Authorization: `Bearer ${accessToken}`,
//             "Content-Type": "application/json",
//             "X-locale": "en_US",
//           },
//           timeout: 20000,
//         },
//       );

//       const rateReply = response.data.output.rateReplyDetails[0];
//       const shipmentDetails = rateReply.ratedShipmentDetails[0];

//       const transitDays = this.extractTransitDays(rateReply);

//       const responseTime = Date.now() - startTime;
//       console.log(`\n✅ FedEx Freight Quote Received (${responseTime}ms):`);
//       console.log(`   Service: ${rateReply.serviceType}`);
//       console.log(`   Rate: $${shipmentDetails.totalNetFedExCharge}`);
//       console.log(`   Transit: ${transitDays} business days`);
//       console.log(`   Total Weight: ${totalWeight} lbs`);
//       console.log(`   Pallets: ${request.lineItems.length}`);

//       return {
//         quoteId: `FEDEX-FREIGHT-${Date.now()}`,
//         rate: shipmentDetails.totalNetFedExCharge,
//         currency: shipmentDetails.currency || "USD",
//         transitDays,
//         serviceLevel: rateReply.serviceType,
//         freightClass: request.lineItems[0]?.freightClass || "85",
//         totalWeight,
//         numberOfPallets: request.lineItems.length,
//       };
//     } catch (error: any) {
//       const responseTime = Date.now() - startTime;
//       console.error("\n🔴 FedEx Freight API Error:", error.message);

//       if (error.response) {
//         console.error(
//           "🔴 Response:",
//           JSON.stringify(error.response.data, null, 2),
//         );
//       }

//       return this.getFreightFallbackRate(request, responseTime);
//     }
//   }

//   // =====================================================
//   // CONVERT PARCEL PACKAGES TO LTL FREIGHT
//   // =====================================================

//   async getFreightRateFromPackages(
//     origin: any,
//     destination: any,
//     packages: ConsolidatedPackage[],
//   ): Promise<FedExFreightRateResponse> {
//     console.log("\n🔄 Converting parcel packages to LTL freight...");

//     // Optimize packages into pallets
//     const { pallets, totalWeight } = PalletOptimizer.optimizePallets(packages);

//     const freightRequest: FedExFreightRateRequest = {
//       origin,
//       destination,
//       lineItems: pallets,
//     };

//     return this.getFreightRate(freightRequest);
//   }

//   // =====================================================
//   // HELPER METHODS
//   // =====================================================

//   private extractTransitDays(rateReply: any): number {
//     const transitTime = rateReply.operationalDetail?.transitTime;
//     if (transitTime) {
//       const match = transitTime.match(/\d+/);
//       if (match) return parseInt(match[0]);
//     }

//     const commit = rateReply.commit?.commitTimestamp;
//     if (commit) {
//       const days = Math.ceil(
//         (new Date(commit).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
//       );
//       return Math.max(1, days);
//     }

//     return 5; // Default fallback
//   }

//   private getFreightFallbackRate(
//     request: FedExFreightRateRequest,
//     responseTime: number,
//   ): FedExFreightRateResponse {
//     console.log("\n🟡 Using FedEx Freight fallback calculation...");

//     const totalWeight = request.lineItems.reduce(
//       (sum, item) => sum + item.weight.value,
//       0,
//     );

//     // Fallback calculation based on weight and freight class
//     const avgClass = request.lineItems[0]?.freightClass || "85";
//     const classMultiplier = this.getClassMultiplier(avgClass);

//     // Base rate per hundredweight (CWT)
//     const baseRatePerCWT = 30 * classMultiplier;
//     const cwt = totalWeight / 100;

//     // Discount for higher weight
//     let discount = 1.0;
//     if (totalWeight > 2000) discount = 0.85;
//     else if (totalWeight > 1000) discount = 0.9;
//     else if (totalWeight > 500) discount = 0.95;

//     const estimatedRate = Math.round(cwt * baseRatePerCWT * discount);

//     console.log(`   Estimated rate: $${estimatedRate}`);
//     console.log(`   Total weight: ${totalWeight} lbs`);
//     console.log(`   Freight class: ${avgClass}`);

//     return {
//       quoteId: `FEDEX-FREIGHT-FALLBACK-${Date.now()}`,
//       rate: estimatedRate,
//       currency: "USD",
//       transitDays: 5,
//       serviceLevel: "FEDEX_FREIGHT_ECONOMY (Estimated)",
//       freightClass: avgClass,
//       totalWeight,
//       numberOfPallets: request.lineItems.length,
//     };
//   }

//   private getClassMultiplier(freightClass: string): number {
//     const classNum = parseFloat(freightClass);

//     if (classNum <= 55) return 0.8;
//     if (classNum <= 65) return 0.9;
//     if (classNum <= 77.5) return 1.0;
//     if (classNum <= 92.5) return 1.1;
//     if (classNum <= 110) return 1.2;
//     if (classNum <= 150) return 1.4;
//     if (classNum <= 200) return 1.6;
//     return 1.8;
//   }
// }

// // =====================================================
// // INTEGRATION WITH EXISTING FEDEX CLIENT
// // =====================================================

// export class FedExClientWithFreight extends FedExClient {
//   private freightClient: FedExFreightClient;

//   constructor() {
//     super();
//     this.freightClient = new FedExFreightClient();
//   }

//   /**
//    * Enhanced rate method that automatically uses LTL when appropriate
//    */
//   async getSmartRate(request: FedExRateRequest): Promise<any> {
//     console.log("\n🔍 Analyzing shipment for optimal shipping method...");

//     // Process items as usual
//     const processed = this.processShopifyItems(request.items as any);
//     const packages = this.consolidatePackages(processed);

//     // Check if LTL is recommended
//     const shouldUseLTL = LTLDetector.shouldUseLTL(packages);

//     if (shouldUseLTL) {
//       console.log("\n📦 → 🚚 Switching to LTL Freight for better rates...");

//       // Get both parcel and freight quotes for comparison
//       const parcelQuotePromise = super.getSplitShipmentRate(request as any);
//       const freightQuotePromise = this.freightClient.getFreightRateFromPackages(
//         request.origin,
//         request.destination,
//         packages,
//       );

//       const [parcelQuote, freightQuote] = await Promise.all([
//         parcelQuotePromise,
//         freightQuotePromise,
//       ]);

//       const savings = parcelQuote.rate - freightQuote.rate;

//       console.log("\n💰 RATE COMPARISON:");
//       console.log(`   Parcel shipping: $${parcelQuote.rate.toFixed(2)}`);
//       console.log(`   LTL Freight: $${freightQuote.rate.toFixed(2)}`);
//       console.log(
//         `   Savings: $${savings.toFixed(2)} (${((savings / parcelQuote.rate) * 100).toFixed(1)}%)`,
//       );

//       if (freightQuote.rate < parcelQuote.rate) {
//         console.log("\n✅ RECOMMENDED: Use LTL Freight");
//         return {
//           ...freightQuote,
//           estimatedSavings: savings,
//         };
//       } else {
//         console.log("\n✅ RECOMMENDED: Use Parcel Shipping");
//         return parcelQuote;
//       }
//     }

//     // Use standard parcel shipping
//     console.log("\n📦 Using standard parcel shipping");
//     return super.getSplitShipmentRate(request as any);
//   }
// }

// export { FreightClassCalculator, PalletOptimizer };

// export type {
//   FedExFreightRateRequest,
//   FedExFreightRateResponse,
//   FreightLineItem,
// };
