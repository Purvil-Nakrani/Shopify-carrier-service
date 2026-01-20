"use client";
import axios from "axios";
import React, { useEffect, useState } from "react";

const CarrierServiceRate = () => {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rate, setRate] = useState<any>(null);
  const [hasFetched, setHasFetched] = useState(false);

  const fetchRate = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const res = await axios.get(`/api/speedship-estimate`);
      console.log("res.data==================================>", res.data.data);

      if (res.data.success) {
        setRate(res.data.data);
        setHasFetched(true);
        setError(null);
      } else {
        setError("Failed to load rate data");
      }
    } catch (err) {
      console.error("Failed to fetch rate", err);
      setError("Unable to connect to shipping service");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /* ---------------------------------
     FIRST LOAD – FETCH BUTTON ONLY
  ---------------------------------- */
  if (!hasFetched) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: "center", padding: "40px" }}>
          <h2>WWEX Shipping Rate</h2>
          <p style={{ marginBottom: "20px" }}>
            Click below to fetch the latest WWEX carrier service rate.
          </p>

          <button
            className="refresh-button"
            onClick={() => fetchRate()}
            disabled={loading}
          >
            {loading ? "Fetching..." : "🚚 Fetch WWEX Carrier Service Rate"}
          </button>
        </div>
        {/* Usage Instructions */}
        <div className="card usage-notes" style={{ marginTop: "24px" }}>
          <div className="card-header">
            <h2>How to Use This Shipping Rate</h2>
            <span className="info-icon">ℹ️</span>
          </div>

          <ol className="usage-steps">
            <li>
              Go to your <strong>Shopify checkout page</strong> and enter the
              complete
              <strong> destination address</strong>.
            </li>
            <li>
              Wait until the <strong>shipping cost is displayed</strong> on the
              Shopify checkout page.
            </li>
            <li>
              After the shipping cost appears,{" "}
              <strong>open or redirect to this page</strong>.
            </li>
            <li>
              Click the <strong>🔄 Refresh</strong> button to fetch the
              <strong> latest WWEX shipping rate</strong>.
            </li>
            <li>
              The refreshed rate shown here represents the
              <strong> most recent carrier-calculated freight cost</strong>.
            </li>
          </ol>

          <p className="usage-note">
            ⚠️ <strong>Important:</strong> Always click <em>Refresh</em> after
            updating the address in Shopify to ensure the latest shipping rate
            is fetched.
          </p>
        </div>
      </div>
    );
  }

  /* ---------------------------------
     LOADING STATE
  ---------------------------------- */
  if (loading || refreshing) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p className="loading-text">Loading freight rate...</p>
      </div>
    );
  }

  /* ---------------------------------
     ERROR STATE
  ---------------------------------- */
  if (error || !rate) {
    return (
      <div className="error-container">
        <div className="error-icon">⚠️</div>
        <h2>Unable to Load Rates</h2>
        <p>{error || "No freight rate available"}</p>
        <button className="retry-button" onClick={() => fetchRate()}>
          Try Again
        </button>
      </div>
    );
  }

  /* ---------------------------------
     NORMALIZE ITEMS
  ---------------------------------- */
  const normalizedItems = rate.items.map((item: any) => {
    const grams = Number(item.grams) || 0;

    let calculatedWeightLbs;

    if (item.properties?.["Width (ft)"] && item.properties?.["Length (ft)"]) {
      const width = parseFloat(item.properties["Width (ft)"]);
      const length = parseFloat(item.properties["Length (ft)"]);
      const areaSqFt = width * length;
      const perSqFTWeight = Number((grams / 453.592).toFixed(2));
      calculatedWeightLbs = perSqFTWeight * areaSqFt;
    } else {
      calculatedWeightLbs = Number((grams / 453.592).toFixed(2));
    }

    return { ...item, calculatedWeightLbs };
  });

  return (
    <div className="container">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="header-icon">🚚</div>
          <div>
            <h1>WWEX Shipping Rate Estimate</h1>
            <p className="header-subtitle">
              Carrier service rate calculated for your shipment
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "18px" }}>
          <div className="status-badge">
            <span className="status-icon">✓</span>
            Rate Available
          </div>

          <button
            className="refresh-button"
            onClick={() => fetchRate(true)}
            disabled={refreshing}
          >
            {refreshing ? (
              <span className="refresh-spinner">
                <svg className="spinner-svg" viewBox="0 0 50 50">
                  <circle
                    className="spinner-circle"
                    cx="25"
                    cy="25"
                    r="20"
                    fill="none"
                    strokeWidth="4"
                  />
                </svg>
              </span>
            ) : (
              "🔄 Refresh"
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="grid-layout">
        {/* Left Column - Shipping Details */}
        <div className="left-column">
          {/* Rate Summary Card */}
          <div className="card rate-summary">
            <div className="card-header">
              <h2>Shipping Summary</h2>
              <span className="rate-badge">${rate.rate.toFixed(2)}</span>
            </div>

            <div className="rate-details">
              <div className="detail-item">
                <div className="detail-icon">💰</div>
                <div>
                  <p className="detail-label">Total Cost</p>
                  <p className="detail-value">${rate.rate.toFixed(2)}</p>
                </div>
              </div>

              <div className="detail-item">
                <div className="detail-icon">📅</div>
                <div>
                  <p className="detail-label">Estimated Transit</p>
                  <p className="detail-value">{rate.transitDays} days</p>
                </div>
              </div>
            </div>

            <div className="rate-footer">
              <p className="timestamp">
                Generated: {new Date(rate.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Destination Card */}
          <div className="card" style={{ marginTop: "15px" }}>
            <div className="card-header">
              <h2>Destination</h2>
              <span className="destination-icon">📍</span>
            </div>

            <div className="destination-content">
              <p className="address-line">{rate.destination.address1}</p>
              <p className="city-state">
                {rate.destination.city}, {rate.destination.province}{" "}
                {rate.destination.postal_code}
              </p>
              <p className="country">{rate.destination.country}</p>
            </div>
          </div>
        </div>

        {/* Right Column - Products */}
        <div className="right-column">
          <div className="card products-card">
            <div className="card-header">
              <h2>Shipment Contents</h2>
              <span className="package-icon">📦</span>
            </div>

            <div className="table-container">
              <table className="products-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Quantity</th>
                    <th>Weight</th>
                    <th>Price</th>
                  </tr>
                </thead>
                <tbody>
                  {normalizedItems.map((item: any, index: number) => (
                    <tr key={index}>
                      <td>
                        <div className="product-name">{item.name}</div>
                      </td>
                      <td>
                        <code className="sku">{item.sku}</code>
                      </td>
                      <td>
                        <span className="quantity">{item.quantity}</span>
                      </td>
                      <td>
                        <span className="weight">
                          {item.calculatedWeightLbs?.toFixed(2)} lbs
                        </span>
                      </td>
                      <td>
                        <span className="price">{item.price / 100}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3}></td>
                    <td className="total-label">Total Items:</td>
                    <td className="total-value">
                      {rate.items.reduce(
                        (sum: number, item: any) => sum + item.quantity,
                        0,
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={3}></td>
                    <td className="total-label">Total Weight:</td>
                    <td className="total-value">
                      {normalizedItems
                        .reduce(
                          (sum: number, item: any) =>
                            sum + item.calculatedWeightLbs,
                          0,
                        )
                        .toFixed(2)}{" "}
                      lbs
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>
      {/* Usage Instructions */}
      <div className="card usage-notes" style={{ marginTop: "24px" }}>
        <div className="card-header">
          <h2>How to Use This Shipping Rate</h2>
          <span className="info-icon">ℹ️</span>
        </div>

        <ol className="usage-steps">
          <li>
            Go to your <strong>Shopify checkout page</strong> and enter the
            complete
            <strong> destination address</strong>.
          </li>
          <li>
            Wait until the <strong>shipping cost is displayed</strong> on the
            Shopify checkout page.
          </li>
          <li>
            After the shipping cost appears,{" "}
            <strong>open or redirect to this page</strong>.
          </li>
          <li>
            Click the <strong>🔄 Refresh</strong> button to fetch the
            <strong> latest WWEX shipping rate</strong>.
          </li>
          <li>
            The refreshed rate shown here represents the
            <strong> most recent carrier-calculated freight cost</strong>.
          </li>
        </ol>

        <p className="usage-note">
          ⚠️ <strong>Important:</strong> Always click <em>Refresh</em> after
          updating the address in Shopify to ensure the latest shipping rate is
          fetched.
        </p>
      </div>
    </div>
  );
};

export default CarrierServiceRate;
