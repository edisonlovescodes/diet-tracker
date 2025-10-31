import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const experienceId = request.headers.get("x-whop-experience-id");
  const userToken = request.headers.get("x-whop-user-token");

  return Response.json({
    requestUrl: request.url,
    pathname: new URL(request.url).pathname,
    experienceId: experienceId ?? "NOT FOUND",
    hasUserToken: !!userToken,
    allWhopHeaders: {
      "x-whop-experience-id": experienceId,
      "x-whop-user-token": userToken ? "PRESENT" : "MISSING",
      "x-whop-app-id": request.headers.get("x-whop-app-id"),
    },
  });
}
