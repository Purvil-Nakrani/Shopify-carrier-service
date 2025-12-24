import { NextRequest, NextResponse } from "next/server";
import "@shopify/shopify-api/adapters/node";
import { shopifyApi, LATEST_API_VERSION, Session } from "@shopify/shopify-api";

const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY || "",
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  scopes: ["write_shipping"],
  hostName: process.env.SHOPIFY_SHOP_DOMAIN || "",
  apiVersion: LATEST_API_VERSION,
  isEmbeddedApp: false,
});

export async function POST(request: NextRequest) {
  try {
    const session = new Session({
      id: "offline_" + process.env.SHOPIFY_SHOP_DOMAIN!,
      shop: process.env.SHOPIFY_SHOP_DOMAIN!,
      state: "state",
      isOnline: false,
      accessToken: process.env.SHOPIFY_ACCESS_TOKEN!,
      scope: "write_shipping",
    });

    const client = new shopify.clients.Rest({ session });

    // Create carrier service
    const response = await client.post({
      path: "carrier_services",
      data: {
        carrier_service: {
          name: "WWEX Freight Shipping",
          callback_url: process.env.CARRIER_SERVICE_CALLBACK_URL || "",
          service_discovery: true,
          carrier_service_type: "api",
          format: "json",
          active: true,
        },
      },
    });

    console.log("🟢 Carrier service created successfully:", response.body);

    return NextResponse.json({
      success: true,
      message: "Carrier service registered successfully",
      data: response.body,
    });
  } catch (error: any) {
    console.error("🔴 Error registering carrier service:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details: error.response?.body || error,
      },
      { status: 500 }
    );
  }
}

// List existing carrier services
export async function GET() {
  try {
    const session = new Session({
      id: "offline_" + process.env.SHOPIFY_SHOP_DOMAIN!,
      shop: process.env.SHOPIFY_SHOP_DOMAIN!,
      state: "state",
      isOnline: false,
      accessToken: process.env.SHOPIFY_ACCESS_TOKEN!,
      scope: "write_shipping",
    });

    const client = new shopify.clients.Rest({ session });

    const response = await client.get({
      path: "carrier_services",
    });

    return NextResponse.json({
      success: true,
      carrier_services: response.body,
    });
  } catch (error: any) {
    console.error("🔴 Error fetching carrier services:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// Update carrier service (toggle active status)
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const carrierId = searchParams.get("id");
    const body = await request.json();

    if (!carrierId) {
      return NextResponse.json(
        {
          success: false,
          error: "Carrier service ID is required",
        },
        { status: 400 }
      );
    }

    const session = new Session({
      id: "offline_" + process.env.SHOPIFY_SHOP_DOMAIN!,
      shop: process.env.SHOPIFY_SHOP_DOMAIN!,
      state: "state",
      isOnline: false,
      accessToken: process.env.SHOPIFY_ACCESS_TOKEN!,
      scope: "write_shipping",
    });

    const client = new shopify.clients.Rest({ session });

    const response = await client.put({
      path: `carrier_services/${carrierId}`,
      data: {
        carrier_service: {
          active: body.active,
        },
      },
    });

    console.log(`🟢 Carrier service updated to ${body.active ? 'active' : 'inactive'}`);

    return NextResponse.json({
      success: true,
      message: `Carrier service ${body.active ? 'activated' : 'deactivated'} successfully`,
      data: response.body,
    });
  } catch (error: any) {
    console.error("🔴 Error updating carrier service:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details: error.response?.body || error,
      },
      { status: 500 }
    );
  }
}

// Delete carrier service
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const carrierId = searchParams.get("id");

    if (!carrierId) {
      return NextResponse.json(
        {
          success: false,
          error: "Carrier service ID is required",
        },
        { status: 400 }
      );
    }

    const session = new Session({
      id: "offline_" + process.env.SHOPIFY_SHOP_DOMAIN!,
      shop: process.env.SHOPIFY_SHOP_DOMAIN!,
      state: "state",
      isOnline: false,
      accessToken: process.env.SHOPIFY_ACCESS_TOKEN!,
      scope: "write_shipping",
    });

    const client = new shopify.clients.Rest({ session });

    await client.delete({
      path: `carrier_services/${carrierId}`,
    });

    return NextResponse.json({
      success: true,
      message: "Carrier service deleted successfully",
    });
  } catch (error: any) {
    console.error("🔴 Error deleting carrier service:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
