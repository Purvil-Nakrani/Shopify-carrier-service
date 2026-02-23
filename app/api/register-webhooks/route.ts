import { NextResponse } from "next/server";

export async function GET() {
  const shop = process.env.SHOPIFY_SHOP_DOMAIN;
  const token = process.env.SHOPIFY_ACCESS_TOKEN;
  const appUrl = process.env.APP_URL;

  const webhooks = [
    {
      topic: "orders/create",
      address: `${appUrl}/api/webhooks/order-created`,
    },
  ];

  const results = [];

  for (const wh of webhooks) {
    const res = await fetch(
      `https://${shop}/admin/api/2025-04/webhooks.json`,
      {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": token!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ webhook: { ...wh, format: "json" } }),
      }
    );
    const data = await res.json();
    results.push(data);
    console.log(`✅ Webhook registered: ${wh.topic}`);
  }

  return NextResponse.json({ success: true, results });
}