import axios from 'axios';

interface FedExRateRequest {
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
    totalWeight: number;
    length: number;
    width: number;
    height: number;
    quantity: number;
    perItemWeight: number;
  }>;
}

interface FedExRateResponse {
  quoteId: string;
  rate: number;
  transitDays: number;
  serviceLevel: string;
  currency: string;
  packages: number;
}

export class FedExClient {
  private apiUrl: string;
  private apiKey: string;
  private accountNumber: string;
  
  constructor() {
    this.apiUrl = process.env.FEDEX_API_URL || 'https://apis.fedex.com/ship/v1';
    this.apiKey = process.env.FEDEX_API_KEY || '';
    this.accountNumber = process.env.FEDEX_ACCOUNT_NUMBER || '';
  }

  async getSplitShipmentRate(request: FedExRateRequest): Promise<FedExRateResponse> {
    const startTime = Date.now();
    
    try {
      // Calculate number of packages needed
      // Each package must be under 150 lbs
      const MAX_PACKAGE_WEIGHT = 150;
      let totalPackages = 0;
      let totalRate = 0;
      
      const packageDetails = [];
      
      for (const item of request.items) {
        const perItemWeight = item.perItemWeight;
        const quantity = item.quantity;
        
        // If per-item weight < 150, each item is a separate package
        if (perItemWeight < MAX_PACKAGE_WEIGHT) {
          totalPackages += quantity;
          
          // Each package details
          for (let i = 0; i < quantity; i++) {
            packageDetails.push({
              weight: perItemWeight,
              dimensions: {
                length: item.length,
                width: item.width,
                height: item.height
              }
            });
          }
        }
      }
      
      console.log(`🟢 FedEx: Splitting into ${totalPackages} packages`);
      
      // Prepare FedEx API request for rate quote
      const fedexRequest = {
        accountNumber: {
          value: this.accountNumber
        },
        requestedShipment: {
          shipper: {
            address: {
              postalCode: request.origin.postalCode,
              countryCode: request.origin.country
            }
          },
          recipient: {
            address: {
              postalCode: request.destination.postalCode,
              city: request.destination.city,
              stateOrProvinceCode: request.destination.province,
              countryCode: request.destination.country
            }
          },
          pickupType: 'USE_SCHEDULED_PICKUP',
          serviceType: 'FEDEX_FREIGHT_ECONOMY',
          packagingType: 'YOUR_PACKAGING',
          requestedPackageLineItems: packageDetails.map(pkg => ({
            weight: {
              units: 'LB',
              value: pkg.weight
            },
            dimensions: {
              length: Math.ceil(pkg.dimensions.length),
              width: Math.ceil(pkg.dimensions.width),
              height: Math.ceil(pkg.dimensions.height),
              units: 'IN'
            }
          }))
        }
      };

      // Make API call to FedEx
      const response = await axios.post(
        `${this.apiUrl}/rates/quotes`,
        fedexRequest,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'X-locale': 'en_US'
          },
          timeout: 6000 // 6 second timeout
        }
      );

      const responseTime = Date.now() - startTime;
      console.log(`🟢 FedEx API response time: ${responseTime}ms`);

      // Parse FedEx response
      if (response.data && response.data.output && response.data.output.rateReplyDetails) {
        const rateDetails = response.data.output.rateReplyDetails[0];
        const ratedShipmentDetails = rateDetails.ratedShipmentDetails[0];
        
        return {
          quoteId: `FEDEX-${Date.now()}`,
          rate: parseFloat(ratedShipmentDetails.totalNetCharge || 0),
          transitDays: parseInt(rateDetails.commit?.transitDays || 5),
          serviceLevel: rateDetails.serviceType || 'Freight Economy',
          currency: ratedShipmentDetails.currency || 'USD',
          packages: totalPackages
        };
      }

      throw new Error('Invalid FedEx API response');
      
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      console.error('🔴 FedEx API Error:', error.message);
      
      // Return fallback rate if FedEx fails
      return this.getFallbackRate(request, responseTime);
    }
  }

  // Fallback rate calculation if FedEx API fails
  private getFallbackRate(request: FedExRateRequest, responseTime: number): FedExRateResponse {
    console.log('🟢 Using FedEx fallback rate calculation');
    
    // Calculate total packages
    let totalPackages = 0;
    let totalWeight = 0;
    
    for (const item of request.items) {
      if (item.perItemWeight < 150) {
        totalPackages += item.quantity;
        totalWeight += item.totalWeight;
      }
    }
    
    // Simple rate estimation
    // Base rate per package + per pound rate
    const baseRatePerPackage = 75;
    const perLbRate = 0.35;
    const estimatedRate = (totalPackages * baseRatePerPackage) + (totalWeight * perLbRate);

    return {
      quoteId: `FEDEX-FALLBACK-${Date.now()}`,
      rate: Math.round(estimatedRate * 100) / 100,
      transitDays: 5,
      serviceLevel: 'Freight Economy (Estimated)',
      currency: 'USD',
      packages: totalPackages
    };
  }
}

export default FedExClient;
