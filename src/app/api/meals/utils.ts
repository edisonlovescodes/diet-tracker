import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const foodInputSchema = z.object({
  foodId: z.string().optional(),
  customFoodId: z.string().optional(),
  source: z.enum(["USDA", "CUSTOM", "QUICK_ADD"]),
  name: z.string().min(1).max(120),
  brand: z.string().max(120).optional(),
  quantity: z.number().min(0.1).max(20),
  servingUnit: z.string().max(40).optional(),
  macrosPerUnit: z
    .object({
      protein: z.number().min(0).max(200).default(0),
      carbs: z.number().min(0).max(300).default(0),
      fats: z.number().min(0).max(150).default(0),
      calories: z.number().min(0).max(2000).nullable().optional(),
    })
    .optional(),
  quickAddMacros: z
    .object({
      protein: z.number().min(0).max(200).default(0),
      carbs: z.number().min(0).max(300).default(0),
      fats: z.number().min(0).max(150).default(0),
      calories: z.number().min(0).max(2000).nullable().optional(),
    })
    .optional(),
});

export const createMealSchema = z.object({
  name: z.string().min(1).max(120),
  loggedAt: z
    .string()
    .transform((value) => new Date(value))
    .refine((value) => !Number.isNaN(value.getTime()), {
      message: "Invalid loggedAt date.",
    }),
  notes: z.string().max(240).optional(),
  foods: z.array(foodInputSchema).min(1),
});

export const updateMealSchema = createMealSchema.partial({
  loggedAt: true,
  foods: true,
  name: true,
}).extend({
  foods: z.array(foodInputSchema).optional(),
});

export type MealFoodCreateInput = {
  mealId?: string;
  foodId?: string | null;
  customFoodId?: string | null;
  source: "USDA" | "CUSTOM" | "QUICK_ADD";
  name: string;
  brand?: string | null;
  servingUnit?: string | null;
  quantity: number;
  protein: number;
  carbs: number;
  fats: number;
  calories?: number | null;
};

export async function buildMealFoodInputs({
  foods,
  userId,
  experienceId,
}: {
  foods: z.infer<typeof foodInputSchema>[];
  userId: string;
  experienceId: string | null;
}) {
  const items: MealFoodCreateInput[] = [];
  const total = { protein: 0, carbs: 0, fats: 0 };

  for (const item of foods) {
    const base = await hydrateFood(item, userId, experienceId);

    items.push({
      foodId: base.foodId,
      customFoodId: base.customFoodId,
      source: base.source,
      name: base.name,
      brand: base.brand,
      servingUnit: base.servingUnit,
      quantity: base.quantity,
      protein: base.protein,
      carbs: base.carbs,
      fats: base.fats,
      calories: base.calories,
    });

    total.protein += base.protein;
    total.carbs += base.carbs;
    total.fats += base.fats;
  }

  return { items, total };
}

async function hydrateFood(
  item: z.infer<typeof foodInputSchema>,
  userId: string,
  experienceId: string | null,
) {
  const quantity = item.quantity;

  if (item.foodId) {
    const food = await prisma.food.findUnique({
      where: { id: item.foodId },
    });

    if (!food) {
      throw new Error("Food item not found.");
    }

    return {
      foodId: food.id,
      customFoodId: null,
      source: "USDA" as const,
      name: food.name,
      brand: food.brand,
      servingUnit: food.servingUnit,
      quantity,
      protein: round(food.proteinPerUnit * quantity),
      carbs: round(food.carbsPerUnit * quantity),
      fats: round(food.fatsPerUnit * quantity),
      calories: food.caloriesPerUnit
        ? round(food.caloriesPerUnit * quantity)
        : null,
    };
  }

  if (item.customFoodId) {
    const custom = await prisma.customFood.findUnique({
      where: { id: item.customFoodId },
    });

    const customExperience = custom?.experienceId ?? null;

    if (
      !custom ||
      custom.userId !== userId ||
      customExperience !== (experienceId ?? null)
    ) {
      throw new Error("Custom food not found.");
    }

    return {
      foodId: null,
      customFoodId: custom.id,
      source: "CUSTOM" as const,
      name: custom.name,
      brand: custom.brand,
      servingUnit: custom.servingUnit,
      quantity,
      protein: round(custom.proteinPerUnit * quantity),
      carbs: round(custom.carbsPerUnit * quantity),
      fats: round(custom.fatsPerUnit * quantity),
      calories: custom.caloriesPerUnit
        ? round(custom.caloriesPerUnit * quantity)
        : null,
    };
  }

  const quick = item.quickAddMacros ?? item.macrosPerUnit;

  if (!quick) {
    throw new Error("Missing macro information for quick add food.");
  }

  return {
    foodId: null,
    customFoodId: null,
    source: "QUICK_ADD" as const,
    name: item.name,
    brand: item.brand,
    servingUnit: item.servingUnit,
    quantity,
    protein: round(quick.protein * quantity),
    carbs: round(quick.carbs * quantity),
    fats: round(quick.fats * quantity),
    calories: quick.calories ? round(quick.calories * quantity) : null,
  };
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}
