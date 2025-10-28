import { z } from "zod";

export const customFoodSchema = z.object({
  name: z.string().min(1).max(120),
  brand: z.string().max(120).optional(),
  servingSize: z.number().min(0.1).max(2000),
  servingUnit: z.string().min(1).max(40),
  proteinPerUnit: z.number().min(0).max(200),
  carbsPerUnit: z.number().min(0).max(300),
  fatsPerUnit: z.number().min(0).max(200),
  caloriesPerUnit: z.number().min(0).max(2000).nullable().optional(),
});
