// // import { NextRequest, NextResponse } from "next/server";
// // import crypto from "crypto";

// // function verifyWebhook(rawBody: string, hmacHeader: string): boolean {
// //   const secret = process.env.SHOPIFY_API_SECRET || "";
// //   const hash = crypto
// //     .createHmac("sha256", secret)
// //     .update(rawBody, "utf8")
// //     .digest("base64");
// //   return hash === hmacHeader;
// // }

// // async function getOrderNote(order: any): Promise<string> {
// //   const shippingLines = order.shipping_lines || [];
// //   const selectedShipping = shippingLines[0];

// //   if (!selectedShipping) return "";

// //   // Get the rate comparison data stored in order metafields or attributes
// //   const noteAttributes = order.note_attributes || [];
// //   const rateBreakdown = noteAttributes.find(
// //     (attr: any) => attr.name === "_rate_breakdown"
// //   );

// //   let note = order.note ? order.note + "\n\n" : "";
// //   note += `Shipping cost\n`;

// //   if (rateBreakdown?.value) {
// //     // Use stored rate breakdown from checkout
// //     note += rateBreakdown.value;
// //   } else {
// //     // Fallback: just show selected rate
// //     const price = parseFloat(selectedShipping.price);
// //     note += `${selectedShipping.title} - $${price.toFixed(2)}\n`;
// //   }

// //   return note;
// // }

// // async function updateOrderNote(orderId: string, note: string) {
// //   const shop = process.env.SHOPIFY_SHOP_DOMAIN;
// //   const token = process.env.SHOPIFY_ACCESS_TOKEN;

// //   const res = await fetch(
// //     `https://${shop}/admin/api/2024-01/orders/${orderId}.json`,
// //     {
// //       method: "PUT",
// //       headers: {
// //         "X-Shopify-Access-Token": token!,
// //         "Content-Type": "application/json",
// //       },
// //       body: JSON.stringify({ order: { id: orderId, note } }),
// //     }
// //   );

// //   return res.json();
// // }

// // export async function POST(request: NextRequest) {
// //   const rawBody = await request.text();
// //   const hmacHeader = request.headers.get("X-Shopify-Hmac-Sha256") || "";

// //   // if (!verifyWebhook(rawBody, hmacHeader)) {
// //   //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
// //   // }

// //   const order = JSON.parse(rawBody);
// //   const note = await getOrderNote(order);

// //   if (note) {
// //     // await updateOrderNote(order.id, note);
// //     console.log("note=====================================>",note)
// //     console.log(`✅ Note added to Order #${order.order_number}`);
// //   }

// //   return NextResponse.json({ success: true });
// // }

// import { NextRequest, NextResponse } from "next/server";
// import crypto from "crypto";

// function verifyWebhook(rawBody: string, hmacHeader: string): boolean {
//   const secret = process.env.SHOPIFY_API_SECRET || "";
//   const hash = crypto
//     .createHmac("sha256", secret)
//     .update(rawBody, "utf8")
//     .digest("base64");
//   return hash === hmacHeader;
// }

// // async function updateOrderNote(orderId: string, note: string) {
// //   const shop = process.env.SHOPIFY_SHOP_DOMAIN;
// //   const token = process.env.SHOPIFY_ACCESS_TOKEN;

// //   console.log(`📝 Updating Order: ${orderId}`);
// //   console.log(`📝 Note: ${note}`);

// //   const res = await fetch(
// //     `https://${shop}/admin/api/2025-04/orders/${orderId}.json`,
// //     {
// //       method: "PUT",
// //       headers: {
// //         "X-Shopify-Access-Token": token!,
// //         "Content-Type": "application/json",
// //       },
// //       body: JSON.stringify({ order: { id: orderId, note } }),
// //     }
// //   );

// //   const data = await res.json();
// //   console.log("Shopify response:", JSON.stringify(data));
// //   return data;
// // }
// async function updateOrderNote(orderId: string, newNote: string) {
//   const shop = process.env.SHOPIFY_SHOP_DOMAIN;
//   const token = process.env.SHOPIFY_ACCESS_TOKEN;

//   const getRes = await fetch(
//     `https://${shop}/admin/api/2025-04/orders/${orderId}.json`,
//     {
//       method: "GET",
//       headers: { "X-Shopify-Access-Token": token!, "Content-Type": "application/json" },
//     }
//   );

//   const existingOrder = await getRes.json();
//   const existingNote = existingOrder.order?.note || "";

//   // ✅ Skip if breakdown already added
//   if (existingNote.includes("Shipping costs\n")) {
//     console.log(`⏭️ Breakdown already exists for Order ${orderId}, skipping`);
//     return;
//   }

//   const combinedNote = existingNote ? `${existingNote}\n${newNote}` : newNote;

//   await fetch(
//     `https://${shop}/admin/api/2025-04/orders/${orderId}.json`,
//     {
//       method: "PUT",
//       headers: { "X-Shopify-Access-Token": token!, "Content-Type": "application/json" },
//       body: JSON.stringify({ order: { id: orderId, note: combinedNote } }),
//     }
//   );

//   console.log(`✅ Note updated for Order ${orderId}`);
// }

// // function buildRateNote(order: any): string {
// //   const shippingLines = order.shipping_lines || [];
// //   const noteAttributes = order.note_attributes || [];

// //   // Check for stored rate breakdown
// //   const rateBreakdown = noteAttributes.find(
// //     (attr: any) => attr.name === "_rate_breakdown"
// //   );

// //   let note = order.note ? order.note + "\n\n" : "";
// //   note += `Shipping cost\n`;

// //   if (rateBreakdown?.value) {
// //     note += rateBreakdown.value;
// //   } else if (shippingLines.length > 0) {
// //     const line = shippingLines[0];
// //     const price = parseFloat(line.price);
// //     note += `${line.title} - $${price.toFixed(2)}\n`;
// //   }

// //   return note;
// // }
// function buildRateNote(order: any, rateBreakdown: string): string {
//   const shippingLines = order.shipping_lines || [];

//   let note = `Shipping costs\n`;

//   if (rateBreakdown) {
//     // ✅ rateBreakdown is already a string, use it directly
//     note += rateBreakdown;
//   } else if (shippingLines.length > 0) {
//     // Fallback if no breakdown available
//     const line = shippingLines[0];
//     note += `${line.title} - $${parseFloat(line.price).toFixed(2)}`;
//   }

//   return note;
// }
// // function buildRateNote(order: any, rateBreakdown: any): string {
// //   const shippingLines = order.shipping_lines || [];
// //   const noteAttributes = order.note_attributes || [];

// //   // const rateBreakdown = noteAttributes.find(
// //   //   (attr: any) => attr.name === "_rate_breakdown",
// //   // );

// //   // ✅ Only build the NEW part of the note (no order.note here)
// //   let note = `Shipping cost\n`;

// //   if (rateBreakdown?.value) {
// //     note += rateBreakdown.value;
// //   } else if (shippingLines.length > 0) {
// //     const line = shippingLines[0];
// //     const price = parseFloat(line.price);
// //     note += `${line.title} - $${price.toFixed(2)}\n`;
// //   }

// //   return note;
// // }

// async function buildRateBreakdownFromOrder(order: any): Promise<string> {
//   const shippingAddress = order.shipping_address || {};
//   const lineItems = order.line_items || [];

//   // ✅ Build the same payload format your carrier service expects
//   const carrierPayload = {
//     rate: {
//       origin: {
//         country: "US",
//         postal_code: "27041",
//         province: "NC",
//         city: "Pilot Mountain",
//         address1: "312 East 52 Bypass",
//         phone: "",
//         company: "",
//         first_name: "",
//         last_name: "",
//       },
//       destination: {
//         country: "US",
//         postal_code: shippingAddress.zip || "",
//         province:
//           shippingAddress.province_code || shippingAddress.province || "",
//         city: shippingAddress.city || "",
//         address1: shippingAddress.address1 || "",
//         phone: shippingAddress.phone || "",
//         company: shippingAddress.company || "",
//         first_name: shippingAddress.first_name || "",
//         last_name: shippingAddress.last_name || "",
//       },
//       items: lineItems.map((item: any) => ({
//         name: item.name,
//         sku: item.sku || "",
//         quantity: item.quantity || 1,
//         grams: item.grams || 0,
//         price: Math.round(parseFloat(item.price) * 100),
//         product_id: item.product_id,
//         variant_id: item.variant_id,
//         properties: item.properties
//           ? Object.fromEntries(
//               item.properties.map((p: any) => [p.name, p.value]),
//             )
//           : {},
//       })),
//     },
//   };

//   // ✅ Call your own carrier service API internally
//   const baseUrl = process.env.APP_URL || "https://your-domain.com";

//   const response = await fetch(`${baseUrl}/api/speedship-estimate`, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       // Skip HMAC verification for internal calls by adding a secret header
//       "X-Internal-Secret": "",
//     },
//     body: JSON.stringify(carrierPayload),
//   });

//   // const data = await response.json();
//   // const rates = data.rates || [];

//   // if (rates.length === 0) return "";

//   // // ✅ Format as breakdown note (all rates returned, not just the selected one)
//   // const breakdown = rates
//   //   .map(
//   //     (r: any) =>
//   //       `${r.service_name} - $${(parseInt(r.total_price) / 100).toFixed(2)}`,
//   //   )
//   //   .join("\n");

//   // return breakdown;
//   const data = await response.json();

//   console.log("data====================>",data)

//   // ✅ Read breakdown directly from response
//   if (data.rates[0]._breakdown) {
//     return data.rates[0]._breakdown;
//   }

//   // Fallback: build from rates array
//   const rates = data.rates || [];
//   if (rates.length === 0) return "";

//   const breakdown = rates
//     .map(
//       (r: any) =>
//         `${r.service_name} - $${(parseInt(r.total_price) / 100).toFixed(2)}`,
//     )
//     .join("\n");

//   return breakdown;
// }

// // ✅ WEBHOOK HANDLER (called by Shopify)
// // export async function POST(request: NextRequest) {
// //   try {
// //     const rawBody = await request.text();
// //     const hmacHeader = request.headers.get("X-Shopify-Hmac-Sha256") || "";

// //     // Comment out for testing, uncomment for production
// //     // if (!verifyWebhook(rawBody, hmacHeader)) {
// //     //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
// //     // }

// //     const order = JSON.parse(rawBody);
// //     console.log(`\n📦 Order Received: #${order.order_number}`);
// //     console.log(`   Order ID: ${order.id}`);

// //     const rateBreakdown = await buildRateBreakdownFromOrder(order);
// //     console.log("📋 Rate breakdown from re-call:", rateBreakdown);

// //     const note = buildRateNote(order,rateBreakdown);
// //     console.log("note===============================================>", note);

// //     if (note) {
// //       const result = await updateOrderNote(String(order.id), note);
// //       console.log(
// //         "result=============================================>",
// //         result,
// //       );
// //       console.log(`✅ Note added to Order #${order.order_number}`);
// //       return NextResponse.json({
// //         success: true,
// //         note,
// //         order_number: order.order_number,
// //       });
// //     }

// //     return NextResponse.json({ success: true, message: "No note to add" });
// //   } catch (error: any) {
// //     console.error("🔴 Error:", error.message);
// //     return NextResponse.json({ error: error.message }, { status: 500 });
// //   }
// // }
// export async function POST(request: NextRequest) {
//   const rawBody = await request.text();
//   const order = JSON.parse(rawBody);

//   // ✅ Respond to Shopify immediately
//   const response = NextResponse.json({ success: true }, { status: 200 });

//   // ✅ Process async in background (don't await)
//   processOrderInBackground(order).catch(console.error);

//   return response;
// }

// async function processOrderInBackground(order: any) {
//   const rateBreakdown = await buildRateBreakdownFromOrder(order);
//   const note = await buildRateNote(order, rateBreakdown);
//   await updateOrderNote(order.id, note);
//   console.log(`✅ Order ${order.order_number} note updated`);
// }

// // ✅ MANUAL TEST HANDLER (called from Postman)
// export async function PUT(request: NextRequest) {
//   try {
//     const body = await request.json();
//     const { orderId, note } = body;

//     if (!orderId) {
//       return NextResponse.json(
//         { error: "orderId is required" },
//         { status: 400 },
//       );
//     }

//     const finalNote = note || "Shipping cost\nTest note from Postman";

//     const result = await updateOrderNote(String(orderId), finalNote);

//     return NextResponse.json({
//       success: true,
//       note: finalNote,
//       shopifyResponse: result,
//     });
//   } catch (error: any) {
//     console.error("🔴 Error:", error.message);
//     return NextResponse.json({ error: error.message }, { status: 500 });
//   }
// }



import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

function verifyWebhook(rawBody: string, hmacHeader: string): boolean {
  const secret = process.env.SHOPIFY_API_SECRET || "";
  const hash = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");
  return hash === hmacHeader;
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

  // ✅ Skip if breakdown already added
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
    // ✅ rateBreakdown is already a string, use it directly
    note += rateBreakdown;
  } else if (shippingLines.length > 0) {
    // Fallback if no breakdown available
    const line = shippingLines[0];
    note += `${line.title} - $${parseFloat(line.price).toFixed(2)}`;
  }

  return note;
}

// ✅ CRITICAL FIX: This function now uses the SAME warehouse selection logic as the carrier service
async function buildRateBreakdownFromOrder(order: any): Promise<string> {
  const shippingAddress = order.shipping_address || {};
  const lineItems = order.line_items || [];

  // ✅ The origin is handled by the carrier service itself
  // We just need to pass the items and destination - the carrier service
  // will determine the optimal warehouse(s) using its routing logic
  
  // The carrier service expects this exact format and will handle:
  // 1. Product routing (which warehouse has which products)
  // 2. Distance calculation
  // 3. Multi-origin shipment handling
  const carrierPayload = {
    rate: {
      origin: {
        // ✅ IMPORTANT: The carrier service uses this as a fallback only
        // It will override this based on product availability and distance
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
        province:
          shippingAddress.province_code || shippingAddress.province || "",
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
          ? Object.fromEntries(
              item.properties.map((p: any) => [p.name, p.value]),
            )
          : {},
      })),
    },
  };

  // ✅ Call your own carrier service API internally
  const baseUrl = process.env.APP_URL || "https://your-domain.com";

  console.log(`\n📞 Calling carrier service for Order breakdown...`);
  console.log(`   Destination: ${shippingAddress.city}, ${shippingAddress.province_code || shippingAddress.province}`);
  console.log(`   Items: ${lineItems.length} line items`);

  const response = await fetch(`${baseUrl}/api/speedship-estimate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Skip HMAC verification for internal calls by adding a secret header
      "X-Internal-Secret": process.env.INTERNAL_API_SECRET || "",
    },
    body: JSON.stringify(carrierPayload),
  });

  const data = await response.json();

  console.log("📋 Carrier service response received");

  // ✅ Read breakdown directly from response (includes actual origins used)
  if (data._breakdown) {
    console.log("   ✅ Using breakdown from carrier service response");
    return data._breakdown;
  }

  // ✅ Alternative: check first rate object
  if (data.rates && data.rates[0]?._breakdown) {
    console.log("   ✅ Using breakdown from first rate object");
    return data.rates[0]._breakdown;
  }

  // Fallback: build from rates array (no origin info, but better than nothing)
  const rates = data.rates || [];
  if (rates.length === 0) {
    console.warn("   ⚠️ No rates returned from carrier service");
    return "";
  }

  console.log("   ⚠️ Using fallback breakdown (no origin info available)");
  const breakdown = rates
    .map(
      (r: any) =>
        `${r.service_name} - $${(parseInt(r.total_price) / 100).toFixed(2)}`,
    )
    .join("\n");

  return breakdown;
}

// ✅ WEBHOOK HANDLER (called by Shopify)
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const order = JSON.parse(rawBody);

  console.log(`\n📦 Order webhook received: #${order.order_number} (ID: ${order.id})`);

  // ✅ Respond to Shopify immediately
  const response = NextResponse.json({ success: true }, { status: 200 });

  // ✅ Process async in background (don't await)
  processOrderInBackground(order).catch((error) => {
    console.error(`🔴 Error processing order ${order.order_number}:`, error);
  });

  return response;
}

async function processOrderInBackground(order: any) {
  console.log(`\n🔄 Processing order ${order.order_number} in background...`);
  
  const rateBreakdown = await buildRateBreakdownFromOrder(order);
  
  if (!rateBreakdown) {
    console.warn(`⚠️ No rate breakdown available for order ${order.order_number}`);
    return;
  }

  const note = buildRateNote(order, rateBreakdown);
  await updateOrderNote(order.id, note);
  
  console.log(`✅ Order ${order.order_number} note updated successfully`);
  console.log(`📝 Note content:\n${note}\n`);
}

// ✅ MANUAL TEST HANDLER (called from Postman)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, note } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: "orderId is required" },
        { status: 400 },
      );
    }

    const finalNote = note || "Shipping cost\nTest note from Postman";

    const result = await updateOrderNote(String(orderId), finalNote);

    return NextResponse.json({
      success: true,
      note: finalNote,
      shopifyResponse: result,
    });
  } catch (error: any) {
    console.error("🔴 Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}