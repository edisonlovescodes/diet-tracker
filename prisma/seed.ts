import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await seedFromUSDA();

  // Fallback staples ensure search is never empty during development.
  await prisma.food.upsert({
    where: { externalId: "sample-chicken" },
    update: {},
    create: {
      externalId: "sample-chicken",
      source: "USDA",
      name: "Chicken Breast (Cooked)",
      servingSize: 100,
      servingUnit: "g",
      proteinPerUnit: 31,
      carbsPerUnit: 0,
      fatsPerUnit: 3.6,
      caloriesPerUnit: 165,
    },
  });

  await prisma.food.upsert({
    where: { externalId: "sample-rice" },
    update: {},
    create: {
      externalId: "sample-rice",
      source: "USDA",
      name: "White Rice (Cooked)",
      servingSize: 100,
      servingUnit: "g",
      proteinPerUnit: 2.4,
      carbsPerUnit: 28,
      fatsPerUnit: 0.3,
      caloriesPerUnit: 130,
    },
  });
}

async function seedFromUSDA() {
  const apiKey = process.env.USDA_API_KEY;
  if (!apiKey) {
    console.info("[seed] USDA_API_KEY missing, skipping USDA import.");
    return;
  }

  const queries = [
    "chicken breast",
    "egg white",
    "white rice",
    "oats",
    "salmon",
    "sweet potato",
  ];

  for (const query of queries) {
    try {
      const response = await fetch(
        `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query,
            pageSize: 5,
            requireAllWords: false,
            sortBy: "dataType.keyword",
          }),
        },
      );

      if (!response.ok) {
        console.warn(`[seed] USDA request failed for ${query}`, response.status);
        continue;
      }

      const data = (await response.json()) as {
        foods?: Array<{
          fdcId: number;
          description: string;
          brandOwner?: string;
          servingSize?: number;
          servingSizeUnit?: string;
          foodNutrients?: Array<{
            nutrientName: string;
            value: number;
          }>;
        }>;
      };

      for (const food of data.foods ?? []) {
        const protein = getNutrient(food, "Protein");
        const carbs =
          getNutrient(food, "Carbohydrate, by difference") ??
          getNutrient(food, "Carbohydrate");
        const fats =
          getNutrient(food, "Total lipid (fat)") ?? getNutrient(food, "Fat");
        const calories = getNutrient(food, "Energy");

        const servingSize = food.servingSize && food.servingSize > 0 ? food.servingSize : 100;
        const servingUnit = food.servingSizeUnit ?? "g";

        await prisma.food.upsert({
          where: { externalId: `usda-${food.fdcId}` },
          update: {
            name: food.description,
            brand: food.brandOwner ?? null,
            servingSize,
            servingUnit,
            proteinPerUnit: protein ?? 0,
            carbsPerUnit: carbs ?? 0,
            fatsPerUnit: fats ?? 0,
            caloriesPerUnit: calories ?? null,
          },
          create: {
            externalId: `usda-${food.fdcId}`,
            source: "USDA",
            name: food.description,
            brand: food.brandOwner ?? null,
            servingSize,
            servingUnit,
            proteinPerUnit: protein ?? 0,
            carbsPerUnit: carbs ?? 0,
            fatsPerUnit: fats ?? 0,
            caloriesPerUnit: calories ?? null,
          },
        });
      }
    } catch (error) {
      console.warn(`[seed] Failed to import USDA data for ${query}`, error);
    }
  }
}

function getNutrient(
  food: {
    foodNutrients?: Array<{ nutrientName: string; value: number }>;
  },
  nutrientName: string,
) {
  return food.foodNutrients?.find((nutrient) =>
    nutrient.nutrientName.toLowerCase().includes(nutrientName.toLowerCase()),
  )?.value;
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
