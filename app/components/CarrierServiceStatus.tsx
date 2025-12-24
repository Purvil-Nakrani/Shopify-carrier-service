'use client';

import { useEffect, useState } from 'react';

interface CarrierService {
  id: number;
  name: string;
  active: boolean;
  service_discovery: boolean;
  carrier_service_type: string;
  admin_graphql_api_id: string;
  format: string;
  callback_url: string;
}

export default function CarrierServiceStatus() {
  const [loading, setLoading] = useState(true);
  const [carrierService, setCarrierService] = useState<CarrierService | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCarrierService();
  }, []);

  const fetchCarrierService = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/setup');
      const data = await response.json();

      if (data.success && data.carrier_services?.carrier_services) {
        const wwexService = data.carrier_services.carrier_services.find(
          (s: CarrierService) => s.name === 'WWEX Freight Shipping'
        );
        setCarrierService(wwexService || null);
      } else {
        setError('No carrier services found');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch carrier service');
      console.error('🔴 Error fetching carrier service:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        background: '#f5f5f5',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h2>Loading carrier service status...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        background: '#fff3cd',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
        border: '1px solid #ffc107'
      }}>
        <h2>⚠️ Error Loading Status</h2>
        <p style={{ color: '#856404' }}>{error}</p>
        <button
          onClick={fetchCarrierService}
          style={{
            marginTop: '10px',
            padding: '8px 16px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!carrierService) {
    return (
      <div style={{
        background: '#f8d7da',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
        border: '1px solid #f5c6cb'
      }}>
        <h2>❌ Carrier Service Not Found</h2>
        <p style={{ color: '#721c24' }}>
          The WWEX Freight Shipping carrier service is not registered.
        </p>
        <p style={{ color: '#721c24', fontSize: '14px' }}>
          Please register the carrier service using the button below.
        </p>
      </div>
    );
  }

  const isRunning = carrierService.active;

  return (
    <div style={{
      background: isRunning ? '#d4edda' : '#f8d7da',
      padding: '20px',
      borderRadius: '8px',
      marginBottom: '20px',
      border: `1px solid ${isRunning ? '#c3e6cb' : '#f5c6cb'}`
    }}>
      <h2 style={{ 
        color: isRunning ? '#155724' : '#721c24',
        marginBottom: '15px' 
      }}>
        Status: {isRunning ? 'Running ✓' : 'Not Active ✗'}
      </h2>

      <p style={{ 
        color: isRunning ? '#155724' : '#721c24',
        marginBottom: '20px' 
      }}>
        {isRunning 
          ? 'The carrier service is active and ready to process shipping rate requests.'
          : 'The carrier service is registered but not currently active.'}
      </p>

      <div style={{
        background: 'white',
        padding: '15px',
        borderRadius: '6px',
        fontFamily: 'monospace',
        fontSize: '13px',
        overflowX: 'auto'
      }}>
        <h3 style={{ 
          marginTop: 0, 
          marginBottom: '10px',
          fontFamily: 'system-ui, sans-serif',
          fontSize: '16px'
        }}>
          Carrier Service Details:
        </h3>
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
          {JSON.stringify(carrierService, null, 2)}
        </pre>
      </div>

      <button
        onClick={fetchCarrierService}
        style={{
          marginTop: '15px',
          padding: '8px 16px',
          background: '#6c757d',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px'
        }}
      >
        🔄 Refresh Status
      </button>
    </div>
  );
}
