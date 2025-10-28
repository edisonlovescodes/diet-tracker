export type MacroValues = {
  protein: number;
  carbs: number;
  fats: number;
  calories?: number | null;
};

export type EditableMealFood = {
  id?: string;
  foodId?: string | null;
  customFoodId?: string | null;
  source: "USDA" | "CUSTOM" | "QUICK_ADD";
  name: string;
  brand?: string | null;
  servingSize?: number | null;
  servingUnit?: string | null;
  quantity: number;
  macrosPerUnit: MacroValues;
};

export type EditableMeal = {
  id?: string;
  name: string;
  loggedAt: string;
  notes?: string | null;
  foods: EditableMealFood[];
};

export type EditableCustomFood = {
  id?: string;
  name: string;
  brand?: string | null;
  servingSize: number;
  servingUnit: string;
  proteinPerUnit: number;
  carbsPerUnit: number;
  fatsPerUnit: number;
  caloriesPerUnit?: number | null;
};

export type WeightHistoryEntry = {
  id: string;
  weightLbs: number;
  recordedFor: string;
  note?: string | null;
};
