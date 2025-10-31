import { NextRequest } from "next/server";
import { getOptionalSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const session = await getOptionalSession();

    if (session) {
      return Response.json({
        status: "authenticated",
        user: {
          id: session.user.id,
          displayName: session.user.displayName,
          email: session.user.email,
        },
        macroTarget: session.macroTarget,
        experienceId: session.experienceId,
      });
    } else {
      return Response.json({
        status: "unauthenticated",
        message: "Session is null - authentication failed",
        debug: {
          hasUserToken: !!request.headers.get("x-whop-user-token"),
          hasAppId: !!process.env.WHOP_APP_ID,
          hasApiKey: !!process.env.WHOP_API_KEY,
        },
      });
    }
  } catch (error) {
    return Response.json({
      status: "error",
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : String(error),
    }, { status: 500 });
  }
}
