import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const headers: Record<string, string> = {};

  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const whopHeaders = {
    userToken: request.headers.get("x-whop-user-token") ??
               request.headers.get("X-Whop-User-Token") ??
               "NOT FOUND",
    experienceId: request.headers.get("x-whop-experience-id") ??
                  request.headers.get("X-Whop-Experience-Id") ??
                  "NOT FOUND",
  };

  return Response.json({
    message: "Debug endpoint - showing all headers",
    whopSpecificHeaders: whopHeaders,
    allHeaders: headers,
    env: {
      WHOP_APP_ID: process.env.WHOP_APP_ID ? "SET" : "NOT SET",
      NEXT_PUBLIC_WHOP_APP_ID: process.env.NEXT_PUBLIC_WHOP_APP_ID ? "SET" : "NOT SET",
      WHOP_API_KEY: process.env.WHOP_API_KEY ? "SET (hidden)" : "NOT SET",
      DATABASE_URL: process.env.DATABASE_URL ? "SET (hidden)" : "NOT SET",
    },
  }, { status: 200 });
}
