'use client';

import { useState, useEffect } from 'react';

interface CarrierService {
  id: number;
  name: string;
  active: boolean;
}

export default function CarrierServiceToggle() {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [carrierService, setCarrierService] = useState<CarrierService | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning' | 'info', text: string } | null>(null);

  useEffect(() => {
    fetchCarrierService();
  }, []);

  const fetchCarrierService = async () => {
    try {
      setFetching(true);
      const response = await fetch('/api/setup');
      const data = await response.json();

      if (data.success && data.carrier_services?.carrier_services) {
        const wwexService = data.carrier_services.carrier_services.find(
          (s: CarrierService) => s.name === 'WWEX Freight Shipping'
        );
        setCarrierService(wwexService || null);
      }
    } catch (err: any) {
      console.error('🔴 Error fetching carrier service:', err);
    } finally {
      setFetching(false);
    }
  };

  const handleToggle = async () => {
    if (!carrierService) {
      // If no carrier service, redirect to register
      handleRegister();
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const newActiveState = !carrierService.active;
      const response = await fetch(`/api/setup?id=${carrierService.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ active: newActiveState }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setCarrierService({ ...carrierService, active: newActiveState });
        setMessage({
          type: 'success',
          text: `✓ Carrier service ${newActiveState ? 'activated' : 'deactivated'} successfully!`,
        });
        
        // Refresh to update the status display
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        setMessage({
          type: 'error',
          text: `✗ Failed to update: ${data.error || 'Unknown error'}`,
        });
      }
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: `✗ Network error: ${error.message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage({
          type: 'success',
          text: '✓ Carrier service registered successfully!',
        });
        // Refresh to get the new carrier service
        setTimeout(() => {
          fetchCarrierService();
        }, 1000);
      } else {
        // Parse error message
        let errorMessage = 'Unknown error occurred';
        let messageType: 'error' | 'warning' = 'error';

        if (data.error) {
          if (data.details?.errors?.base?.includes('is already configured')) {
            messageType = 'warning';
            errorMessage = '⚠️ Carrier service is already registered!\n\nRefreshing...';
            setTimeout(() => {
              fetchCarrierService();
            }, 1500);
          } else {
            errorMessage = data.error;
          }
        }

        setMessage({
          type: messageType,
          text: errorMessage,
        });
      }
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: `✗ Network error: ${error.message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div style={{ marginBottom: '30px' }}>
        <div style={{ 
          padding: '12px', 
          background: '#f5f5f5', 
          borderRadius: '6px',
          color: '#666',
          fontSize: '14px'
        }}>
          Loading carrier service...
        </div>
      </div>
    );
  }

  const isActive = carrierService?.active || false;
  const exists = !!carrierService;

  return (
    <div style={{ marginBottom: '30px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        padding: '20px',
        background: '#ffffff',
        border: '2px solid #e5e7eb',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}>
        {/* Toggle Switch */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={handleToggle}
            disabled={loading || !exists}
            style={{
              position: 'relative',
              width: '64px',
              height: '32px',
              background: exists && isActive ? '#10b981' : '#d1d5db',
              borderRadius: '16px',
              border: 'none',
              cursor: loading || !exists ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.3s',
              opacity: loading ? 0.6 : 1,
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: '2px',
                left: exists && isActive ? '34px' : '2px',
                width: '28px',
                height: '28px',
                background: 'white',
                borderRadius: '50%',
                transition: 'left 0.3s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              }}
            />
          </button>

          <div>
            <div style={{ 
              fontSize: '16px', 
              fontWeight: '600',
              color: '#111827',
            }}>
              {exists ? (isActive ? '🟢 Active' : '🔴 Inactive') : '⚪ Not Registered'}
            </div>
            <div style={{ 
              fontSize: '13px', 
              color: '#6b7280',
              marginTop: '2px'
            }}>
              {exists 
                ? 'Toggle to enable/disable carrier service' 
                : 'Register the carrier service first'}
            </div>
          </div>
        </div>

        {/* Register Button (if not exists) */}
        {!exists && (
          <button
            onClick={handleRegister}
            disabled={loading}
            style={{
              marginLeft: 'auto',
              background: loading ? '#ccc' : '#2563eb',
              color: 'white',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '600',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {loading ? '⏳ Registering...' : '🚀 Register Service'}
          </button>
        )}
      </div>

      {/* Message Display */}
      {message && (
        <div
          style={{
            marginTop: '12px',
            padding: '12px 16px',
            borderRadius: '6px',
            background: 
              message.type === 'success' ? '#d1fae5' : 
              message.type === 'warning' ? '#fef3c7' :
              message.type === 'info' ? '#dbeafe' :
              '#fee2e2',
            color: 
              message.type === 'success' ? '#065f46' : 
              message.type === 'warning' ? '#92400e' :
              message.type === 'info' ? '#1e40af' :
              '#991b1b',
            border: `1px solid ${
              message.type === 'success' ? '#10b981' : 
              message.type === 'warning' ? '#f59e0b' :
              message.type === 'info' ? '#3b82f6' :
              '#ef4444'
            }`,
            whiteSpace: 'pre-line',
            fontSize: '14px',
            lineHeight: '1.5',
          }}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
