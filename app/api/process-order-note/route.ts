import { NextRequest, NextResponse } from "next/server";

// ✅ Security check — only internal calls allowed
function isInternalRequest(request: NextRequest): boolean {
  const secret = request.headers.get("X-Internal-Secret");
  return secret === process.env.INTERNAL_API_SECRET;
}

async function updateOrderNote(orderId: string, newNote: string) {
  const shop = process.env.SHOPIFY_SHOP_DOMAIN;
  const token = process.env.SHOPIFY_ACCESS_TOKEN;

  const getRes = await fetch(
    `https://${shop}/admin/api/2025-04/orders/${orderId}.json`,
    {
      method: "GET",
      headers: { "X-Shopify-Access-Token": token!, "Content-Type": "application/json" },
    }
  );

  const existingOrder = await getRes.json();
  const existingNote = existingOrder.order?.note || "";

  // ✅ Idempotency guard — skip if already done
  if (existingNote.includes("Shipping costs\n")) {
    console.log(`⏭️ Breakdown already exists for Order ${orderId}, skipping`);
    return;
  }

  const combinedNote = existingNote ? `${existingNote}\n${newNote}` : newNote;

  await fetch(
    `https://${shop}/admin/api/2025-04/orders/${orderId}.json`,
    {
      method: "PUT",
      headers: { "X-Shopify-Access-Token": token!, "Content-Type": "application/json" },
      body: JSON.stringify({ order: { id: orderId, note: combinedNote } }),
    }
  );

  console.log(`✅ Note updated for Order ${orderId}`);
}

function buildRateNote(order: any, rateBreakdown: string): string {
  const shippingLines = order.shipping_lines || [];
  let note = `Shipping costs\n`;

  if (rateBreakdown) {
    note += rateBreakdown;
  } else if (shippingLines.length > 0) {
    const line = shippingLines[0];
    note += `${line.title} - $${parseFloat(line.price).toFixed(2)}`;
  }

  return note;
}

async function buildRateBreakdownFromOrder(order: any): Promise<string> {
  const shippingAddress = order.shipping_address || {};
  const lineItems = order.line_items || [];

  const carrierPayload = {
    rate: {
      origin: {
        country: "US",
        postal_code: "27041",
        province: "NC",
        city: "Pilot Mountain",
        address1: "312 East 52 Bypass",
        phone: "",
        company: "",
        first_name: "",
        last_name: "",
      },
      destination: {
        country: "US",
        postal_code: shippingAddress.zip || "",
        province: shippingAddress.province_code || shippingAddress.province || "",
        city: shippingAddress.city || "",
        address1: shippingAddress.address1 || "",
        phone: shippingAddress.phone || "",
        company: shippingAddress.company || "",
        first_name: shippingAddress.first_name || "",
        last_name: shippingAddress.last_name || "",
      },
      items: lineItems.map((item: any) => ({
        name: item.name,
        sku: item.sku || "",
        quantity: item.quantity || 1,
        grams: item.grams || 0,
        price: Math.round(parseFloat(item.price) * 100),
        product_id: item.product_id,
        variant_id: item.variant_id,
        properties: item.properties
          ? Object.fromEntries(item.properties.map((p: any) => [p.name, p.value]))
          : {},
      })),
    },
  };

  const baseUrl = process.env.APP_URL || "https://your-domain.com";

  const response = await fetch(`${baseUrl}/api/speedship-estimate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Secret": process.env.INTERNAL_API_SECRET || "",
    },
    body: JSON.stringify(carrierPayload),
  });

  const data = await response.json();

  if (data._breakdown) return data._breakdown;
  if (data.rates?.[0]?._breakdown) return data.rates[0]._breakdown;

  const rates = data.rates || [];
  if (rates.length === 0) return "";

  return rates
    .map((r: any) => `${r.service_name} - $${(parseInt(r.total_price) / 100).toFixed(2)}`)
    .join("\n");
}

export async function POST(request: NextRequest) {
  // ✅ Block unauthorized access
  if (!isInternalRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { order } = await request.json();

    console.log(`\n🔄 Processing note for order #${order.order_number}...`);

    const rateBreakdown = await buildRateBreakdownFromOrder(order);

    if (!rateBreakdown) {
      console.warn(`⚠️ No rate breakdown for order ${order.order_number}`);
      return NextResponse.json({ success: false, message: "No rates returned" });
    }

    const note = buildRateNote(order, rateBreakdown);
    await updateOrderNote(String(order.id), note);

    console.log(`✅ Order #${order.order_number} note updated`);
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("🔴 process-order-note error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}