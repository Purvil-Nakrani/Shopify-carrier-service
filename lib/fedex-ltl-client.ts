// import axios from "axios";
// import { getFEDEXToken } from "./getFEDEXToken";

// // =====================================================
// // TIMEOUT CONFIGURATION
// // =====================================================
// const FEDEX_LTL_API_TIMEOUT = 5000; // 5 seconds for LTL

// // =====================================================
// // INTERFACES
// // =====================================================

// interface LTLFreightItem {
//   weight: number;
//   quantity: number;
//   description: string;
//   freightClass: string;
//   dimensions: {
//     length: number;
//     width: number;
//     height: number;
//   };
// }

// interface FedExLTLRateResponse {
//   quoteId: string;
//   rate: number;
//   transitDays: number;
//   serviceLevel: string;
//   currency: string;
//   totalWeight: number;
//   palletsNeeded: number;
// }

// // =====================================================
// // FREIGHT CLASS CALCULATOR
// // =====================================================

// class FreightClassCalculator {
//   public getFreightClass(weight: number, cubicFeet: number): string {
//     const density = weight / cubicFeet;

//     if (density >= 50) return "CLASS_050";
//     if (density >= 35) return "CLASS_055";
//     if (density >= 30) return "CLASS_060";
//     if (density >= 22.5) return "CLASS_065";
//     if (density >= 15) return "CLASS_070";
//     if (density >= 13.5) return "CLASS_077_5";
//     if (density >= 12) return "CLASS_085";
//     if (density >= 10.5) return "CLASS_092_5";
//     if (density >= 9) return "CLASS_100";
//     if (density >= 8) return "CLASS_110";
//     if (density >= 7) return "CLASS_125";
//     if (density >= 6) return "CLASS_150";
//     if (density >= 5) return "CLASS_175";
//     if (density >= 4) return "CLASS_200";
//     if (density >= 3) return "CLASS_250";
//     if (density >= 2) return "CLASS_300";
//     if (density >= 1) return "CLASS_400";
//     return "CLASS_500";
//   }

//   public calculateCubicFeet(
//     length: number,
//     width: number,
//     height: number,
//   ): number {
//     return (length * width * height) / 1728; // Convert cubic inches to cubic feet
//   }
// }

// // =====================================================
// // MAIN FEDEX LTL CLIENT
// // =====================================================

// export class FedExLTLClient {
//   // Use parcel account for credentials, LTL account for billing
//   private apiUrl = process.env.FEDEX_API_URL_LTL || "https://apis.fedex.com";
//   private accountNumber = process.env.FEDEX_ACCOUNT_SMALL || "207407940"; // Parcel account for auth
//   private ltlBillingAccount = process.env.FEDEX_ACCOUNT_LTL || "210034063"; // LTL billing account
//   private freightClassCalculator = new FreightClassCalculator();

//   // =====================================================
//   // CONVERT TO LTL FREIGHT ITEMS
//   // =====================================================
//   public convertToLTLFreightItems(
//     totalWeight: number,
//     palletsNeeded: number,
//     weightPerPallet: number,
//     freightClass: string,
//     palletWeight: number = 50,
//   ): LTLFreightItem[] {
//     const ltlItems: LTLFreightItem[] = [];

//     for (let i = 0; i < palletsNeeded; i++) {
//       const productWeightOnPallet =
//         i === palletsNeeded - 1
//           ? totalWeight - weightPerPallet * (palletsNeeded - 1)
//           : weightPerPallet;

//       const totalPalletWeight = productWeightOnPallet + palletWeight;

//       ltlItems.push({
//         weight: totalPalletWeight,
//         quantity: 1,
//         description: "Rubber Flooring Products",
//         freightClass: freightClass,
//         dimensions: {
//           length: 48,
//           width: 40,
//           height: 35, // Fixed pallet height
//         },
//       });
//     }

//     return ltlItems;
//   }

//   // =====================================================
//   // GET LTL FREIGHT RATE
//   // =====================================================
//   async getLTLRate(
//     originAddress: any,
//     destination: any,
//     ltlItems: LTLFreightItem[],
//     totalWeight: number,
//   ): Promise<FedExLTLRateResponse> {
//     const startTime = Date.now();

//     try {
//       if (ltlItems.length === 0) {
//         throw new Error("No freight items to ship");
//       }

//       const accessToken = await getFEDEXToken();

//       console.log(`\n🟠 FedEx LTL Request:`);
//       console.log(`   Total weight: ${totalWeight} lbs`);
//       console.log(`   Handling units: ${ltlItems.length}`);
//       console.log(
//         `   Origin: ${originAddress.locality}, ${originAddress.region}`,
//       );
//       console.log(
//         `   Destination: ${destination.city}, ${destination.province}`,
//       );

//       // ✅ Match the EXACT working Postman request structure
//       const fedexLTLRequest = {
//         accountNumber: {
//           value: this.accountNumber, // Use parcel account for auth
//         },
//         rateRequestControlParameters: {
//           returnTransitTimes: false,
//           servicesNeededOnRateFailure: true,
//           variableOptions: "FREIGHT_GUARANTEE",
//           rateSortOrder: "SERVICENAMETRADITIONAL",
//         },
//         freightRequestedShipment: {
//           shipper: {
//             address: {
//               streetLines: originAddress.addressLineList.filter(Boolean),
//               city: originAddress.locality,
//               stateOrProvinceCode: originAddress.region,
//               postalCode: originAddress.postalCode,
//               countryCode: originAddress.countryCode,
//               residential: false,
//             },
//           },
//           recipient: {
//             address: {
//               streetLines: [destination.address1 || ""],
//               city: destination.city || "",
//               stateOrProvinceCode: destination.province || "",
//               postalCode: destination.postal_code || "",
//               countryCode: "US",
//               residential: true, // Residential delivery
//             },
//           },
//           serviceType: "FEDEX_FREIGHT_PRIORITY",
//           preferredCurrency: "USD",
//           shippingChargesPayment: {
//             payor: {
//               responsibleParty: {
//                 address: {
//                   streetLines: ["10 FedEx Parkway", "Suite 302"],
//                   city: "Beverly Hills",
//                   stateOrProvinceCode: "CA",
//                   postalCode: "90210",
//                   countryCode: "US",
//                   residential: false,
//                 },
//                 contact: {
//                   personName: "John Taylor",
//                   emailAddress: "sample@company.com",
//                   phoneNumber: "1234567890",
//                   phoneExtension: "phone extension",
//                   companyName: "Fedex",
//                   faxNumber: "fax number",
//                 },
//                 accountNumber: {
//                   value: this.ltlBillingAccount, // LTL billing account
//                 },
//               },
//             },
//             paymentType: "SENDER",
//           },
//           shipDateStamp: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
//             .toISOString()
//             .split("T")[0], // 2 days from now
//           requestedPackageLineItems: [
//             {
//               subPackagingType: "BAG",
//               groupPackageCount: 1,
//               contentRecord: [
//                 {
//                   itemNumber: "string",
//                   receivedQuantity: 0,
//                   description: "string",
//                   partNumber: "string",
//                 },
//               ],
//               declaredValue: {
//                 amount: "100",
//                 currency: "USD",
//               },
//               weight: {
//                 units: "LB",
//                 value: Math.round(totalWeight),
//               },
//               dimensions: {
//                 length: 10,
//                 width: 8,
//                 height: 2,
//                 units: "IN",
//               },
//               associatedFreightLineItems: [
//                 {
//                   id: "string",
//                 },
//               ],
//             },
//           ],
//           totalPackageCount: ltlItems.length,
//           totalWeight: Math.round(totalWeight),
//           freightShipmentDetail: {
//             role: "SHIPPER",
//             accountNumber: {
//               value: this.ltlBillingAccount,
//             },
//             declaredValueUnits: "string",
//             shipmentDimensions: {
//               length: 10,
//               width: 8,
//               height: 2,
//               units: "IN",
//             },
//             lineItem: ltlItems.map((item, index) => ({
//               handlingUnits: 0,
//               subPackagingType: "BAG",
//               description: item.description,
//               weight: {
//                 units: "KG",
//                 value: item.weight * 0.453592, // Convert lbs to kg
//               },
//               pieces: 0,
//               volume: {
//                 units: "CUBIC_FT",
//                 value: 0,
//               },
//               freightClass: "CLASS_050", // Keep CLASS_050 format
//               purchaseOrderNumber: "string",
//               id: "string",
//               hazardousMaterials: "HAZARDOUS_MATERIALS",
//               dimensions: {
//                 length: item.dimensions.length,
//                 width: item.dimensions.width,
//                 height: item.dimensions.height,
//                 units: "IN",
//               },
//             })),
//             clientDiscountPercent: 0,
//             fedExFreightBillingContactAndAddress: {
//               address: {
//                 streetLines: ["string", "Suite 302"],
//                 city: "Beverly Hills",
//                 stateOrProvinceCode: "string",
//                 postalCode: "string",
//                 countryCode: "US",
//                 residential: false,
//               },
//               contact: {
//                 personName: "person name",
//                 emailAddress: "email address",
//                 phoneNumber: "phone number",
//                 phoneExtension: "phone extension",
//                 companyName: "company name",
//                 faxNumber: "fax number",
//               },
//             },
//             aliasID: "string",
//             hazardousMaterialsOfferor: "string",
//             declaredValuePerUnit: {
//               amount: "100",
//               currency: "USD",
//             },
//             totalHandlingUnits: 0,
//             alternateBillingParty: {
//               address: {
//                 streetLines: ["1550 Union Blvd", "Suite 302"],
//                 city: "Beverly Hills",
//                 stateOrProvinceCode: "TN",
//                 postalCode: "65247",
//                 countryCode: "US",
//                 residential: false,
//               },
//               accountNumber: {
//                 value: this.ltlBillingAccount,
//               },
//             },
//           },
//         },
//         version: {
//           major: "1",
//           minor: "2",
//           patch: "1",
//         },
//       };

//       console.log(
//         "\n🟠 FedEx LTL Request:",
//         JSON.stringify(fedexLTLRequest, null, 2),
//       );

//       // ✅ CORRECT ENDPOINT - matches your working Postman request
//       const response = await axios.post(
//         `${this.apiUrl}/rate/v1/freight/rates/quotes`,
//         fedexLTLRequest,
//         {
//           headers: {
//             Authorization: `Bearer ${accessToken}`,
//             "Content-Type": "application/json",
//             "X-locale": "en_US",
//           },
//           timeout: FEDEX_LTL_API_TIMEOUT,
//         },
//       );

//       console.log(
//         "\n🟠 FedEx LTL Response:",
//         JSON.stringify(response.data, null, 2),
//       );

//       const reply = response.data.output.rateReplyDetails[0];
//       const shipment = reply.ratedShipmentDetails[0];
//       const transitDays = this.extractTransitDays(reply);

//       const baseRate = shipment.totalNetFedExCharge;
//       const finalRate = +(baseRate * 1.15).toFixed(2); // 15% markup

//       const elapsed = Date.now() - startTime;
//       console.log(
//         `✅ FedEx LTL: $${finalRate} (${reply.serviceType}) - ${elapsed}ms`,
//       );

//       return {
//         quoteId: `FEDEX-LTL-${Date.now()}`,
//         rate: finalRate,
//         currency: "USD",
//         transitDays: transitDays,
//         serviceLevel: reply.serviceType,
//         totalWeight: totalWeight,
//         palletsNeeded: ltlItems.length,
//       };
//     } catch (error: any) {
//       console.error(
//         `🔴 FedEx LTL Error:`,
//         error.response?.data || error.message,
//       );
//       throw error;
//     }
//   }
//   // =====================================================
//   // EXTRACT TRANSIT DAYS
//   // =====================================================
//   private extractTransitDays(reply: any): number {
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
//         EIGHT_DAYS: 8,
//         NINE_DAYS: 9,
//         TEN_DAYS: 10,
//       };
//       if (MAP[enumVal]) return MAP[enumVal];
//     }

//     const desc = reply.commit?.transitDays?.description;
//     if (desc) {
//       const match = desc.match(/\d+/);
//       if (match) return Number(match[0]);
//     }

//     return 7; // Default for LTL
//   }
// }

// export default FedExLTLClient;

import axios from "axios";
import { getFEDEXToken } from "./getFEDEXToken";

// =====================================================
// TIMEOUT CONFIGURATION
// =====================================================
const FEDEX_LTL_API_TIMEOUT = 5000; // 5 seconds for LTL

// =====================================================
// INTERFACES
// =====================================================

interface LTLFreightItem {
  weight: number;
  quantity: number;
  description: string;
  freightClass: string;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
}

interface FedExLTLRateResponse {
  quoteId: string;
  rate: number;
  transitDays: number;
  serviceLevel: string;
  currency: string;
  totalWeight: number;
  palletsNeeded: number;
}

// =====================================================
// FREIGHT CLASS CALCULATOR
// =====================================================

class FreightClassCalculator {
  /**
   * Calculate freight class based on density (weight per cubic foot)
   * Density = Weight (lbs) / Volume (cubic feet)
   */
  public getFreightClass(weight: number, cubicFeet: number): string {
    const density = weight / cubicFeet;

    console.log(`   📦 Density Calculation:`);
    console.log(`      Weight: ${weight.toFixed(2)} lbs`);
    console.log(`      Volume: ${cubicFeet.toFixed(2)} cubic feet`);
    console.log(`      Density: ${density.toFixed(2)} lbs/cubic ft`);

    if (density >= 50) return "CLASS_050";
    if (density >= 35) return "CLASS_055";
    if (density >= 30) return "CLASS_060";
    if (density >= 22.5) return "CLASS_065";
    if (density >= 15) return "CLASS_070";
    if (density >= 12) return "CLASS_085";
    if (density >= 10) return "CLASS_092_5";
    if (density >= 8) return "CLASS_100";
    if (density >= 6) return "CLASS_125";
    if (density >= 4) return "CLASS_175";
    if (density >= 3) return "CLASS_250";
    if (density >= 2) return "CLASS_300";
    if (density >= 1) return "CLASS_400";
    return "CLASS_500";
  }

  /**
   * Calculate cubic feet from dimensions in inches
   * Volume = (Length × Width × Height) / 1728
   */
  public calculateCubicFeet(
    length: number,
    width: number,
    height: number,
  ): number {
    return (length * width * height) / 1728; // Convert cubic inches to cubic feet
  }

  /**
   * Calculate freight class for a pallet
   */
  public calculateFreightClassForPallet(
    weight: number,
    length: number = 48,
    width: number = 40,
    height: number = 35,
  ): string {
    const cubicFeet = this.calculateCubicFeet(length, width, height);
    const freightClass = this.getFreightClass(weight, cubicFeet);

    console.log(`   ✅ Freight Class: ${freightClass}`);

    return freightClass;
  }
}

// =====================================================
// MAIN FEDEX LTL CLIENT
// =====================================================

export class FedExLTLClient {
  // Use parcel account for credentials, LTL account for billing
  private apiUrl = process.env.FEDEX_API_URL_LTL || "https://apis.fedex.com";
  private accountNumber = process.env.FEDEX_ACCOUNT_SMALL || "207407940"; // Parcel account for auth
  private ltlBillingAccount = process.env.FEDEX_ACCOUNT_LTL || "210034063"; // LTL billing account
  private freightClassCalculator = new FreightClassCalculator();

  // =====================================================
  // CONVERT TO LTL FREIGHT ITEMS
  // =====================================================
  public convertToLTLFreightItems(
    totalWeight: number,
    palletsNeeded: number,
    weightPerPallet: number,
    freightClass: string,
    palletWeight: number = 50,
  ): LTLFreightItem[] {
    const ltlItems: LTLFreightItem[] = [];

    console.log(`\n📦 Converting to LTL Freight Items:`);
    console.log(`   Total Product Weight: ${totalWeight} lbs`);
    console.log(`   Pallets Needed: ${palletsNeeded}`);
    console.log(`   Base Freight Class: ${freightClass}`);
    console.log(`   Pallet Weight: ${palletWeight} lbs each\n`);

    for (let i = 0; i < palletsNeeded; i++) {
      // Calculate product weight for this pallet
      const productWeightOnPallet =
        i === palletsNeeded - 1
          ? totalWeight - weightPerPallet * (palletsNeeded - 1)
          : weightPerPallet;

      // Add pallet weight (50 lbs)
      const totalPalletWeight = productWeightOnPallet + palletWeight;

      // ✅ CALCULATE FREIGHT CLASS FOR THIS SPECIFIC PALLET
      const calculatedFreightClass =
        this.freightClassCalculator.calculateFreightClassForPallet(
          totalPalletWeight,
          48, // length
          40, // width
          35, // height
        );

      console.log(`   Pallet ${i + 1}:`);
      console.log(
        `      Product Weight: ${productWeightOnPallet.toFixed(2)} lbs`,
      );
      console.log(
        `      Total Weight (with pallet): ${totalPalletWeight.toFixed(2)} lbs`,
      );
      console.log(
        `      Calculated Freight Class: ${calculatedFreightClass}\n`,
      );

      ltlItems.push({
        weight: totalPalletWeight,
        quantity: 1,
        description: "Rubber Flooring Products",
        freightClass: calculatedFreightClass, // ✅ Use calculated class
        dimensions: {
          length: 48,
          width: 40,
          height: 35,
        },
      });
    }

    return ltlItems;
  }

  // =====================================================
  // GET LTL FREIGHT RATE
  // =====================================================
  async getLTLRate(
    originAddress: any,
    destination: any,
    ltlItems: LTLFreightItem[],
    totalWeight: number,
  ): Promise<FedExLTLRateResponse> {
    const startTime = Date.now();

    try {
      if (ltlItems.length === 0) {
        throw new Error("No freight items to ship");
      }

      const accessToken = await getFEDEXToken();

      console.log(`\n🟠 FedEx LTL Request:`);
      console.log(`   Total weight: ${totalWeight} lbs`);
      console.log(`   Handling units: ${ltlItems.length}`);
      console.log(
        `   Origin: ${originAddress.locality}, ${originAddress.region}`,
      );
      console.log(
        `   Destination: ${destination.city}, ${destination.province}`,
      );

      // ✅ Match the EXACT working Postman request structure
      // const fedexLTLRequest = {
      //   accountNumber: {
      //     value: this.accountNumber,
      //   },
      //   rateRequestControlParameters: {
      //     returnTransitTimes: false,
      //     servicesNeededOnRateFailure: true,
      //     variableOptions: "FREIGHT_GUARANTEE",
      //     rateSortOrder: "SERVICENAMETRADITIONAL",
      //   },
      //   freightRequestedShipment: {
      //     // shipper: {
      //     //   address: {
      //     //     streetLines: originAddress.addressLineList.filter(Boolean),
      //     //     city: originAddress.locality,
      //     //     stateOrProvinceCode: originAddress.region,
      //     //     postalCode: originAddress.postalCode,
      //     //     countryCode: originAddress.countryCode,
      //     //     residential: false,
      //     //   },
      //     // },
      //     shipper: {
      //       address: {
      //         streetLines: ["312 East 52 Bypass"],
      //         city: "STAFFORD",
      //         stateOrProvinceCode: "TX",
      //         postalCode: "77477",
      //         countryCode: "US",
      //         residential: false,
      //       },
      //     },
      //     recipient: {
      //       address: {
      //         streetLines: [destination.address1 || ""],
      //         city: destination.city || "",
      //         stateOrProvinceCode: destination.province || "",
      //         postalCode: destination.postal_code || "",
      //         countryCode: "US",
      //         residential: true,
      //       },
      //     },
      //     // serviceType: "FEDEX_FREIGHT_PRIORITY",
      //     serviceType: "FEDEX_FREIGHT_ECONOMY",
      //     preferredCurrency: "USD",
      //     shippingChargesPayment: {
      //       payor: {
      //         responsibleParty: {
      //           address: {
      //             streetLines: ["10 FedEx Parkway", "Suite 302"],
      //             city: "Beverly Hills",
      //             stateOrProvinceCode: "CA",
      //             postalCode: "90210",
      //             countryCode: "US",
      //             residential: false,
      //           },
      //           contact: {
      //             personName: "John Taylor",
      //             emailAddress: "sample@company.com",
      //             phoneNumber: "1234567890",
      //             phoneExtension: "phone extension",
      //             companyName: "Fedex",
      //             faxNumber: "fax number",
      //           },
      //           accountNumber: {
      //             value: this.ltlBillingAccount,
      //           },
      //         },
      //       },
      //       paymentType: "SENDER",
      //     },
      //     shipDateStamp: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
      //       .toISOString()
      //       .split("T")[0],
      //     requestedPackageLineItems: [
      //       {
      //         subPackagingType: "BAG",
      //         //   subPackagingType: "PALLET",
      //         groupPackageCount: 1,
      //         contentRecord: [
      //           {
      //             itemNumber: "string",
      //             receivedQuantity: 0,
      //             description: "Rubber Flooring Tiles",
      //             partNumber: "rubber-flooring-tiles",
      //           },
      //         ],
      //         declaredValue: {
      //           amount: "100",
      //           currency: "USD",
      //         },
      //         weight: {
      //           units: "LB",
      //           value: Math.round(totalWeight),
      //         },
      //         dimensions: {
      //           length: 10,
      //           width: 8,
      //           height: 2,
      //           units: "IN",
      //         },
      //         associatedFreightLineItems: [
      //           {
      //             id: "string",
      //           },
      //         ],
      //       },
      //     ],
      //     totalPackageCount: ltlItems.length,
      //     totalWeight: Math.round(totalWeight),
      //     freightShipmentDetail: {
      //       role: "SHIPPER",
      //       accountNumber: {
      //         value: this.ltlBillingAccount,
      //       },
      //       // declaredValueUnits: "string",
      //       shipmentDimensions: {
      //         length: 10,
      //         width: 8,
      //         height: 2,
      //         units: "IN",
      //       },
      //       lineItem: ltlItems.map((item, index) => ({
      //         handlingUnits: index + 1,
      //         subPackagingType: "BAG",
      //         description: item.description,
      //         weight: {
      //           units: "LB",
      //           value: item.weight, // Already in lbs
      //         },
      //         pieces: 0,
      //         //   volume: {
      //         //     units: "CUBIC_FT",
      //         //     value: 0,
      //         //   },
      //         freightClass: item.freightClass, // ✅ Use calculated freight class from item
      //         purchaseOrderNumber: "string",
      //         id: "string",
      //         //   hazardousMaterials: "HAZARDOUS_MATERIALS",
      //         dimensions: {
      //           length: item.dimensions.length,
      //           width: item.dimensions.width,
      //           height: item.dimensions.height,
      //           units: "IN",
      //         },
      //       })),
      //       clientDiscountPercent: 0,
      //       fedExFreightBillingContactAndAddress: {
      //         address: {
      //           streetLines: ["string", "Suite 302"],
      //           city: "Beverly Hills",
      //           stateOrProvinceCode: "string",
      //           postalCode: "string",
      //           countryCode: "US",
      //           residential: false,
      //         },
      //         contact: {
      //           personName: "person name",
      //           emailAddress: "email address",
      //           phoneNumber: "phone number",
      //           phoneExtension: "phone extension",
      //           companyName: "company name",
      //           faxNumber: "fax number",
      //         },
      //       },
      //       aliasID: "string",
      //       // hazardousMaterialsOfferor: "string",
      //       declaredValuePerUnit: {
      //         amount: "100",
      //         currency: "USD",
      //       },
      //       totalHandlingUnits: 0,
      //       alternateBillingParty: {
      //         address: {
      //           streetLines: ["1550 Union Blvd", "Suite 302"],
      //           city: "Beverly Hills",
      //           stateOrProvinceCode: "TN",
      //           postalCode: "65247",
      //           countryCode: "US",
      //           residential: false,
      //         },
      //         accountNumber: {
      //           value: this.ltlBillingAccount,
      //         },
      //       },
      //     },
      //   },
      //   version: {
      //     major: "1",
      //     minor: "2",
      //     patch: "1",
      //   },
      // };
      // =====================================================
      // CORRECTED FEDEX LTL REQUEST - ALL ISSUES FIXED
      // =====================================================

      const fedexLTLRequest = {
        accountNumber: {
          value: "207407940",
        },
        // ✅ FIX: Add rateRequestControlParameters
        rateRequestControlParameters: {
          returnTransitTimes: true,
        },
        freightRequestedShipment: {
          // shipper: {
          //   address: {
          //     streetLines: ["312 East 52 Bypass"],
          //     city: "STAFFORD",
          //     stateOrProvinceCode: "TX",
          //     postalCode: "77477",
          //     countryCode: "US",
          //     residential: false,
          //   },
          // },
          shipper: {
            address: {
              streetLines: originAddress.addressLineList.filter(Boolean),
              city: originAddress.locality,
              stateOrProvinceCode: originAddress.region,
              postalCode: originAddress.postalCode,
              countryCode: originAddress.countryCode,
              residential: false,
            },
          },
          recipient: {
            address: {
              streetLines: [destination.address1 || ""],
              city: destination.city || "",
              stateOrProvinceCode: destination.province || "",
              postalCode: destination.postal_code || "",
              countryCode: "US",
              residential: true,
            },
          },
          serviceType: "FEDEX_FREIGHT_ECONOMY",
          preferredCurrency: "USD",
          shippingChargesPayment: {
            payor: {
              responsibleParty: {
                accountNumber: {
                  value: "210034063",
                },
              },
            },
            paymentType: "SENDER",
          },
          shipDateStamp: "2026-02-18",
          requestedPackageLineItems: [
            {
              subPackagingType: "PALLET",
              groupPackageCount: 1,
              contentRecord: [
                {
                  itemNumber: "1",
                  receivedQuantity: 0,
                  description: "Rubber Flooring Products",
                  partNumber: "1",
                },
              ],
              declaredValue: {
                amount: "100",
                currency: "USD",
              },
              weight: {
                units: "LB",
                // value: Math.round(totalWeight), // ✅ FIX: Round weight
                value: totalWeight, // ✅ FIX: Round weight
              },
              dimensions: {
                length: 48,
                width: 40,
                height: 35,
                units: "IN",
              },
              associatedFreightLineItems: [{ id: "1" }],
            },
          ],
          totalPackageCount: 1,
          // totalWeight: Math.round(totalWeight), // ✅ FIX: Round weight
          totalWeight: totalWeight, // ✅ FIX: Round weight
          freightShipmentDetail: {
            role: "SHIPPER",
            accountNumber: {
              value: "210034063",
            },
            // ✅ FIX: Remove invalid "declaredValueUnits": "string"
            shipmentDimensions: {
              length: 48,
              width: 40,
              height: 35,
              units: "IN",
            },
            lineItem: ltlItems.map((item, index) => ({
              handlingUnits: 1,
              subPackagingType: "PALLET",
              description: item.description || "Rubber Flooring Products",
              weight: {
                units: "LB",
                // value: Math.round(item.weight * 100) / 100, // ✅ FIX: Round to 2 decimals
                value: item.weight,
              },
              pieces: 1, // ✅ FIX: Changed from 0 to 1
              volume: {
                units: "CUBIC_FT",
                value: Math.round(((48 * 40 * 35) / 1728) * 100) / 100,
              },
              freightClass: item.freightClass,
              id: (index + 1).toString(), // ✅ FIX: Unique IDs (1, 2, 3, 4, 5)
              dimensions: {
                length: 48,
                width: 40,
                height: 35,
                units: "IN",
              },
              // ✅ FIX: Removed invalid placeholder fields:
              // - purchaseOrderNumber: "string"
            })),
            fedExFreightBillingContactAndAddress: {
              address: {
                streetLines: ["312 East 52 Bypass"],
                city: "Pilot Mountain",
                stateOrProvinceCode: "NC",
                postalCode: "27041",
                countryCode: "US",
                residential: false,
              },
              contact: {
                personName: "John Doe",
                emailAddress: "contact@example.com",
                phoneNumber: "1234567890",
                companyName: "Your Company",
              },
            },
            // ✅ FIX: Removed invalid fields:
            // - aliasID: "string"
            // - hazardousMaterialsOfferor: "string"
            declaredValuePerUnit: {
              amount: "100",
              currency: "USD",
            },
            totalHandlingUnits: ltlItems.reduce((sum, _) => sum + 1, 0),
            alternateBillingParty: {
              accountNumber: {
                value: "210034063",
              },
            },
          },
          freightShipmentSpecialServices: {
            specialServiceTypes: [
              "LIFTGATE_DELIVERY",
              "CALL_BEFORE_DELIVERY", // ✅ FIX: Changed from CALL_BEFORE_DELIVERY
            ],
          },
        },
        version: {
          major: "1",
          minor: "2",
          patch: "1",
        },
      };

      // const fedexLTLRequest = {
      //   accountNumber: {
      //     value: "207407940",
      //   },
      //   // rateRequestControlParameters: {
      //   //   returnTransitTimes: true,
      //   // },
      //   freightRequestedShipment: {
      //     // shipper: {
      //     //   address: {
      //     //     streetLines: ["312 East 52 Bypass"],
      //     //     city: "STAFFORD",
      //     //     stateOrProvinceCode: "TX",
      //     //     postalCode: "77477",
      //     //     countryCode: "US",
      //     //     residential: false,
      //     //   },
      //     // },
      //     shipper: {
      //       address: {
      //         streetLines: originAddress.addressLineList.filter(Boolean),
      //         city: originAddress.locality,
      //         stateOrProvinceCode: originAddress.region,
      //         postalCode: originAddress.postalCode,
      //         countryCode: originAddress.countryCode,
      //         residential: false,
      //       },
      //     },
      //     recipient: {
      //       address: {
      //         streetLines: [destination.address1 || ""],
      //         city: destination.city || "",
      //         stateOrProvinceCode: destination.province || "",
      //         postalCode: destination.postal_code || "",
      //         countryCode: "US",
      //         residential: true,
      //       },
      //     },
      //     // "serviceType": "FEDEX_FREIGHT_PRIORITY",
      //     serviceType: "FEDEX_FREIGHT_ECONOMY",
      //     preferredCurrency: "USD",
      //     shippingChargesPayment: {
      //       payor: {
      //         responsibleParty: {
      //           accountNumber: {
      //             value: "210034063",
      //           },
      //         },
      //       },
      //       paymentType: "SENDER",
      //     },
      //     shipDateStamp: "2026-02-18",
      //     requestedPackageLineItems: [
      //       {
      //         subPackagingType: "PALLET",
      //         groupPackageCount: 1,
      //         contentRecord: [
      //           {
      //             itemNumber: "1",
      //             receivedQuantity: 0,
      //             description: "abc",
      //             partNumber: "1",
      //           },
      //         ],
      //         declaredValue: {
      //           amount: "100",
      //           currency: "USD",
      //         },
      //         weight: {
      //           units: "LB",
      //           // value: Math.round(totalWeight),
      //           value: totalWeight,
      //         },
      //         dimensions: {
      //           length: 48,
      //           width: 40,
      //           height: 35,
      //           units: "IN",
      //         },
      //         associatedFreightLineItems: [
      //           {
      //             id: "1",
      //           },
      //         ],
      //       },
      //     ],
      //     totalPackageCount: 1,
      //     // totalWeight: Math.round(totalWeight),
      //     totalWeight: totalWeight,
      //     freightShipmentDetail: {
      //       role: "SHIPPER",
      //       accountNumber: {
      //         value: this.ltlBillingAccount,
      //       },
      //       declaredValueUnits: "string",
      //       shipmentDimensions: {
      //         length: 10,
      //         width: 8,
      //         height: 2,
      //         units: "IN",
      //       },
      //       lineItem: ltlItems.map((item, index) => ({
      //         handlingUnits: 1,
      //         subPackagingType: "BAG",
      //         description: item.description || "Item",
      //         weight: {
      //           units: "LB",
      //           // value: Math.round(item.weight),
      //           value: item.weight,
      //         },
      //         pieces: 0,
      //         volume: {
      //           units: "CUBIC_FT",
      //           // value: 0,
      //           value: Math.round(((48 * 40 * 35) / 1728) * 100) / 100,
      //         },
      //         freightClass: item.freightClass,
      //         purchaseOrderNumber: "string",
      //         id: "1",
      //         dimensions: {
      //           length: 48,
      //           width: 40,
      //           height: 35,
      //           units: "IN",
      //         },
      //       })),
      //       fedExFreightBillingContactAndAddress: {
      //         address: {
      //           streetLines: ["312 East 52 Bypass"],
      //           city: "Pilot Mountain",
      //           stateOrProvinceCode: "NC",
      //           postalCode: "27041",
      //           countryCode: "US",
      //           residential: false,
      //         },
      //         contact: {
      //           personName: "person name",
      //           emailAddress: "email address",
      //           phoneNumber: "phone number",
      //           phoneExtension: "phone extension",
      //           companyName: "company name",
      //           faxNumber: "fax number",
      //         },
      //       },
      //       aliasID: "string",
      //       hazardousMaterialsOfferor: "string",
      //       declaredValuePerUnit: {
      //         amount: "100",
      //         currency: "USD",
      //       },
      //       totalHandlingUnits: 1,
      //       alternateBillingParty: {
      //         accountNumber: {
      //           value: "210034063",
      //         },
      //       },
      //     },
      //     freightShipmentSpecialServices: {
      //       specialServiceTypes: ["LIFTGATE_DELIVERY", "CALL_BEFORE_DELIVERY"]
      //     },
      //   },
      //   version: {
      //     major: "1",
      //     minor: "2",
      //     patch: "1",
      //   },
      // };

      console.log(
        "\n🟠 FedEx LTL Request:",
        JSON.stringify(fedexLTLRequest, null, 2),
      );

      const response = await axios.post(
        `${this.apiUrl}/rate/v1/freight/rates/quotes`,
        fedexLTLRequest,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "X-locale": "en_US",
          },
          timeout: FEDEX_LTL_API_TIMEOUT,
        },
      );

      // console.log(
      //   "\n🟠 FedEx LTL Response:",
      //   JSON.stringify(response.data, null, 2),
      // );

      const reply = response.data.output.rateReplyDetails[0];
      const shipment = reply.ratedShipmentDetails[0];
      const transitDays = this.extractTransitDays(reply);

      console.log(
        "\n🟠 FedEx LTL Response:",
        JSON.stringify(
          response.data.output.rateReplyDetails[0].ratedShipmentDetails[0],
          null,
          2,
        ),
      );

      const baseRate = shipment.totalNetFedExCharge;
      const finalRate = +(baseRate * 1.15).toFixed(2); // 15% markup

      const elapsed = Date.now() - startTime;
      console.log(
        `✅ FedEx LTL: $${baseRate} (${reply.serviceType}) - ${elapsed}ms`,
      );

      return {
        quoteId: `FEDEX-LTL-${Date.now()}`,
        rate: finalRate,
        currency: "USD",
        transitDays: transitDays,
        serviceLevel: reply.serviceType,
        totalWeight: totalWeight,
        palletsNeeded: ltlItems.length,
      };
    } catch (error: any) {
      console.error(
        `🔴 FedEx LTL Error:`,
        error.response?.data || error.message,
      );
      throw error;
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
        EIGHT_DAYS: 8,
        NINE_DAYS: 9,
        TEN_DAYS: 10,
      };
      if (MAP[enumVal]) return MAP[enumVal];
    }

    const desc = reply.commit?.transitDays?.description;
    if (desc) {
      const match = desc.match(/\d+/);
      if (match) return Number(match[0]);
    }

    return 7; // Default for LTL
  }
}

export default FedExLTLClient;
