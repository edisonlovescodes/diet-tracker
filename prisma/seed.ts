import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const MAX_TOTAL_RECORDS = 4000;
const BASE_DELAY_MS = 350;
const RETRY_LIMIT = 5;

async function main() {
  await seedFromUSDA();

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

  const queries: Array<{ term: string; pages?: number; pageSize?: number }> = [
    { term: "chicken", pages: 3 },
    { term: "beef", pages: 3 },
    { term: "pork", pages: 2 },
    { term: "turkey", pages: 2 },
    { term: "fish", pages: 3 },
    { term: "salmon", pages: 2 },
    { term: "shrimp", pages: 2 },
    { term: "tofu", pages: 2 },
    { term: "tempeh", pages: 1 },
    { term: "egg", pages: 2 },
    { term: "yogurt", pages: 2 },
    { term: "milk", pages: 2 },
    { term: "cheese", pages: 2 },
    { term: "beans", pages: 2 },
    { term: "lentil", pages: 2 },
    { term: "peas", pages: 1 },
    { term: "rice", pages: 2 },
    { term: "oats", pages: 2 },
    { term: "bread", pages: 2 },
    { term: "pasta", pages: 2 },
    { term: "cereal", pages: 2 },
    { term: "granola", pages: 1 },
    { term: "potato", pages: 2 },
    { term: "sweet potato", pages: 2 },
    { term: "broccoli", pages: 1 },
    { term: "spinach", pages: 1 },
    { term: "kale", pages: 1 },
    { term: "carrot", pages: 1 },
    { term: "onion", pages: 1 },
    { term: "mixed vegetables", pages: 1 },
    { term: "apple", pages: 2 },
    { term: "banana", pages: 1 },
    { term: "berries", pages: 2 },
    { term: "citrus", pages: 1 },
    { term: "nuts", pages: 2 },
    { term: "seeds", pages: 2 },
    { term: "nut butter", pages: 1 },
    { term: "protein powder", pages: 1 },
    { term: "protein bar", pages: 1 },
    { term: "sauce", pages: 1 },
    { term: "condiments", pages: 1 },
    { term: "dessert", pages: 1 },
    { term: "snack", pages: 1 },
    { term: "beverage", pages: 1 },
  ];

  const dataTypes = [
    "Branded",
    "Survey (FNDDS)",
    "SR Legacy",
    "Foundation",
  ];

  let totalInserted = 0;

  for (const { term, pages = 2, pageSize = 50 } of queries) {
    for (let page = 1; page <= pages; page += 1) {
      if (totalInserted >= MAX_TOTAL_RECORDS) {
        console.info(`[seed] Reached record cap (${MAX_TOTAL_RECORDS}). Stopping.`);
        return;
      }

      const payload = await fetchUSDAWithRetry({
        apiKey,
        term,
        page,
        pageSize,
        dataTypes,
      });

      if (!payload?.foods?.length) {
        break;
      }

      for (const food of payload.foods) {
        const macros = extractMacros(food);
        if (!macros) continue;

        await prisma.food.upsert({
          where: { externalId: `usda-${food.fdcId}` },
          update: {
            name: food.description,
            brand: food.brandOwner ?? null,
            servingSize: macros.servingSize,
            servingUnit: macros.servingUnit,
            proteinPerUnit: macros.protein,
            carbsPerUnit: macros.carbs,
            fatsPerUnit: macros.fats,
            caloriesPerUnit: macros.calories,
          },
          create: {
            externalId: `usda-${food.fdcId}`,
            source: "USDA",
            name: food.description,
            brand: food.brandOwner ?? null,
            servingSize: macros.servingSize,
            servingUnit: macros.servingUnit,
            proteinPerUnit: macros.protein,
            carbsPerUnit: macros.carbs,
            fatsPerUnit: macros.fats,
            caloriesPerUnit: macros.calories,
          },
        });

        totalInserted += 1;
        if (totalInserted % 100 === 0) {
          console.info(`[seed] Inserted ${totalInserted} foods so far…`);
        }
        if (totalInserted >= MAX_TOTAL_RECORDS) {
          console.info(`[seed] Reached record cap (${MAX_TOTAL_RECORDS}). Stopping.`);
          return;
        }
      }

      await delay(BASE_DELAY_MS);
    }
  }
}

type USDAFood = {
  fdcId: number;
  description: string;
  brandOwner?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodNutrients?: Array<{
    nutrientName: string;
    nutrientNumber?: string;
    value: number;
    unitName?: string;
  }>;
};

type USDAResponse = {
  foods?: USDAFood[];
};

type USDAFetchParams = {
  apiKey: string;
  term: string;
  page: number;
  pageSize: number;
  dataTypes: string[];
};

async function fetchUSDAWithRetry(params: USDAFetchParams) {
  const { apiKey, term, page, pageSize, dataTypes } = params;
  const url = new URL("https://api.nal.usda.gov/fdc/v1/foods/search");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("query", term);
  url.searchParams.set("pageNumber", String(page));
  url.searchParams.set("pageSize", String(pageSize));
  dataTypes.forEach((dt) => url.searchParams.append("dataType", dt));
  url.searchParams.set("requireAllWords", "false");

  for (let attempt = 1; attempt <= RETRY_LIMIT; attempt += 1) {
    try {
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      if (response.status === 429) {
        const wait = BASE_DELAY_MS * attempt * 5;
        console.warn(`[seed] USDA 429 for ${term} page ${page}. Retrying in ${wait}ms.`);
        await delay(wait);
        continue;
      }

      if (!response.ok) {
        console.warn(
          `[seed] USDA request failed for ${term} (page ${page}) status ${response.status}`,
        );
        return undefined;
      }

      return (await response.json()) as USDAResponse;
    } catch (error) {
      const wait = BASE_DELAY_MS * attempt * 4;
      console.warn(
        `[seed] Network error for ${term} page ${page} (attempt ${attempt}/${RETRY_LIMIT})`,
        error,
      );
      if (attempt === RETRY_LIMIT) {
        return undefined;
      }
      await delay(wait);
    }
  }

  return undefined;
}

function extractMacros(food: USDAFood) {
  const servingSize = food.servingSize && food.servingSize > 0 ? food.servingSize : 100;
  const servingUnit = food.servingSizeUnit?.trim() || "g";

  const protein =
    getNutrientValue(food, ["1003", "203"], ["protein"]) ?? 0;
  const carbs =
    getNutrientValue(food, ["1005", "205"], ["carbohydrate, by difference", "carbohydrate"]) ?? 0;
  const fats =
    getNutrientValue(food, ["1004", "204"], ["total lipid (fat)", "fat"]) ?? 0;
  const calories =
    getNutrientValue(food, ["1008", "208"], ["energy", "calories"]) ?? null;

  if (!protein && !carbs && !fats && !calories) {
    return null;
  }

  return {
    servingSize,
    servingUnit,
    protein,
    carbs,
    fats,
    calories,
  };
}

function getNutrientValue(food: USDAFood, numbers: string[], names: string[]) {
  const nutrients = food.foodNutrients ?? [];
  const byNumber = nutrients.find((nutrient) =>
    nutrient.nutrientNumber && numbers.includes(nutrient.nutrientNumber),
  );
  if (byNumber) {
    return normalizeUnit(byNumber.value, byNumber.unitName);
  }

  const lowerNames = names.map((term) => term.toLowerCase());
  const byName = nutrients.find((nutrient) =>
    lowerNames.some((term) => nutrient.nutrientName.toLowerCase().includes(term)),
  );
  if (byName) {
    return normalizeUnit(byName.value, byName.unitName);
  }
  return null;
}

function normalizeUnit(value: number, unitName?: string) {
  if (!unitName) return value;
  const unit = unitName.toLowerCase();
  if (unit === "mg") {
    return value / 1000;
  }
  if (unit === "µg" || unit === "mcg") {
    return value / 1_000_000;
  }
  return value;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
