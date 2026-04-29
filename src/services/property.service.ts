import { prisma } from '../db/client.js';
import {
  CreatePropertyInput,
  UpdatePropertyInput,
  CreatePropertyPhotoInput,
} from '../schemas/property.schema.js';
import { Decimal } from '@prisma/client/runtime/library';

export class PropertyService {
  /**
   * Create a new property
   */
  static async createProperty(ownerProfileId: string, data: CreatePropertyInput) {
    const property = await prisma.property.create({
      data: {
        ownerId: ownerProfileId,
        address: data.address,
        propertyType: data.propertyType,
        totalArea: new Decimal(data.totalArea),
        livingArea: data.livingArea ? new Decimal(data.livingArea) : undefined,
        roomCount: data.roomCount,
        floor: data.floor,
        totalFloors: data.totalFloors,
        yearBuilt: data.yearBuilt,
        repairQuality: data.repairQuality,
        repairYear: data.repairYear,
        furnished: data.furnished,
        balconyCount: data.balconyCount,
        terraceArea: data.terraceArea ? new Decimal(data.terraceArea) : undefined,
        hasAirConditioning: data.hasAirConditioning ?? false,
        airConditioningDetails: data.airConditioningDetails,
        heatingType: data.heatingType,
        hotWaterType: data.hotWaterType,
        kitchenType: data.kitchenType,
        kitchenDetails: data.kitchenDetails,
        windowsDirection: data.windowsDirection,
        amenities: data.amenities,
        cadastralNumber: data.cadastralNumber,
        verificationStatus: 'PENDING',
        // Onboarding fields
        addressRaw: data.addressRaw,
        hasElevator: data.hasElevator,
        outdoorFeatures: data.outdoorFeatures,
        overallCondition: data.overallCondition,
        buildingYear: data.buildingYear,
        energyClass: data.energyClass,
        kitchenAppliances: data.kitchenAppliances,
        washingFacilities: data.washingFacilities,
        bathroomFeatures: data.bathroomFeatures,
        hotWaterSystems: data.hotWaterSystems,
        airConditioningTypes: data.airConditioningTypes,
        otherAmenities: data.otherAmenities,
        parkingOptions: data.parkingOptions,
        electricityIncluded: data.electricityIncluded,
        waterIncluded: data.waterIncluded,
        gasIncluded: data.gasIncluded,
        petsAllowed: data.petsAllowed,
        kidsAllowed: data.kidsAllowed,
        smokingAllowed: data.smokingAllowed,
        maxTenants: data.maxTenants,
        moveInOption: data.moveInOption,
        moveInDate: data.moveInDate ? new Date(data.moveInDate) : undefined,
        moveOutOption: data.moveOutOption,
        moveOutDate: data.moveOutDate ? new Date(data.moveOutDate) : undefined,
      },
      include: {
        photos: true,
      },
    });

    return property;
  }

  /**
   * Get all properties for an owner
   */
  static async getPropertiesByOwner(ownerProfileId: string) {
    const properties = await prisma.property.findMany({
      where: {
        ownerId: ownerProfileId,
      },
      include: {
        photos: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return properties;
  }

  /**
   * Get property by ID
   */
  static async getPropertyById(propertyId: string) {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        photos: {
          orderBy: { sortOrder: 'asc' },
        },
        documents: true,
      },
    });

    return property;
  }

  /**
   * Update property
   */
  static async updateProperty(propertyId: string, data: UpdatePropertyInput) {
    const updateData: Record<string, unknown> = {};

    if (data.address !== undefined) {
      updateData.address = data.address;
    }
    if (data.propertyType !== undefined) {
      updateData.propertyType = data.propertyType;
    }
    if (data.totalArea !== undefined) {
      updateData.totalArea = new Decimal(data.totalArea);
    }
    if (data.livingArea !== undefined) {
      updateData.livingArea = new Decimal(data.livingArea);
    }
    if (data.roomCount !== undefined) {
      updateData.roomCount = data.roomCount;
    }
    if (data.floor !== undefined) {
      updateData.floor = data.floor;
    }
    if (data.totalFloors !== undefined) {
      updateData.totalFloors = data.totalFloors;
    }
    if (data.yearBuilt !== undefined) {
      updateData.yearBuilt = data.yearBuilt;
    }
    if (data.repairQuality !== undefined) {
      updateData.repairQuality = data.repairQuality;
    }
    if (data.repairYear !== undefined) {
      updateData.repairYear = data.repairYear;
    }
    if (data.furnished !== undefined) {
      updateData.furnished = data.furnished;
    }
    if (data.balconyCount !== undefined) {
      updateData.balconyCount = data.balconyCount;
    }
    if (data.terraceArea !== undefined) {
      updateData.terraceArea = new Decimal(data.terraceArea);
    }
    if (data.hasAirConditioning !== undefined) {
      updateData.hasAirConditioning = data.hasAirConditioning;
    }
    if (data.airConditioningDetails !== undefined) {
      updateData.airConditioningDetails = data.airConditioningDetails;
    }
    if (data.heatingType !== undefined) {
      updateData.heatingType = data.heatingType;
    }
    if (data.hotWaterType !== undefined) {
      updateData.hotWaterType = data.hotWaterType;
    }
    if (data.kitchenType !== undefined) {
      updateData.kitchenType = data.kitchenType;
    }
    if (data.kitchenDetails !== undefined) {
      updateData.kitchenDetails = data.kitchenDetails;
    }
    if (data.windowsDirection !== undefined) {
      updateData.windowsDirection = data.windowsDirection;
    }
    if (data.amenities !== undefined) {
      updateData.amenities = data.amenities;
    }
    if (data.cadastralNumber !== undefined) {
      updateData.cadastralNumber = data.cadastralNumber;
    }

    // Onboarding fields
    const onboardingFields = [
      'addressRaw',
      'hasElevator',
      'outdoorFeatures',
      'overallCondition',
      'buildingYear',
      'energyClass',
      'kitchenAppliances',
      'washingFacilities',
      'bathroomFeatures',
      'hotWaterSystems',
      'airConditioningTypes',
      'otherAmenities',
      'parkingOptions',
      'electricityIncluded',
      'waterIncluded',
      'gasIncluded',
      'petsAllowed',
      'kidsAllowed',
      'smokingAllowed',
      'maxTenants',
      'moveInOption',
      'moveOutOption',
    ] as const;

    for (const field of onboardingFields) {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    }

    if (data.moveInDate !== undefined) {
      updateData.moveInDate = data.moveInDate ? new Date(data.moveInDate) : null;
    }
    if (data.moveOutDate !== undefined) {
      updateData.moveOutDate = data.moveOutDate ? new Date(data.moveOutDate) : null;
    }

    const property = await prisma.property.update({
      where: { id: propertyId },
      data: updateData,
      include: {
        photos: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    return property;
  }

  /**
   * Delete property
   */
  static async deleteProperty(propertyId: string) {
    await prisma.property.delete({
      where: { id: propertyId },
    });
  }

  /**
   * Check if user owns property
   */
  static async isPropertyOwner(propertyId: string, ownerProfileId: string): Promise<boolean> {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { ownerId: true },
    });

    return property?.ownerId === ownerProfileId;
  }

  /**
   * Add photo to property
   */
  static async addPhoto(propertyId: string, data: CreatePropertyPhotoInput) {
    const photo = await prisma.propertyPhoto.create({
      data: {
        propertyId,
        url: data.url,
        sortOrder: data.sortOrder ?? 0,
      },
    });

    return photo;
  }

  /**
   * Delete photo from property
   */
  static async deletePhoto(photoId: string) {
    await prisma.propertyPhoto.delete({
      where: { id: photoId },
    });
  }

  /**
   * Get photo by ID
   */
  static async getPhotoById(photoId: string) {
    const photo = await prisma.propertyPhoto.findUnique({
      where: { id: photoId },
      include: {
        property: {
          select: { ownerId: true },
        },
      },
    });

    return photo;
  }

  /**
   * Get owner profile ID by user ID
   */
  static async getOwnerProfileId(userId: string): Promise<string | null> {
    const profile = await prisma.ownerProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    return profile?.id ?? null;
  }
}
