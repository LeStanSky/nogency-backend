import { z } from 'zod';

// ============================================================================
// Address Schema (nested object)
// ============================================================================

export const addressSchema = z.object({
  street: z.string().min(1, 'Street is required'),
  number: z.string().optional(),
  city: z.string().default(''),
  postalCode: z.string().default(''),
  province: z.string().optional(),
  country: z.string().optional(),
});

// ============================================================================
// Property Type Enums
// ============================================================================

export const propertyTypeEnum = z.enum([
  'APARTMENT',
  'HOUSE',
  'STUDIO',
  'ROOM',
  'PENTHOUSE',
  'DUPLEX',
  'LOFT',
  'OTHER',
]);
export const repairQualityEnum = z.enum(['NEW', 'GOOD', 'OLD']);
export const furnishedTypeEnum = z.enum(['NONE', 'PARTLY', 'FULLY']);
export const heatingTypeEnum = z.enum(['GAS', 'ELECTRIC', 'CENTRAL', 'INDIVIDUAL', 'NONE']);
export const hotWaterTypeEnum = z.enum(['GAS', 'ELECTRIC', 'CENTRAL']);
export const kitchenTypeEnum = z.enum(['SEPARATE', 'OPEN']);
export const overallConditionEnum = z.enum(['NEW', 'GOOD', 'SATISFACTORY', 'NEEDS_WORK']);
export const energyClassEnum = z.enum(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
export const petsPolicyEnum = z.enum(['YES', 'NO', 'NEGOTIABLE']);
export const smokingPolicyEnum = z.enum(['YES', 'NO']);

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
  // Onboarding fields
  addressRaw: z.string().optional(),
  hasElevator: z.boolean().optional(),
  outdoorFeatures: z.array(z.string()).optional(),
  overallCondition: overallConditionEnum.optional(),
  buildingYear: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
  energyClass: energyClassEnum.optional(),
  kitchenAppliances: z.array(z.string()).optional(),
  washingFacilities: z.array(z.string()).optional(),
  bathroomFeatures: z.array(z.string()).optional(),
  hotWaterSystems: z.array(z.string()).optional(),
  airConditioningTypes: z.array(z.string()).optional(),
  otherAmenities: z.array(z.string()).optional(),
  parkingOptions: z.array(z.string()).optional(),
  electricityIncluded: z.boolean().optional(),
  waterIncluded: z.boolean().optional(),
  gasIncluded: z.boolean().optional(),
  petsAllowed: petsPolicyEnum.optional(),
  kidsAllowed: petsPolicyEnum.optional(),
  smokingAllowed: smokingPolicyEnum.optional(),
  maxTenants: z.number().int().positive().optional(),
  moveInOption: z.string().optional(),
  moveInDate: z.string().optional(),
  moveOutOption: z.string().optional(),
  moveOutDate: z.string().optional(),
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
  // Onboarding fields
  addressRaw: z.string().optional(),
  hasElevator: z.boolean().optional(),
  outdoorFeatures: z.array(z.string()).optional(),
  overallCondition: overallConditionEnum.optional(),
  buildingYear: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
  energyClass: energyClassEnum.optional(),
  kitchenAppliances: z.array(z.string()).optional(),
  washingFacilities: z.array(z.string()).optional(),
  bathroomFeatures: z.array(z.string()).optional(),
  hotWaterSystems: z.array(z.string()).optional(),
  airConditioningTypes: z.array(z.string()).optional(),
  otherAmenities: z.array(z.string()).optional(),
  parkingOptions: z.array(z.string()).optional(),
  electricityIncluded: z.boolean().optional(),
  waterIncluded: z.boolean().optional(),
  gasIncluded: z.boolean().optional(),
  petsAllowed: petsPolicyEnum.optional(),
  kidsAllowed: petsPolicyEnum.optional(),
  smokingAllowed: smokingPolicyEnum.optional(),
  maxTenants: z.number().int().positive().optional(),
  moveInOption: z.string().optional(),
  moveInDate: z.string().optional(),
  moveOutOption: z.string().optional(),
  moveOutDate: z.string().optional(),
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
