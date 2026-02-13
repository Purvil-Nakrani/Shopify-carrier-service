import axios, { AxiosError } from "axios";

interface SEFLConfig {
  username: string;
  password: string;
  customerAccount: string;
  customerName?: string;
  customerStreet?: string;
  customerCity?: string;
  customerState?: string;
  customerZip?: string;
  emailAddress?: string;
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
}

interface ShipmentData {
  customerName?: string;
  origin: {
    zip: string;
    city: string;
    state: string;
    country?: string;
  };
  destination: {
    zip: string;
    city: string;
    state: string;
    country?: string;
  };
  pickupDate: string | Date;
  terms?: "P" | "C" | "T";
  freightClass?: number;
  weight: number;
  units: number;
  length: number;
  width: number;
  height: number;
  packageType?: string;
  description?: string;
  cubicFeet?: number;
  chkLAP: string;
  chkLGD: string;
  chkAN: string;
}

interface SEFLRate {
  success: boolean;
  carrier: string;
  quoteNumber?: string;
  rate?: number;
  transitDays?: number;
  error?: string;
  status?: string;
  details?: any;
}

interface SEFLQuoteResponse {
  errorOccured: string;
  errorMessage?: string;
  quoteNumber?: string;
}

interface SEFLQuoteDetails {
  quoteNumber: string;
  status: string;
  rateQuote?: string;
  transitTime?: string;
  [key: string]: any;
}

class SEFLClient {
  private baseUrl = "https://www.sefl.com/webconnect/ratequotes/rest";
  private config: SEFLConfig;
  private maxRetries: number;
  private retryDelay: number;
  private timeout: number;

  constructor(config: SEFLConfig) {
    this.validateConfig(config);
    this.config = {
      customerName: "ELITE FLOOR SUPPLY",
      customerStreet: "4000 GREENBRIAR DR #200",
      customerCity: "STAFFORD",
      customerState: "TX",
      customerZip: "77477",
      emailAddress: "nabit@sasbrandsloop.com",
      ...config,
    };
    this.maxRetries = config.maxRetries || 3;
    this.retryDelay = config.retryDelay || 5000;
    this.timeout = config.timeout || 5000;
  }

  private validateConfig(config: SEFLConfig): void {
    const required = ["username", "password", "customerAccount"];

    for (const field of required) {
      if (!config[field as keyof SEFLConfig]) {
        throw new Error(`Missing required SEFL config field: ${field}`);
      }
    }
  }

  async getShippingRate(shipmentData: ShipmentData): Promise<SEFLRate> {
    try {
      // Auto-calculate freight class if not provided
      const freightClass =
        shipmentData.freightClass ||
        SEFLClient.calculateFreightClass(
          shipmentData.weight,
          shipmentData.length,
          shipmentData.width,
          shipmentData.height,
        );

      const enrichedData = { ...shipmentData, freightClass };

      const quoteNumber = await this.submitQuote(enrichedData);
      console.log(`✅ SEFL Quote Submitted: ${quoteNumber}`);

      // ✅ ADD INITIAL DELAY - Let SEFL process the quote first
      console.log(`⏳ Waiting for SEFL to process quote...`);
      await this.sleep(1000); // Wait 3 seconds before first fetch

      const quoteDetails: any = await this.getQuoteWithRetry(quoteNumber);

      return {
        success: true,
        carrier: "SEFL",
        quoteNumber: quoteDetails.quoteNumber,
        rate: parseFloat(quoteDetails.rateQuote),
        transitDays: parseInt(quoteDetails.transitTime) || undefined,
        details: quoteDetails,
      };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  private async submitQuote(
    data: ShipmentData & { freightClass: number },
  ): Promise<string> {
    const pickupDate = this.parsePickupDate(data.pickupDate);
    const cubicFeet =
      data.cubicFeet || (data.length * data.width * data.height) / 1728;

    const params = new URLSearchParams({
      CustomerAccount: this.config.customerAccount,
      returnX: "Y",
      rateXML: "Y",
      CustomerName: this.config.customerName!,
      CustomerStreet: this.config.customerStreet!,
      CustomerCity: this.config.customerCity!,
      CustomerState: this.config.customerState!,
      CustomerZip: this.config.customerZip!,
      Option: "T",
      PickupDateMM: pickupDate.month,
      PickupDateDD: pickupDate.day,
      PickupDateYYYY: pickupDate.year,
      Terms: data.terms || "P",
      // Terms: "C",
      EmailAddress: this.config.emailAddress!,
      OriginCity: data.origin.city,
      OriginState: data.origin.state,
      OriginZip: data.origin.zip,
      OrigCountry: data.origin.country || "US",
      DestinationCity: data.destination.city,
      DestinationState: data.destination.state,
      DestinationZip: data.destination.zip,
      DestCountry: data.destination.country || "US",
      Class1: data.freightClass.toString(),
      Weight1: data.weight.toString(),
      WeightUnitOfMeasure1: "LBS",
      CubicFt1: cubicFeet.toFixed(2),
      Description1: data.description || "General Freight",
      DimsOption: "I",
      PieceLength1: data.length.toString(),
      PieceWidth1: data.width.toString(),
      PieceHeight1: data.height.toString(),
      UnitOfMeasure1: "I",
      NumberOfUnits1: data.units.toString(),
      chkLAP: data.chkLAP || "on",
      chkLGD: data.chkLGD || "on",
      chkAN: data.chkAN || "on",
      // shipPallet: "N",
    });

    // ✅ FIX: Convert URLSearchParams to plain object for logging
    const paramsObject = Object.fromEntries(params.entries());
    console.log("\n🟢 SEFL Request:", JSON.stringify(paramsObject, null, 2));

    try {
      const response = await axios.post<SEFLQuoteResponse>(
        `${this.baseUrl}/submitQuote`,
        params,
        {
          auth: {
            username: this.config.username,
            password: this.config.password,
          },
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
          },
          timeout: this.timeout,
        },
      );

      const result = response.data;

      if (result.errorOccured === "true") {
        throw new Error(
          `SEFL API Error: ${result.errorMessage || "Unknown error"}`,
        );
      }

      if (!result.quoteNumber) {
        throw new Error("No quote number returned from SEFL");
      }

      return result.quoteNumber;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === "ECONNABORTED") {
          throw new Error("SEFL request timeout");
        }
        if (error.response) {
          throw new Error(
            `SEFL API returned status ${error.response.status}: ${JSON.stringify(error.response.data)}`,
          );
        }
        if (error.request) {
          throw new Error("No response from SEFL API");
        }
      }
      throw error;
    }
  }

  private async getQuoteWithRetry(
    quoteNumber: string,
  ): Promise<SEFLQuoteDetails> {
    let retries = 0;

    try {
      const quoteDetails = await this.getQuote(quoteNumber);

      console.log(
        "SEFL Quote Details:================================>",
        JSON.stringify(quoteDetails, null, 2),
      );

      // ✅ Check if quote is ready (has actual rate data)
      if (quoteDetails.rateQuote && quoteDetails.rateQuote !== "") {
        console.log(
          `✅ SEFL quote ${quoteNumber} ready with rate: $${quoteDetails.rateQuote}`,
        );
        return quoteDetails;
      }

      // Quote is still being processed
      console.log(
        `⏳ SEFL quote ${quoteNumber} still processing (status: ${quoteDetails.status || "unknown"}). Retry ${retries + 1}/${this.maxRetries}...`,
      );

      // Don't sleep after the last retry
      if (retries < this.maxRetries - 1) {
        await this.sleep(this.retryDelay);
      }
    } catch (error) {
      console.warn(
        `⚠️ Error fetching SEFL quote (attempt ${retries + 1}/${this.maxRetries}):`,
        error instanceof Error ? error.message : error,
      );

      // Re-throw on last attempt
      if (retries >= this.maxRetries - 1) {
        throw error;
      }

      await this.sleep(this.retryDelay);
    }

    throw new Error(
      `Quote ${quoteNumber} still not ready after ${this.maxRetries} attempts. Try fetching later.`,
    );
  }

  private async getQuote(quoteNumber: string): Promise<SEFLQuoteDetails> {
    try {
      const response = await axios.get<SEFLQuoteDetails>(
        `${this.baseUrl}/${quoteNumber}?ReturnDetail=Y`,
        {
          auth: {
            username: this.config.username,
            password: this.config.password,
          },
          params: {
            ReturnDetail: "Y",
          },
          headers: {
            Accept: "application/json",
          },
          timeout: this.timeout,
        },
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === "ECONNABORTED") {
          throw new Error("Timeout fetching SEFL quote details");
        }
        if (error.response?.status === 404) {
          throw new Error(`SEFL quote ${quoteNumber} not found`);
        }
      }
      throw error;
    }
  }

  private parsePickupDate(date: string | Date): {
    month: string;
    day: string;
    year: string;
  } {
    let dateObj: Date;

    if (typeof date === "string") {
      dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        throw new Error(`Invalid date string: ${date}`);
      }
    } else if (date instanceof Date) {
      if (isNaN(date.getTime())) {
        throw new Error("Invalid Date object");
      }
      dateObj = date;
    } else {
      // Default to tomorrow
      dateObj = new Date();
      dateObj.setDate(dateObj.getDate() + 1);
    }

    return {
      month: String(dateObj.getMonth() + 1).padStart(2, "0"),
      day: String(dateObj.getDate()).padStart(2, "0"),
      year: String(dateObj.getFullYear()),
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private handleError(error: any): SEFLRate {
    let errorMessage = "Unknown error occurred";

    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === "string") {
      errorMessage = error;
    }

    console.error("❌ SEFL API Error:", errorMessage);

    return {
      success: false,
      error: errorMessage,
      carrier: "SEFL",
    };
  }

  /**
   * Calculate freight class based on density (weight/cubic feet)
   * Uses NMFC (National Motor Freight Classification) standards
   */
  static calculateFreightClass(
    weight: number,
    length: number,
    width: number,
    height: number,
  ): number {
    const cubicFeet = (length * width * height) / 1728;

    if (cubicFeet === 0) {
      throw new Error("Invalid dimensions: cubic feet cannot be zero");
    }

    const density = weight / cubicFeet;

    // NMFC Freight Class by Density (PCF - Pounds per Cubic Foot)
    if (density >= 50) return 50;
    if (density >= 35) return 55;
    if (density >= 30) return 60;
    if (density >= 22.5) return 65;
    if (density >= 15) return 70;
    if (density >= 13.5) return 77.5;
    if (density >= 12) return 85;
    if (density >= 10.5) return 92.5;
    if (density >= 9) return 100;
    if (density >= 8) return 110;
    if (density >= 7) return 125;
    if (density >= 6) return 150;
    if (density >= 5) return 175;
    if (density >= 4) return 200;
    if (density >= 3) return 250;
    if (density >= 2) return 300;
    if (density >= 1) return 400;
    return 500;
  }
}

export default SEFLClient;
export type { SEFLConfig, ShipmentData, SEFLRate };
