import Whop from "@whop/sdk";

let cachedClient: InstanceType<typeof Whop> | null = null;

export function getWhopClient() {
  if (cachedClient) {
    return cachedClient;
  }

  const apiKey = process.env.WHOP_API_KEY;
  const appId = process.env.NEXT_PUBLIC_WHOP_APP_ID;

  if (!apiKey) {
    throw new Error("Missing WHOP_API_KEY environment variable.");
  }

  if (!appId) {
    throw new Error("Missing NEXT_PUBLIC_WHOP_APP_ID environment variable.");
  }

  cachedClient = new Whop({
    apiKey,
    appID: appId,
  });

  return cachedClient;
}
