import { NextRequest } from "next/server";
import { getWhopClient } from "@/lib/whop";

export async function GET(request: NextRequest) {
  const token =
    request.headers.get("x-whop-user-token") ??
    request.headers.get("X-Whop-User-Token");

  if (!token) {
    return Response.json({
      error: "No token found in headers",
    }, { status: 400 });
  }

  const appId = process.env.WHOP_APP_ID ?? process.env.NEXT_PUBLIC_WHOP_APP_ID;

  if (!appId) {
    return Response.json({
      error: "WHOP_APP_ID not configured",
    }, { status: 500 });
  }

  try {
    const client = getWhopClient();
    console.log("[verify-token] Using appId:", appId);
    console.log("[verify-token] Token (first 20 chars):", token.substring(0, 20));

    const validation = await client.verifyUserToken(token, {
      appId,
    });

    return Response.json({
      success: true,
      validation: {
        userId: validation?.userId,
        hasValidation: !!validation,
      },
    });
  } catch (error) {
    console.error("[verify-token] Error:", error);

    return Response.json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : String(error),
        name: error instanceof Error ? error.name : "Unknown",
        stack: error instanceof Error ? error.stack : undefined,
        fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      },
      config: {
        hasClient: true,
        appId: appId,
        tokenLength: token.length,
      },
    }, { status: 500 });
  }
}
