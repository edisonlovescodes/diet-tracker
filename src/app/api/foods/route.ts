import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireSessionFromRequest,
  UnauthorizedError,
} from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSessionFromRequest(request);
    const url = new URL(request.url);
    const query = url.searchParams.get("q") ?? "";
    const limit = Number(url.searchParams.get("limit") ?? "15");
    const experienceWhere =
      session.experienceId === null
        ? { experienceId: null }
        : session.experienceId
          ? { experienceId: session.experienceId }
          : {};

    const catalogFoodsPromise = prisma.food.findMany({
      where: query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { brand: { contains: query, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: { name: "asc" },
      take: Number.isFinite(limit) ? limit : 15,
    });

    const customFoodsPromise = prisma.customFood.findMany({
      where: {
        userId: session.user.id,
        ...experienceWhere,
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { brand: { contains: query, mode: "insensitive" } },
              ],
            }
          : undefined),
      },
      orderBy: { name: "asc" },
      take: Number.isFinite(limit) ? limit : 15,
    });

    const [catalog, custom] = await Promise.all([
      catalogFoodsPromise,
      customFoodsPromise,
    ]);

    return NextResponse.json({
      data: {
        catalog,
        custom,
      },
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    console.error("[foods] unexpected error", error);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 },
    );
  }
}
