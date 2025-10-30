import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  requireSessionFromRequest,
  UnauthorizedError,
} from "@/lib/session";
import {
  createMealSchema,
  buildMealFoodInputs,
} from "@/app/api/meals/utils";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSessionFromRequest(request);
    const url = new URL(request.url);
    const dateParam = url.searchParams.get("date");
    const selectedDate = dateParam ? new Date(dateParam) : new Date();

    const { start, end } = getDayRange(selectedDate);
    const experienceWhere =
      session.experienceId === null
        ? { experienceId: null }
        : session.experienceId
          ? { experienceId: session.experienceId }
          : {};

    const meals = await prisma.meal.findMany({
      where: {
        userId: session.user.id,
        ...experienceWhere,
        loggedAt: {
          gte: start,
          lt: end,
        },
      },
      include: {
        foods: true,
      },
      orderBy: {
        loggedAt: "asc",
      },
    });

    return NextResponse.json({ data: meals });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSessionFromRequest(request);
    const payload = createMealSchema.parse(await request.json());

    const foods = await buildMealFoodInputs({
      foods: payload.foods,
      userId: session.user.id,
       experienceId: session.experienceId ?? null,
    });

    const meal = await prisma.meal.create({
      data: {
        userId: session.user.id,
        experienceId: session.experienceId ?? null,
        name: payload.name,
        loggedAt: payload.loggedAt,
        notes: payload.notes,
        protein: foods.total.protein,
        carbs: foods.total.carbs,
        fats: foods.total.fats,
        foods: {
          createMany: {
            data: foods.items,
          },
        },
      },
      include: { foods: true },
    });

    return NextResponse.json({ data: meal }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}

function getDayRange(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
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

  console.error("[meals] unexpected error", error);
  return NextResponse.json(
    { error: "Something went wrong." },
    { status: 500 },
  );
}
