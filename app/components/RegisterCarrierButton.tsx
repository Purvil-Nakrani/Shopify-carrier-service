'use client';

import { useState } from 'react';

export default function RegisterCarrierButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning', text: string } | null>(null);

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
        // Parse error message for better display
        let errorMessage = 'Unknown error occurred';
        let messageType: 'error' | 'warning' = 'error';

        if (data.error) {
          const errorStr = data.error.toString();
          
          // Check if it's a Shopify API error with details
          if (data.details?.errors) {
            const errors = data.details.errors;
            
            // Handle "already configured" case as a warning
            if (errors.base && errors.base.includes('is already configured')) {
              messageType = 'warning';
              errorMessage = '⚠️ Carrier service is already registered!\n\nThe "WWEX Freight Shipping" service is already configured in your Shopify store. No action needed.';
            } else {
              // Format other Shopify errors nicely
              const errorLines = [];
              for (const [key, messages] of Object.entries(errors)) {
                if (Array.isArray(messages)) {
                  errorLines.push(`${key}: ${messages.join(', ')}`);
                } else {
                  errorLines.push(`${key}: ${messages}`);
                }
              }
              errorMessage = `Shopify API Error:\n${errorLines.join('\n')}`;
            }
          } else {
            // Generic error formatting
            errorMessage = errorStr.replace(/Received an error response.*?from Shopify:\s*/i, '')
                                   .replace(/If you report this error,.*$/i, '')
                                   .trim();
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
            background: 
              message.type === 'success' ? '#d1fae5' : 
              message.type === 'warning' ? '#fef3c7' : 
              '#fee2e2',
            color: 
              message.type === 'success' ? '#065f46' : 
              message.type === 'warning' ? '#92400e' : 
              '#991b1b',
            border: `1px solid ${
              message.type === 'success' ? '#10b981' : 
              message.type === 'warning' ? '#f59e0b' : 
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
