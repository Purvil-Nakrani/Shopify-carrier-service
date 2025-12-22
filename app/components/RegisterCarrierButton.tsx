'use client';

import { useState } from 'react';

export default function RegisterCarrierButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

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
          text: '✓ Carrier service registered successfully! Your store can now use WWEX freight shipping.',
        });
      } else {
        setMessage({
          type: 'error',
          text: `✗ Failed to register: ${data.error || 'Unknown error'}`,
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

  return (
    <div style={{ marginBottom: '30px' }}>
      <button
        onClick={handleRegister}
        disabled={loading}
        style={{
          background: loading ? '#ccc' : '#2563eb',
          color: 'white',
          padding: '12px 24px',
          fontSize: '16px',
          fontWeight: '600',
          border: 'none',
          borderRadius: '6px',
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
        onMouseOver={(e) => {
          if (!loading) {
            e.currentTarget.style.background = '#1d4ed8';
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
          }
        }}
        onMouseOut={(e) => {
          if (!loading) {
            e.currentTarget.style.background = '#2563eb';
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
          }
        }}
      >
        {loading ? '⏳ Registering...' : '🚀 Register Carrier Service'}
      </button>

      {message && (
        <div
          style={{
            marginTop: '16px',
            padding: '12px 16px',
            borderRadius: '6px',
            background: message.type === 'success' ? '#d1fae5' : '#fee2e2',
            color: message.type === 'success' ? '#065f46' : '#991b1b',
            border: `1px solid ${message.type === 'success' ? '#10b981' : '#ef4444'}`,
          }}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
