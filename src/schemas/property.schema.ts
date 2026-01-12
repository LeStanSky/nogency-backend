import { z } from 'zod';

// ============================================================================
// Address Schema (nested object)
// ============================================================================

export const addressSchema = z.object({
  street: z.string().min(1, 'Street is required'),
  number: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  postalCode: z.string().min(1, 'Postal code is required'),
  province: z.string().optional(),
  country: z.string().optional(),
});

// ============================================================================
// Property Type Enums
// ============================================================================

export const propertyTypeEnum = z.enum(['APARTMENT', 'HOUSE', 'STUDIO', 'ROOM']);
export const repairQualityEnum = z.enum(['NEW', 'GOOD', 'OLD']);
export const furnishedTypeEnum = z.enum(['NONE', 'PARTLY', 'FULLY']);
export const heatingTypeEnum = z.enum(['GAS', 'ELECTRIC', 'CENTRAL', 'NONE']);
export const hotWaterTypeEnum = z.enum(['GAS', 'ELECTRIC', 'CENTRAL']);
export const kitchenTypeEnum = z.enum(['SEPARATE', 'OPEN']);

// ============================================================================
// Create Property Schema
// ============================================================================

export const createPropertySchema = z.object({
  address: addressSchema,
  propertyType: propertyTypeEnum,
  totalArea: z.number().positive('Total area must be positive'),
  livingArea: z.number().positive().optional(),
  roomCount: z.number().int().positive('Room count must be positive'),
  floor: z.number().int().optional(),
  totalFloors: z.number().int().positive().optional(),
  yearBuilt: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
  repairQuality: repairQualityEnum.optional(),
  repairYear: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
  furnished: furnishedTypeEnum.optional(),
  balconyCount: z.number().int().nonnegative().optional(),
  terraceArea: z.number().positive().optional(),
  hasAirConditioning: z.boolean().optional(),
  airConditioningDetails: z.string().optional(),
  heatingType: heatingTypeEnum.optional(),
  hotWaterType: hotWaterTypeEnum.optional(),
  kitchenType: kitchenTypeEnum.optional(),
  kitchenDetails: z.string().optional(),
  windowsDirection: z.string().optional(),
  amenities: z.array(z.string()).optional(),
  cadastralNumber: z.string().optional(),
});

// ============================================================================
// Update Property Schema
// ============================================================================

export const updatePropertySchema = z.object({
  address: addressSchema.optional(),
  propertyType: propertyTypeEnum.optional(),
  totalArea: z.number().positive().optional(),
  livingArea: z.number().positive().optional(),
  roomCount: z.number().int().positive().optional(),
  floor: z.number().int().optional(),
  totalFloors: z.number().int().positive().optional(),
  yearBuilt: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
  repairQuality: repairQualityEnum.optional(),
  repairYear: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
  furnished: furnishedTypeEnum.optional(),
  balconyCount: z.number().int().nonnegative().optional(),
  terraceArea: z.number().positive().optional(),
  hasAirConditioning: z.boolean().optional(),
  airConditioningDetails: z.string().optional(),
  heatingType: heatingTypeEnum.optional(),
  hotWaterType: hotWaterTypeEnum.optional(),
  kitchenType: kitchenTypeEnum.optional(),
  kitchenDetails: z.string().optional(),
  windowsDirection: z.string().optional(),
  amenities: z.array(z.string()).optional(),
  cadastralNumber: z.string().optional(),
});

// ============================================================================
// Property Photo Schema
// ============================================================================

export const createPropertyPhotoSchema = z.object({
  url: z.string().url('URL must be valid'),
  sortOrder: z.number().int().nonnegative().optional(),
});

// ============================================================================
// Type exports
// ============================================================================

export type AddressInput = z.infer<typeof addressSchema>;
export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;
export type CreatePropertyPhotoInput = z.infer<typeof createPropertyPhotoSchema>;
