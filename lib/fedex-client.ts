// import axios from 'axios';

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
//   transitDays: number;
//   serviceLevel: string;
//   currency: string;
//   packages: number;
// }

// export class FedExClient {
//   private apiUrl: string;
//   private apiKey: string;
//   private accountNumber: string;

//   constructor() {
//     this.apiUrl = process.env.FEDEX_API_URL || 'https://apis.fedex.com/ship/v1';
//     this.apiKey = process.env.FEDEX_API_KEY || '';
//     this.accountNumber = process.env.FEDEX_ACCOUNT_NUMBER || '';
//   }

//   async getSplitShipmentRate(request: FedExRateRequest): Promise<FedExRateResponse> {
//     const startTime = Date.now();

//     try {
//       // Calculate number of packages needed
//       // Each package must be under 150 lbs
//       const MAX_PACKAGE_WEIGHT = 150;
//       let totalPackages = 0;
//       let totalRate = 0;

//       const packageDetails = [];

//       for (const item of request.items) {
//         const perItemWeight = item.perItemWeight;
//         const quantity = item.quantity;

//         // If per-item weight < 150, each item is a separate package
//         if (perItemWeight < MAX_PACKAGE_WEIGHT) {
//           totalPackages += quantity;

//           // Each package details
//           for (let i = 0; i < quantity; i++) {
//             packageDetails.push({
//               weight: perItemWeight,
//               dimensions: {
//                 length: item.length,
//                 width: item.width,
//                 height: item.height
//               }
//             });
//           }
//         }
//       }

//       console.log(`🟢 FedEx: Splitting into ${totalPackages} packages`);

//       // Prepare FedEx API request for rate quote
//       const fedexRequest = {
//         accountNumber: {
//           value: this.accountNumber
//         },
//         requestedShipment: {
//           shipper: {
//             address: {
//               postalCode: request.origin.postalCode,
//               countryCode: request.origin.country
//             }
//           },
//           recipient: {
//             address: {
//               postalCode: request.destination.postalCode,
//               city: request.destination.city,
//               stateOrProvinceCode: request.destination.province,
//               countryCode: request.destination.country
//             }
//           },
//           pickupType: 'USE_SCHEDULED_PICKUP',
//           serviceType: 'FEDEX_FREIGHT_ECONOMY',
//           packagingType: 'YOUR_PACKAGING',
//           requestedPackageLineItems: packageDetails.map(pkg => ({
//             weight: {
//               units: 'LB',
//               value: pkg.weight
//             },
//             dimensions: {
//               length: Math.ceil(pkg.dimensions.length),
//               width: Math.ceil(pkg.dimensions.width),
//               height: Math.ceil(pkg.dimensions.height),
//               units: 'IN'
//             }
//           }))
//         }
//       };

//       // Make API call to FedEx
//       const response = await axios.post(
//         `${this.apiUrl}/rates/quotes`,
//         fedexRequest,
//         {
//           headers: {
//             'Authorization': `Bearer ${this.apiKey}`,
//             'Content-Type': 'application/json',
//             'X-locale': 'en_US'
//           },
//           timeout: 6000 // 6 second timeout
//         }
//       );

//       const responseTime = Date.now() - startTime;
//       console.log(`🟢 FedEx API response time: ${responseTime}ms`);

//       // Parse FedEx response
//       if (response.data && response.data.output && response.data.output.rateReplyDetails) {
//         const rateDetails = response.data.output.rateReplyDetails[0];
//         const ratedShipmentDetails = rateDetails.ratedShipmentDetails[0];

//         return {
//           quoteId: `FEDEX-${Date.now()}`,
//           rate: parseFloat(ratedShipmentDetails.totalNetCharge || 0),
//           transitDays: parseInt(rateDetails.commit?.transitDays || 5),
//           serviceLevel: rateDetails.serviceType || 'Freight Economy',
//           currency: ratedShipmentDetails.currency || 'USD',
//           packages: totalPackages
//         };
//       }

//       throw new Error('Invalid FedEx API response');

//     } catch (error: any) {
//       const responseTime = Date.now() - startTime;
//       console.error('🔴 FedEx API Error:', error.message);

//       // Return fallback rate if FedEx fails
//       return this.getFallbackRate(request, responseTime);
//     }
//   }

//   // Fallback rate calculation if FedEx API fails
//   private getFallbackRate(request: FedExRateRequest, responseTime: number): FedExRateResponse {
//     console.log('🟢 Using FedEx fallback rate calculation');

//     // Calculate total packages
//     let totalPackages = 0;
//     let totalWeight = 0;

//     for (const item of request.items) {
//       if (item.perItemWeight < 150) {
//         totalPackages += item.quantity;
//         totalWeight += item.totalWeight;
//       }
//     }

//     // Simple rate estimation
//     // Base rate per package + per pound rate
//     const baseRatePerPackage = 75;
//     const perLbRate = 0.35;
//     const estimatedRate = (totalPackages * baseRatePerPackage) + (totalWeight * perLbRate);

//     return {
//       quoteId: `FEDEX-FALLBACK-${Date.now()}`,
//       rate: Math.round(estimatedRate * 100) / 100,
//       transitDays: 5,
//       serviceLevel: 'Freight Economy (Estimated)',
//       currency: 'USD',
//       packages: totalPackages
//     };
//   }
// }

// export default FedExClient;

// lib/fedex-client.ts - COMPLETE UPDATED VERSION

import axios from "axios";

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

interface FedExRateRequest {
  origin: {
    country: string;
    postal_code: string;
    province: string;
    city: string;
    address1: string;
    phone: string;
    company_name?: string;
  };
  destination: {
    country: string;
    postal_code: string;
    province: string;
    city: string;
    address1: string;
    phone?: string;
    company_name?: string;
  };
  items: ShopifyItem[];
  currency: string;
  totalWeight: number;
}

interface FedExRateResponse {
  quoteId: string;
  rate: number;
  transitDays: number;
  serviceLevel: string;
  currency: string;
  packages: number;
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

// =====================================================
// FEDEX CLIENT
// =====================================================
// export class FedExClient {
//   private apiUrl =
//     process.env.FEDEX_API_URL || "https://apis-sandbox.fedex.com";
//   private clientId = process.env.FEDEX_CLIENT_ID || "";
//   private clientSecret = process.env.FEDEX_CLIENT_SECRET || "";
//   private accountNumber = process.env.FEDEX_ACCOUNT_NUMBER || "";

//   private accessToken: string | null = null;
//   private tokenExpiry = 0;

//   // =====================================================
//   // OAUTH TOKEN
//   // =====================================================
//   private async getAccessToken(): Promise<any> {
//     if (this.accessToken && Date.now() < this.tokenExpiry) {
//       return this.accessToken;
//     }

//     const res = await axios.post(
//       `${this.apiUrl}/oauth/token`,
//       new URLSearchParams({
//         grant_type: "client_credentials",
//         client_id: this.clientId,
//         client_secret: this.clientSecret,
//       }),
//       { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
//     );

//     this.accessToken = res.data.access_token;
//     this.tokenExpiry = Date.now() + 55 * 60 * 1000;
//     return this.accessToken;
//   }

//   // =====================================================
//   // HELPERS
//   // =====================================================
//   private extractThickness(name: string): number {
//     const frac = name.match(/(\d+)\s*\/\s*(\d+)/);
//     if (frac) return Number(frac[1]) / Number(frac[2]);

//     const mm = name.match(/(\d+(?:\.\d+)?)\s*mm/i);
//     if (mm) return Number(mm[1]) / 25.4;

//     return 0.25;
//   }

//   private getProductType(item: ShopifyItem): "ROLL" | "MAT" | "TILE" {
//     if (
//       Number(item.properties?.["Width (ft)"]) > 0 &&
//       Number(item.properties?.["Length (ft)"]) > 0
//     )
//       return "ROLL";

//     if (item.name.toLowerCase().includes("mat")) return "MAT";
//     return "TILE";
//   }

//   private calculateRollDiameter(
//     thicknessIn: number,
//     lengthFt: number,
//     core = 4
//   ): number {
//     return Math.sqrt(core ** 2 + (4 * thicknessIn * lengthFt * 12) / Math.PI);
//   }

//   // =====================================================
//   // PROCESS ITEMS (OPTIMIZED)
//   // =====================================================
//   private processItems(items: ShopifyItem[]) {
//     const packages: any[] = [];

//     for (const item of items) {
//       const type = this.getProductType(item);
//       const thickness = this.extractThickness(item.name);
//       const qty = Number(item.properties?.Quantity || item.quantity);

//       const unitWeight = item.properties?.Weight
//         ? Number(item.properties.Weight)
//         : Number((item.grams / 453.592).toFixed(2));

//       let length = 24;
//       let width = 24;
//       let height = 2;

//       if (type === "ROLL") {
//         const wFt = Number(item.properties?.["Width (ft)"] || 4);
//         const lFt = Number(item.properties?.["Length (ft)"] || 10);
//         const dia = Math.ceil(this.calculateRollDiameter(thickness, lFt));

//         length = wFt * 12;
//         width = dia;
//         height = dia;
//       }

//       if (type === "MAT") {
//         length = 36;
//         width = 48;
//         height = 6;
//       }

//       if (type === "TILE") {
//         height = Math.max(thickness * qty, 2);
//       }

//       // ✅ GROUP ITEMS INTO FEWER BOXES (MAX 70 LBS PER BOX)
//       const maxBoxWeight = 70;
//       let remainingQty = qty;

//       while (remainingQty > 0) {
//         const fitQty = Math.min(
//           remainingQty,
//           Math.floor(maxBoxWeight / unitWeight)
//         );

//         packages.push({
//           weight: Number((unitWeight * fitQty).toFixed(1)),
//           dimensions: {
//             length: Math.ceil(length),
//             width: Math.ceil(width),
//             height: Math.ceil(height),
//             units: "IN",
//           },
//         });

//         remainingQty -= fitQty;
//       }
//     }

//     return packages;
//   }

//   // =====================================================
//   // MAIN RATE FUNCTION
//   // =====================================================
//   async getSplitShipmentRate(
//     request: FedExRateRequest
//   ): Promise<FedExRateResponse> {
//     const packages = this.processItems(request.items);
//     console.log("packages================================>",packages)
//     const token =
//       "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzY29wZSI6WyJDWFMtVFAiXSwiUGF5bG9hZCI6eyJjbGllbnRJZGVudGl0eSI6eyJjbGllbnRLZXkiOiJsN2YyYzRhMzk5Y2YxYzQxZGU4MmU1ZTA3M2IwOWFlZTc2In0sImF1dGhlbnRpY2F0aW9uUmVhbG0iOiJDTUFDIiwiYWRkaXRpb25hbElkZW50aXR5Ijp7InRpbWVTdGFtcCI6IjA5LUphbi0yMDI2IDA1OjA5OjQ1IEVTVCIsImdyYW50X3R5cGUiOiJjbGllbnRfY3JlZGVudGlhbHMiLCJhcGltb2RlIjoiU2FuZGJveCIsImN4c0lzcyI6Imh0dHBzOi8vY3hzYXV0aHNlcnZlci1zdGFnaW5nLmFwcC5wYWFzLmZlZGV4LmNvbS90b2tlbi9vYXV0aDIifSwicGVyc29uYVR5cGUiOiJEaXJlY3RJbnRlZ3JhdG9yX0IyQiJ9LCJleHAiOjE3Njc5NTY5ODUsImp0aSI6IjQ4N2QzOTc1LTRjZDAtNGMwZC04OGNhLTA0Njk5MzI1OTJmMyJ9.CQMPUh7HZ4q-42gmIqZVD5d_h01yzyFr50hDHSbGsrNUI1b4h2N9rn3mapQMyvaLorbmZtWVi_vphBPI1Flu5FVosflPPAJKTL94dBkdgOM1vOCSLcIenkQS7iauqCzmZ5gNjq4zW7TEpRQgaBPndtewgAzb9EJGar-ZhEJ-Kwz3l8uS5WI0m4PYN-Wfw6jtTDMrnfDz_4mp81adugD-568ai9vZGg9KWSvWrHrJMoagrPYCGL2Z-iw5wFIKeB5CCcpLE4fDaP9kbsBgmKiWcZhTc4cLDHQ1W6jYXvQ8BvCAevuMvA1OfAi0TbNIh0Rg0MhfVWG0D6sEd2yEvqxk_QURbvmK-2BcG6YCfSbBvh8J8IYcvvKLPzvGrmEfKh9UnLh5N3gAXrMZv-YV3nho-Lqmip08r-npEN4R7m3DaCMjSdr9_95ktt7xoo_hSK61KlAVBpqWLrkQnxKi1Dliof9dSuEb7hEEu9HpcwN_2q7p8Q6cQLqJTwewGx9kVkTOyaVwiSm_tV5tKMHUFsmZ84796Whx5RhzNEXlOy5Xyr4hae2q2otRBagU1DozI4pk3dqd0xXg6JKFvI2IsOXb6Tf9qqjnKYsd6mriEqX99J5pj8ZhF-QDmWrKOUTTZl-NAvxOIpar_orc6yR2S6X0fvHERLzeA0HeOAqddP6OTIw";

//     const fedexRequest = {
//       accountNumber: { value: this.accountNumber },
//       requestedShipment: {
//         shipDateStamp: new Date().toISOString().split("T")[0],
//         pickupType: "DROPOFF_AT_FEDEX_LOCATION",
//         serviceType: "FEDEX_GROUND",
//         packagingType: "YOUR_PACKAGING",
//         preferredCurrency: "USD",
//         rateRequestType: ["LIST", "ACCOUNT"],
//         shipper: {
//           address: {
//             streetLines: [request.origin.address1],
//             city: request.origin.city,
//             stateOrProvinceCode: request.origin.province,
//             postalCode: request.origin.postal_code,
//             countryCode: request.origin.country,
//           },
//         },
//         recipient: {
//           address: {
//             streetLines: [request.destination.address1],
//             city: request.destination.city,
//             stateOrProvinceCode: request.destination.province,
//             postalCode: request.destination.postal_code,
//             countryCode: request.destination.country,
//           },
//         },
//         requestedPackageLineItems: packages.map((p, i) => ({
//           sequenceNumber: i + 1,
//           groupPackageCount: 1,
//           weight: { units: "LB", value: p.weight },
//           // dimensions: p.dimensions,
//         })),
//       },
//     };

//     console.log(
//       "🟢 FedEx Request Payload:",
//       JSON.stringify(fedexRequest, null, 2)
//     );

//     const res = await axios.post(
//       `${this.apiUrl}/rate/v1/rates/quotes`,
//       fedexRequest,
//       {
//         headers: {
//           Authorization: `Bearer ${token}`,
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     // ✅ PICK CHEAPEST RATE
//     const details = res.data.output.rateReplyDetails;
//     let cheapest = null;

//     for (const d of details) {
//       for (const r of d.ratedShipmentDetails) {
//         if (!cheapest || r.totalNetFedExCharge < cheapest.totalNetFedExCharge) {
//           cheapest = r;
//         }
//       }
//     }

//     return {
//       quoteId: `FEDEX-${Date.now()}`,
//       rate: cheapest.totalNetFedExCharge,
//       currency: cheapest.currency,
//       serviceLevel: "FEDEX_GROUND",
//       transitDays: 5,
//       packages: packages.length,
//     };
//   }
// }

// export default FedExClient;

/* ===================== TYPES ============================================================================ */

// type ProductType = "ROLL" | "MAT" | "TILE";

// interface ProcessedItem {
//   name: string;
//   type: ProductType;
//   weight: number; // per unit
//   quantity: number;
//   length: number;
//   width: number;
//   height: number;
// }

// /* ===================== CLIENT ===================== */

// export class FedExClient {
//   private apiUrl =
//     process.env.FEDEX_API_URL || "https://apis-sandbox.fedex.com";
//   private clientId = process.env.FEDEX_CLIENT_ID || "";
//   private clientSecret = process.env.FEDEX_CLIENT_SECRET || "";
//   private accountNumber = process.env.FEDEX_ACCOUNT_NUMBER || "";

//   private token: string | null = null;
//   private tokenExpiry = 0;

//   /* ===================== AUTH ===================== */

//   private async getAccessToken(): Promise<any> {
//     if (this.token && Date.now() < this.tokenExpiry) return this.token;

//     const res = await axios.post(
//       `${this.apiUrl}/oauth/token`,
//       new URLSearchParams({
//         grant_type: "client_credentials",
//         client_id: this.clientId,
//         client_secret: this.clientSecret,
//       }),
//       { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
//     );

//     this.token = res.data.access_token;
//     this.tokenExpiry = Date.now() + 55 * 60 * 1000;
//     return this.token;
//   }

//   /* ===================== HELPERS ===================== */

//   private extractThickness(name: string): number {
//     const frac = name.match(/(\d+)\s*\/\s*(\d+)/);
//     if (frac) return Number(frac[1]) / Number(frac[2]);

//     const mm = name.match(/(\d+(?:\.\d+)?)\s*mm/i);
//     if (mm) return Number(mm[1]) / 25.4;

//     return 0.25;
//   }

//   private getProductType(item: ShopifyItem): ProductType {
//     if (
//       Number(item.properties?.["Width (ft)"]) > 0 &&
//       Number(item.properties?.["Length (ft)"]) > 0
//     )
//       return "ROLL";

//     if (item.name.toLowerCase().includes("mat")) return "MAT";
//     return "TILE";
//   }

//   private calculateRollDiameter(
//     thicknessIn: number,
//     lengthFt: number,
//     core = 4
//   ): number {
//     return Math.sqrt(core ** 2 + (4 * thicknessIn * lengthFt * 12) / Math.PI);
//   }

//   /* ===================== PROCESS ITEMS ===================== */

//   private processItems(items: any[]): any[] {
//     const result: any[] = [];

//     for (const item of items) {
//       const type = this.getProductType(item);
//       const thickness = this.extractThickness(item.name);
//       const quantity = Number(item.properties?.Quantity || item.quantity);

//       const unitWeight = item.properties?.Weight
//         ? Number(item.properties.Weight)
//         : Number((item.grams / 453.592).toFixed(2));

//       let length = 24;
//       let width = 24;
//       let height = 2;

//       if (type === "ROLL") {
//         const wFt = Number(item.properties?.["Width (ft)"] || 4);
//         const lFt = Number(item.properties?.["Length (ft)"] || 10);
//         const dia = Math.ceil(this.calculateRollDiameter(thickness, lFt));

//         length = wFt * 12;
//         width = dia;
//         height = dia;
//       }

//       if (type === "MAT") {
//         length = 24;
//         width = 36;
//         height = 6;
//       }

//       if (type === "TILE") {
//         height = Math.max(thickness, 2);
//       }

//       result.push({
//         name: item.name,
//         type,
//         weight: unitWeight,
//         quantity,
//         length: Math.ceil(length),
//         width: Math.ceil(width),
//         height: Math.ceil(height),
//       });
//     }

//     return result;
//   }

//   /* ===================== PACK GROUPING ===================== */

//   private getPackKey(item: ProcessedItem): string {
//     return `${item.type}-${item.length}x${item.width}x${item.height}`;
//   }

//   private buildPackages(processed: ProcessedItem[]) {
//     const MAX_BOX_WEIGHT = 70;
//     const packages: any[] = [];

//     const groups = new Map<string, ProcessedItem[]>();

//     for (const item of processed) {
//       const key = this.getPackKey(item);
//       if (!groups.has(key)) groups.set(key, []);
//       groups.get(key)!.push(item);
//     }

//     for (const [, items] of groups) {
//       let currentBox: any = null;
//       let boxWeight = 0;

//       for (const item of items) {
//         for (let i = 0; i < item.quantity; i++) {
//           if (!currentBox || boxWeight + item.weight > MAX_BOX_WEIGHT) {
//             currentBox = {
//               weight: 0,
//               dimensions: {
//                 length: item.length,
//                 width: item.width,
//                 height: item.height,
//                 units: "IN",
//               },
//             };
//             packages.push(currentBox);
//             boxWeight = 0;
//           }

//           currentBox.weight += item.weight;
//           boxWeight += item.weight;
//         }
//       }
//     }

//     return packages.map((p) => ({
//       weight: Number(p.weight.toFixed(1)),
//       dimensions: p.dimensions,
//     }));
//   }

//   /* ===================== MAIN RATE ===================== */

//   async getSplitShipmentRate(
//     request: FedExRateRequest
//   ): Promise<FedExRateResponse> {
//     const processed = this.processItems(request.items);
//     const packages = this.buildPackages(processed);
//     const token =
//       "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzY29wZSI6WyJDWFMtVFAiXSwiUGF5bG9hZCI6eyJjbGllbnRJZGVudGl0eSI6eyJjbGllbnRLZXkiOiJsN2YyYzRhMzk5Y2YxYzQxZGU4MmU1ZTA3M2IwOWFlZTc2In0sImF1dGhlbnRpY2F0aW9uUmVhbG0iOiJDTUFDIiwiYWRkaXRpb25hbElkZW50aXR5Ijp7InRpbWVTdGFtcCI6IjA5LUphbi0yMDI2IDA1OjA5OjQ1IEVTVCIsImdyYW50X3R5cGUiOiJjbGllbnRfY3JlZGVudGlhbHMiLCJhcGltb2RlIjoiU2FuZGJveCIsImN4c0lzcyI6Imh0dHBzOi8vY3hzYXV0aHNlcnZlci1zdGFnaW5nLmFwcC5wYWFzLmZlZGV4LmNvbS90b2tlbi9vYXV0aDIifSwicGVyc29uYVR5cGUiOiJEaXJlY3RJbnRlZ3JhdG9yX0IyQiJ9LCJleHAiOjE3Njc5NTY5ODUsImp0aSI6IjQ4N2QzOTc1LTRjZDAtNGMwZC04OGNhLTA0Njk5MzI1OTJmMyJ9.CQMPUh7HZ4q-42gmIqZVD5d_h01yzyFr50hDHSbGsrNUI1b4h2N9rn3mapQMyvaLorbmZtWVi_vphBPI1Flu5FVosflPPAJKTL94dBkdgOM1vOCSLcIenkQS7iauqCzmZ5gNjq4zW7TEpRQgaBPndtewgAzb9EJGar-ZhEJ-Kwz3l8uS5WI0m4PYN-Wfw6jtTDMrnfDz_4mp81adugD-568ai9vZGg9KWSvWrHrJMoagrPYCGL2Z-iw5wFIKeB5CCcpLE4fDaP9kbsBgmKiWcZhTc4cLDHQ1W6jYXvQ8BvCAevuMvA1OfAi0TbNIh0Rg0MhfVWG0D6sEd2yEvqxk_QURbvmK-2BcG6YCfSbBvh8J8IYcvvKLPzvGrmEfKh9UnLh5N3gAXrMZv-YV3nho-Lqmip08r-npEN4R7m3DaCMjSdr9_95ktt7xoo_hSK61KlAVBpqWLrkQnxKi1Dliof9dSuEb7hEEu9HpcwN_2q7p8Q6cQLqJTwewGx9kVkTOyaVwiSm_tV5tKMHUFsmZ84796Whx5RhzNEXlOy5Xyr4hae2q2otRBagU1DozI4pk3dqd0xXg6JKFvI2IsOXb6Tf9qqjnKYsd6mriEqX99J5pj8ZhF-QDmWrKOUTTZl-NAvxOIpar_orc6yR2S6X0fvHERLzeA0HeOAqddP6OTIw";

//     const payload = {
//       accountNumber: { value: this.accountNumber },
//       rateRequestControlParameters: {
//         returnTransitTimes: true,
//       },
//       requestedShipment: {
//         shipDateStamp: new Date().toISOString().split("T")[0],
//         pickupType: "DROPOFF_AT_FEDEX_LOCATION",
//         serviceType: "FEDEX_GROUND",
//         packagingType: "YOUR_PACKAGING",
//         preferredCurrency: "USD",
//         rateRequestType: ["LIST", "ACCOUNT"],
//         shipper: {
//           address: {
//             streetLines: [request.origin.address1],
//             city: request.origin.city,
//             stateOrProvinceCode: request.origin.province,
//             postalCode: request.origin.postal_code,
//             countryCode: request.origin.country,
//           },
//         },
//         recipient: {
//           address: {
//             streetLines: [request.destination.address1],
//             city: request.destination.city,
//             stateOrProvinceCode: request.destination.province,
//             postalCode: request.destination.postal_code,
//             countryCode: request.destination.country,
//           },
//         },
//         requestedPackageLineItems: packages.map((p, i) => ({
//           sequenceNumber: i + 1,
//           groupPackageCount: 1,
//           weight: { units: "LB", value: p.weight },
//           // dimensions: p.dimensions,
//         })),
//       },
//     };

//     console.log("🟢 FedEx Request Payload:", JSON.stringify(payload, null, 2));

//     const res = await axios.post(
//       `${this.apiUrl}/rate/v1/rates/quotes`,
//       payload,
//       {
//         headers: {
//           Authorization: `Bearer ${token}`,
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     let cheapest: any = null;

//     for (const d of res.data.output.rateReplyDetails) {
//       for (const r of d.ratedShipmentDetails) {
//         if (!cheapest || r.totalNetFedExCharge < cheapest.totalNetFedExCharge) {
//           cheapest = r;
//         }
//       }
//     }

//     return {
//       quoteId: `FEDEX-${Date.now()}`,
//       rate: cheapest.totalNetFedExCharge,
//       currency: cheapest.currency,
//       serviceLevel: "FEDEX_GROUND",
//       transitDays: 5,
//       packages: packages.length,
//     };
//   }
// }

// export default FedExClient;

/* ======================================================================================================== */

export class FedExClient {
  private apiUrl =
    process.env.FEDEX_API_URL || "https://apis-sandbox.fedex.com";
  private clientId =
    process.env.FEDEX_CLIENT_ID || "l7f2c4a399cf1c41de82e5e073b09aee76";
  private clientSecret =
    process.env.FEDEX_CLIENT_SECRET || "a970d01815e240e78c7af85b6a752b93";
  private accountNumber = process.env.FEDEX_ACCOUNT_NUMBER || "";

  private accessToken: string | null = null;
  private tokenExpiry = 0;

  // =====================================================
  // OAUTH TOKEN
  // =====================================================

  private async getAccessToken(): Promise<any> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    if (!this.clientId || !this.clientSecret) {
      throw new Error("FedEx credentials missing (CLIENT_ID / CLIENT_SECRET)");
    }

    console.log("🟢 Requesting FedEx OAuth token...");

    const response = await axios.post(
      `${this.apiUrl}/oauth/token`,
      new URLSearchParams({
        grant_type: "client_credentials",
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    this.accessToken = response.data.access_token;
    this.tokenExpiry = Date.now() + 55 * 60 * 1000;

    console.log("🟢 FedEx OAuth token obtained");
    return this.accessToken;
  }

  // =====================================================
  // HELPER: Extract thickness from product name
  // =====================================================

  private extractThickness(name: string): number {
    if (!name) return 0.25; // Default to 1/4"

    // 1️⃣ Try fraction like 1/4"
    const fractionMatch = name.match(/\b(\d+)\s*\/\s*(\d+)(?=")?/);
    if (fractionMatch) {
      const num = Number(fractionMatch[1]);
      const den = Number(fractionMatch[2]);
      return num / den;
    }

    // 2️⃣ Try mm like 8mm
    const mmMatch = name.match(/\b(\d+(?:\.\d+)?)\s*mm\b/i);
    if (mmMatch) {
      const mm = Number(mmMatch[1]);
      return mm / 25.4; // mm → inches
    }

    return 0.25; // Safe default
  }

  // =====================================================
  // HELPER: Extract dimensions from name
  // =====================================================

  private extractDimensionsFromName(
    name: string
  ): { width: number; length: number } | null {
    // Try patterns like "4'x3'", "4x6", "24\"x24\"", "48x120"

    // Pattern 1: feet with quotes (4'x3')
    const feetMatch = name.match(/(\d+)'\s*x\s*(\d+)'/i);
    if (feetMatch) {
      return { width: Number(feetMatch[1]), length: Number(feetMatch[2]) };
    }

    // Pattern 2: inches with quotes (24"x24")
    const inchMatch = name.match(/(\d+)"\s*x\s*(\d+)"/i);
    if (inchMatch) {
      return {
        width: Number(inchMatch[1]) / 12, // Convert to feet
        length: Number(inchMatch[2]) / 12,
      };
    }

    // Pattern 3: no units (assume inches for tiles, feet for mats)
    const plainMatch = name.match(/(\d+)\s*x\s*(\d+)/i);
    if (plainMatch) {
      const val1 = Number(plainMatch[1]);
      const val2 = Number(plainMatch[2]);

      // If values are small (< 10), likely feet (mats)
      // If values are larger (>= 10), likely inches (tiles)
      if (val1 < 10 && val2 < 10) {
        return { width: val1, length: val2 }; // Already in feet
      } else {
        return {
          width: val1 / 12, // Convert inches to feet
          length: val2 / 12,
        };
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
    coreDiameterIn = 4
  ): number {
    const lengthIn = lengthFt * 12;
    return Math.sqrt(
      Math.pow(coreDiameterIn, 2) + (4 * thicknessIn * lengthIn) / Math.PI
    );
  }

  // =====================================================
  // HELPER: Determine product type
  // =====================================================

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
  // PROCESS SHOPIFY ITEMS
  // =====================================================

  private processShopifyItems(items: ShopifyItem[]): ProcessedItem[] {
    const processedItems: ProcessedItem[] = [];

    for (const item of items) {
      const type = this.getProductType(item);

      // ========================================
      // EXTRACT WEIGHT
      // ========================================
      let perItemWeight = 0;

      if (item.properties?.Weight) {
        perItemWeight = Number(item.properties.Weight);
      } else {
        // Fallback: grams to lbs
        perItemWeight = Number((item.grams / 453.592).toFixed(2));
      }

      // ========================================
      // EXTRACT QUANTITY
      // ========================================
      const isEmptyProperties =
        !item.properties ||
        (typeof item.properties === "object" &&
          Object.keys(item.properties).length === 0);

      const quantity = isEmptyProperties
        ? item.quantity
        : Number(item.properties.Quantity || item.quantity);

      // ========================================
      // EXTRACT DIMENSIONS BY TYPE
      // ========================================
      let length = 48; // inches (default)
      let width = 48;
      let height = 8;

      const thickness = this.extractThickness(item.name);

      if (type === "ROLL") {
        // ✅ ROLL: Custom dimensions from properties
        const rollWidthFt = Number(item.properties?.["Width (ft)"] || 4);
        const rollLengthFt = Number(item.properties?.["Length (ft)"] || 10);

        // Roll dimensions for FedEx (lying on side)
        const rollDiameter = Math.ceil(
          this.calculateRollDiameter(thickness, rollLengthFt)
        );

        length = rollWidthFt * 12; // Convert feet to inches (roll length)
        width = rollDiameter; // Diameter
        height = rollDiameter; // Diameter

        console.log(`🟢 ROLL: ${item.name}`);
        console.log(`   Thickness: ${thickness}"`);
        console.log(`   Roll: ${rollWidthFt}' wide × ${rollLengthFt}' long`);
        console.log(`   Calculated diameter: ${rollDiameter}"`);
        console.log(
          `   Package dimensions: ${length}" × ${width}" × ${height}"`
        );
      } else if (type === "MAT") {
        // ✅ MAT: Extract from name, folded for shipping
        const dims = this.extractDimensionsFromName(item.name);

        if (dims) {
          // Mats are folded in half for shipping
          length = (dims.length * 12) / 2; // Folded length in inches
          width = dims.width * 12; // Width in inches
          height = 6; // Folded height (stacked)
        } else {
          // Default mat dimensions (4'x6' folded)
          length = (6 * 12) / 2; // 36"
          width = 4 * 12; // 48"
          height = 6;
        }

        console.log(`🟢 MAT: ${item.name}`);
        console.log(`   Thickness: ${thickness}"`);
        console.log(
          `   Original size: ${dims?.width || 4}' × ${dims?.length || 6}'`
        );
        console.log(
          `   Folded dimensions: ${length}" × ${width}" × ${height}"`
        );
      } else {
        // ✅ TILE: Extract from name
        const dims = this.extractDimensionsFromName(item.name);

        if (dims) {
          length = dims.length * 12; // Convert feet to inches
          width = dims.width * 12;
          height = thickness; // Tile thickness
        } else {
          // Default tile (24"×24")
          length = 24;
          width = 24;
          height = thickness;
        }

        console.log(`🟢 TILE: ${item.name}`);
        console.log(`   Thickness: ${thickness}"`);
        console.log(
          `   Tile size: ${dims?.width || 2}' × ${dims?.length || 2}'`
        );
        console.log(
          `   Package dimensions: ${length}" × ${width}" × ${height}"`
        );
      }

      // ========================================
      // ADD TO PROCESSED ITEMS
      // ========================================
      processedItems.push({
        weight: perItemWeight,
        totalWeight: perItemWeight * quantity,
        length,
        width,
        height,
        quantity,
        name: item.name,
        type,
      });

      console.log(
        `   Weight: ${perItemWeight} lbs × ${quantity} = ${
          perItemWeight * quantity
        } lbs`
      );
    }

    return processedItems;
  }

  // =====================================================
  // MAIN RATE FUNCTION
  // =====================================================

  async getSplitShipmentRate(
    request: FedExRateRequest
  ): Promise<FedExRateResponse> {
    console.log("🟢 FedEx: Processing rate request...");
    const startTime = Date.now();

    try {
      const processed = this.processShopifyItems(request.items);
      const packages: any[] = [];

      // ========================================
      // BUILD PACKAGE LIST
      // ========================================
      for (const item of processed) {
        if (item.weight > 150) {
          throw new Error(
            `FedEx parcel limit exceeded: ${item.weight} lbs for ${item.name}`
          );
        }

        // Each item becomes a separate package
        for (let i = 0; i < item.quantity; i++) {
          packages.push({
            weight: item.weight,
            dimensions: {
              length: item.length,
              width: item.width,
              height: item.height,
            },
            itemName: item.name,
          });
        }
      }

      console.log(
        `🟢 FedEx: ${packages.length} packages, ${processed
          .reduce((sum, p) => sum + p.totalWeight, 0)
          .toFixed(2)} lbs total`
      );

      if (packages.length === 0) {
        throw new Error("No packages to ship");
      }

      // console.log("packages===========================================>",packages)

      // ========================================
      // GET OAUTH TOKEN
      // ========================================
      // const accessToken = await this.getAccessToken();
      const accessToken =
        "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzY29wZSI6WyJDWFMtVFAiXSwiUGF5bG9hZCI6eyJjbGllbnRJZGVudGl0eSI6eyJjbGllbnRLZXkiOiJsN2YyYzRhMzk5Y2YxYzQxZGU4MmU1ZTA3M2IwOWFlZTc2In0sImF1dGhlbnRpY2F0aW9uUmVhbG0iOiJDTUFDIiwiYWRkaXRpb25hbElkZW50aXR5Ijp7InRpbWVTdGFtcCI6IjEzLUphbi0yMDI2IDAxOjIyOjI5IEVTVCIsImdyYW50X3R5cGUiOiJjbGllbnRfY3JlZGVudGlhbHMiLCJhcGltb2RlIjoiU2FuZGJveCIsImN4c0lzcyI6Imh0dHBzOi8vY3hzYXV0aHNlcnZlci1zdGFnaW5nLmFwcC5wYWFzLmZlZGV4LmNvbS90b2tlbi9vYXV0aDIifSwicGVyc29uYVR5cGUiOiJEaXJlY3RJbnRlZ3JhdG9yX0IyQiJ9LCJleHAiOjE3NjgyODg5NDksImp0aSI6IjljYzg2NTAxLTNlMTItNGRiMy1iMGQ0LTZlNjU0YzVlNzY2NCJ9.1lW76jZ3j76ogH1xrxjSId5tjPYXCHF5YwrBT1Ef4EHXBhUe8gsCu9tMTBERY0_BrGabaNHhfQ11NLWwGI3yJZGcyzniMNob3FqtPuyCWnILvamlMjU-tsP50DXdQJGnQdMq2OpqtLJ0Yb__cCq69fJQEhcFw7AzLwB6OFngdXNS1yUGfTewFoiONAhrRYyparZxyYPvXi81iHkkeALBLc_xF9q3OMa6rxg-M5espRUyNQb1dRu9hKhWHAV39z0GLqL0z-1rxbG-OHMqc7r6rNwJC276paI7YaxqdcYxOflazp7QPWxH83oCq22QRMpx5aR9RtbkNATRV3CEgGV4RNkzmTqfaSFy3NqIDC8sx5gkKCKTbdhYrISJAQitRfv5-zoF4X3G6zg919eW0V23GuxxLWhz2sjIedhKunxgejZp-ptkQwdZq7N68oqfO3IpFDdrDLbNMieQ5Tjzv4kiRXSFhZTM6K7PuFMesPOC-TEEZ_R6HGgo4K6TaaJGFs9W8JcEg-Nk8ibGriq39NeBOCiE2MLfe_Gu0_eHtWNsf2NF-pCeyLM2rFpBg0jLcgABP-Vlowi82F9lpV3kBuvebX5JkUL8e64NOsLKPOhReifR4vNMJ-ql5kesC5BgU223dzbswJHIdyr-oqGiwEu7ilanzOtD9lIz2gdhfB-Unmk";

      // ========================================
      // BUILD FEDEX REQUEST
      // ========================================
      const fedexRequest = {
        accountNumber: { value: this.accountNumber },
        rateRequestControlParameters: {
          returnTransitTimes: true,
        },
        requestedShipment: {
          shipDateStamp: new Date().toISOString().split("T")[0],
          pickupType: "DROPOFF_AT_FEDEX_LOCATION",
          serviceType: "FEDEX_GROUND",
          // serviceType: "STANDARD_OVERNIGHT",
          packagingType: "YOUR_PACKAGING",
          preferredCurrency: "USD",
          rateRequestType: ["ACCOUNT"],
          // rateRequestType: ["LIST", "ACCOUNT"],
          shipper: {
            address: {
              streetLines: [request.origin.address1],
              city: request.origin.city,
              stateOrProvinceCode: request.origin.province,
              postalCode: request.origin.postal_code,
              countryCode: request.origin.country,
            },
          },
          recipient: {
            address: {
              streetLines: [request.destination.address1],
              city: request.destination.city,
              stateOrProvinceCode: request.destination.province,
              postalCode: request.destination.postal_code,
              countryCode: request.destination.country,
            },
          },
          requestedPackageLineItems: packages.map((pkg, i) => ({
            sequenceNumber: i + 1,
            // sequenceNumber: 1,
            groupPackageCount: 1,
            weight: {
              units: "LB",
              // value: Math.ceil(pkg.weight),
              value: Number(pkg.weight.toFixed(1)),
            },
              // dimensions: {
              //   length: Math.ceil(pkg.dimensions.length),
              //   width: Math.ceil(pkg.dimensions.width),
              //   height: Math.ceil(pkg.dimensions.height),
              //   // height: 3,
              //   units: "IN",
              // },
          })),
        },
      };

      console.log(
        "🟢 FedEx Request Payload:",
        JSON.stringify(fedexRequest, null, 2)
      );

      // ========================================
      // CALL FEDEX API
      // ========================================
      const response = await axios.post(
        `${this.apiUrl}/rate/v1/rates/quotes`,
        fedexRequest,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "X-locale": "en_US",
          },
          timeout: 15000,
        }
      );

      const responseTime = Date.now() - startTime;
      console.log(`🟢 FedEx API response time: ${responseTime}ms`);

      // ========================================
      // PARSE RESPONSE
      // ========================================
      const reply = response.data.output.rateReplyDetails[0];
      const shipment = reply.ratedShipmentDetails[0];

      console.log("replay====================================>", reply);

      // Extract transit days
      const transitDays = this.getFedExTransitDays(reply);

      console.log(
        `🟢 FedEx Rate: $${shipment.totalNetFedExCharge}, Transit: ${transitDays} days`
      );

      return {
        quoteId: `FEDEX-${Date.now()}`,
        rate: shipment.totalNetFedExCharge,
        currency: shipment.currency,
        transitDays,
        serviceLevel: reply.serviceType,
        packages: packages.length,
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      console.error("🔴 FedEx API Error:", error.message);

      if (error.response) {
        console.error(
          "🔴 FedEx Error Response:",
          JSON.stringify(error.response.data, null, 2)
        );
        console.error("🔴 Status:", error.response.status);
      }

      // Return fallback rate
      return this.getFallbackRate(request, responseTime);
    }
  }

  // =====================================================
  // HELPER: Extract transit days from FedEx response
  // =====================================================

  private getFedExTransitDays(reply: any): number {
    // 1️⃣ Try operationalDetail.transitTime enum
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

    // 2️⃣ Try commit.transitDays.description
    const desc = reply.commit?.transitDays?.description;
    if (desc) {
      const match = desc.match(/\d+/);
      if (match) return Number(match[0]);
    }

    // 3️⃣ Default fallback
    return 5;
  }

  // =====================================================
  // FALLBACK RATE CALCULATION
  // =====================================================

  private getFallbackRate(
    request: FedExRateRequest,
    responseTime: number
  ): FedExRateResponse {
    console.log("🟢 Using FedEx fallback rate calculation");

    const processed = this.processShopifyItems(request.items);
    let totalPackages = 0;
    let totalWeight = 0;

    for (const item of processed) {
      if (item.weight <= 150) {
        totalPackages += item.quantity;
        totalWeight += item.totalWeight;
      }
    }

    console.log(
      `🟢 Fallback: ${totalPackages} packages, ${totalWeight.toFixed(
        2
      )} lbs total`
    );

    // Rate estimation
    const baseRatePerPackage = 25;
    const perLbRate = 0.5;
    const estimatedRate =
      totalPackages * baseRatePerPackage + totalWeight * perLbRate;

    return {
      quoteId: `FEDEX-FALLBACK-${Date.now()}`,
      rate: Math.round(estimatedRate * 100) / 100,
      transitDays: 5,
      serviceLevel: "Ground (Estimated)",
      currency: "USD",
      packages: totalPackages,
    };
  }
}

export default FedExClient;
