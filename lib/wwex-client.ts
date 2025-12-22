import axios from 'axios';

interface WWEXRateRequest {
  origin: {
    postalCode: string;
    country: string;
  };
  destination: {
    postalCode: string;
    city: string;
    province: string;
    country: string;
  };
  items: Array<{
    weight: number;
    length: number;
    width: number;
    height: number;
    quantity: number;
  }>;
}

interface WWEXRateResponse {
  quoteId: string;
  rate: number;
  transitDays: number;
  serviceLevel: string;
  currency: string;
}

export class WWEXClient {
  private apiUrl: string;
  private apiKey: string;
  private accountNumber: string;
  
  constructor() {
    this.apiUrl = process.env.WWEX_API_URL || '';
    this.apiKey = process.env.WWEX_API_KEY || '';
    this.accountNumber = process.env.WWEX_ACCOUNT_NUMBER || '';
  }

  async getFreightRate(request: any): Promise<any> {
    const startTime = Date.now();
    
    try {
      // Prepare WWEX API request
      const wwexRequest = {
        accountNumber: this.accountNumber,
        shipmentType: 'LTL', // Less Than Truckload
        origin: {
          postalCode: request.origin.postalCode,
          country: request.origin.country
        },
        destination: {
          postalCode: request.destination.postalCode,
          city: request.destination.city,
          state: request.destination.province,
          country: request.destination.country
        },
        items: request.items.map((item:any) => ({
          weight: item.weight,
          weightUnit: 'LBS',
          dimensions: {
            length: item.length,
            width: item.width,
            height: item.height,
            unit: 'IN'
          },
          quantity: item.quantity,
          freightClass: this.calculateFreightClass(item.weight, this.calculateVolume(item))
        }))
      };

      // Make API call to WWEX
      const response = await axios.post(
        `${this.apiUrl}/quotes`,
        wwexRequest,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 6000 // 6 second timeout to stay under 7 second requirement
        }
      );

      const responseTime = Date.now() - startTime;
      console.log(`🟢 WWEX API response time: ${responseTime}ms`);

      // Parse WWEX response
      if (response.data && response.data.quote) {
        return {
          quoteId: response.data.quoteId || `WWEX-${Date.now()}`,
          rate: parseFloat(response.data.quote.totalCharge || 0),
          transitDays: parseInt(response.data.quote.transitTime || 5),
          serviceLevel: response.data.quote.serviceLevel || 'Standard Freight',
          currency: 'USD'
        };
      }

      throw new Error('Invalid WWEX API response');
      
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      console.error('🔴 WWEX API Error:', error.message);
      
      // Return fallback rate if WWEX fails
      return this.getFallbackRate(request, responseTime);
    }
  }

  // Calculate freight class based on weight and volume (density)
  private calculateFreightClass(weight: number, volume: number): string {
    if (volume === 0) return '70'; // Default class
    
    const density = weight / volume; // pounds per cubic foot
    
    if (density >= 30) return '50';
    if (density >= 22.5) return '55';
    if (density >= 15) return '60';
    if (density >= 13.5) return '65';
    if (density >= 12) return '70';
    if (density >= 10.5) return '77.5';
    if (density >= 9) return '85';
    if (density >= 8) return '92.5';
    if (density >= 7) return '100';
    if (density >= 6) return '110';
    if (density >= 5) return '125';
    if (density >= 4) return '150';
    if (density >= 3) return '175';
    if (density >= 2) return '200';
    if (density >= 1) return '250';
    return '300';
  }

  // Calculate volume in cubic feet
  private calculateVolume(item: { length: number; width: number; height: number }): number {
    // Convert inches to feet and calculate volume
    const volumeCubicInches = item.length * item.width * item.height;
    return volumeCubicInches / 1728; // Convert to cubic feet
  }

  // Fallback rate calculation if WWEX API fails
  private getFallbackRate(request: WWEXRateRequest, responseTime: number): WWEXRateResponse {
    console.log('🟢 Using fallback rate calculation');
    
    // Calculate total weight
    const totalWeight = request.items.reduce((sum, item) => 
      sum + (item.weight * item.quantity), 0
    );

    // Simple distance-based estimation (you can make this more sophisticated)
    const baseRate = 150; // Base rate
    const perLbRate = 0.50; // Per pound rate
    const estimatedRate = baseRate + (totalWeight * perLbRate);

    return {
      quoteId: `FALLBACK-${Date.now()}`,
      rate: Math.round(estimatedRate * 100) / 100,
      transitDays: 7, // Default transit time
      serviceLevel: 'Standard Freight (Estimated)',
      currency: 'USD'
    };
  }
}

export default WWEXClient;
