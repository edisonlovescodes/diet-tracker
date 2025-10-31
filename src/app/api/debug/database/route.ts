import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // Try a simple database operation
    const count = await prisma.user.count();

    return Response.json({
      status: "connected",
      userCount: count,
      message: "Database connection successful",
    });
  } catch (error) {
    console.error("[database-debug] Error:", error);

    return Response.json({
      status: "error",
      error: {
        message: error instanceof Error ? error.message : String(error),
        name: error instanceof Error ? error.name : "Unknown",
        stack: error instanceof Error ? error.stack : undefined,
      },
      env: {
        DATABASE_URL: process.env.DATABASE_URL ? "SET (hidden)" : "NOT SET",
        DIRECT_DATABASE_URL: process.env.DIRECT_DATABASE_URL ? "SET (hidden)" : "NOT SET",
      },
    }, { status: 500 });
  }
}
