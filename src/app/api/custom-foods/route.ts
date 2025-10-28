import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  requireSessionFromRequest,
  UnauthorizedError,
} from "@/lib/session";
import { customFoodSchema } from "@/app/api/custom-foods/schemas";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSessionFromRequest(request);

    const foods = await prisma.customFood.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ data: foods });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSessionFromRequest(request);
    const payload = customFoodSchema.parse(await request.json());

    const food = await prisma.customFood.create({
      data: {
        userId: session.user.id,
        name: payload.name,
        brand: payload.brand,
        servingSize: payload.servingSize,
        servingUnit: payload.servingUnit,
        proteinPerUnit: payload.proteinPerUnit,
        carbsPerUnit: payload.carbsPerUnit,
        fatsPerUnit: payload.fatsPerUnit,
        caloriesPerUnit: payload.caloriesPerUnit ?? null,
      },
    });

    return NextResponse.json({ data: food }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}

function handleError(error: unknown) {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: "Invalid request payload.", details: error.flatten() },
      { status: 422 },
    );
  }

  console.error("[custom-foods] unexpected error", error);
  return NextResponse.json(
    { error: "Something went wrong." },
    { status: 500 },
  );
}
