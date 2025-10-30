import Whop from "@whop/sdk";

export class WhopConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WhopConfigurationError";
  }
}

let cachedClient: InstanceType<typeof Whop> | null = null;

export function getWhopClient() {
  if (cachedClient) {
    return cachedClient;
  }

  const apiKey = process.env.WHOP_API_KEY;
  const appId = process.env.NEXT_PUBLIC_WHOP_APP_ID;

  if (!apiKey) {
    throw new WhopConfigurationError(
      "Missing WHOP_API_KEY environment variable.",
    );
  }

  if (!appId) {
    throw new WhopConfigurationError(
      "Missing NEXT_PUBLIC_WHOP_APP_ID environment variable.",
    );
  }

  cachedClient = new Whop({
    apiKey,
    appID: appId,
  });

  return cachedClient;
}
