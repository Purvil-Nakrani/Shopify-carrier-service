import axios from "axios";
import prisma from "./prisma-client";

const PROVIDER = "FEDEX";

export async function getFEDEXToken() {
  const apiUrl = process.env.FEDEX_API_URL_SMALL;
  const clientId = process.env.FEDEX_CLIENT_ID_SMALL;
  const clientSecret = process.env.FEDEX_CLIENT_SECRET_SMALL;

  if (!apiUrl || !clientId || !clientSecret) {
    throw new Error("FEDEX credentials missing");
  }

  const now = BigInt(Date.now());

  const tokenRecord = await prisma.apiToken.findUnique({
    where: { provider: PROVIDER },
  });

  if (tokenRecord && now < tokenRecord.expiresAt) {
    return tokenRecord.accessToken;
  }

  const response = await axios.post(
    `${apiUrl}/oauth/token`,
    new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

  const { access_token, expires_in } = response.data;

  const expiresAt = BigInt(
    Date.now() + (expires_in - 60) * 1000
  );

  await prisma.apiToken.upsert({
    where: { provider: PROVIDER },
    update: { accessToken: access_token, expiresAt },
    create: { provider: PROVIDER, accessToken: access_token, expiresAt },
  });

  return access_token;
}
