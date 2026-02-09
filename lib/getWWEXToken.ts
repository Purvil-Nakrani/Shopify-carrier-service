import axios from "axios";
import prisma from "./prisma-client";

const PROVIDER = "WWEX";

export async function getWWEXToken() {
  const apiUrl = process.env.WWEX_AUTH_TOKEN_URL;
  const clientId = process.env.WWEX_CLIENT_ID;
  const clientSecret = process.env.WWEX_CLIENT_SECRET;

  if (!apiUrl || !clientId || !clientSecret) {
    throw new Error("WWEX credentials missing");
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
      audience: "wwex-apig",
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
