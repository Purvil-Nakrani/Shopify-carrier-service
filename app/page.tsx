import CarrierServiceToggle from './components/CarrierServiceToggle';
import CarrierServiceStatus from './components/CarrierServiceStatus';

export default function Home() {
  return (
    <div style={{ 
      fontFamily: 'system-ui, sans-serif',
      padding: '40px',
      maxWidth: '1200px',
      margin: '0 auto'
    }}>
      <h1 style={{ marginBottom: '30px' }}>Shopify Freight Carrier Service</h1>
      
      {/* Dynamic Carrier Service Status */}
      <CarrierServiceStatus />


      {/* Carrier Service Toggle */}
      <CarrierServiceToggle />

  
    </div>
  );
}
