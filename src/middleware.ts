import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Only apply to root path
  if (pathname === "/") {
    const experienceId =
      request.headers.get("x-whop-experience-id") ??
      request.headers.get("X-Whop-Experience-Id");

    // If we have an experience ID, redirect to the experience route
    if (experienceId) {
      console.log("[middleware] Redirecting root to experience:", experienceId);
      const url = request.nextUrl.clone();
      url.pathname = `/experiences/${experienceId}`;
      return NextResponse.redirect(url);
    }

    // Log that we're at root without experience ID
    const hasUserToken =
      !!request.headers.get("x-whop-user-token") ||
      !!request.headers.get("X-Whop-User-Token");

    console.log("[middleware] Root page accessed - hasUserToken:", hasUserToken, "hasExperienceId:", !!experienceId);
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/",
};
