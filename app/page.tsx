import RegisterCarrierButton from './components/RegisterCarrierButton';

export default function Home() {
  return (
    <div style={{ 
      fontFamily: 'system-ui, sans-serif',
      padding: '40px',
      maxWidth: '1200px',
      margin: '0 auto'
    }}>
      <h1 style={{ marginBottom: '30px' }}>Shopify Freight Carrier Service</h1>
      
      <div style={{ 
        background: '#f5f5f5',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h2>Status: Running ✓ (static currently)</h2>
        <p>The carrier service is active and ready to process shipping rate requests.</p>
      </div>

      {/* Register Carrier Service Button */}
      <RegisterCarrierButton />

  
    </div>
  );
}
