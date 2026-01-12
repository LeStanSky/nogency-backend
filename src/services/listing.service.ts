import { prisma } from '../db/client.js';
import { CreateListingInput, UpdateListingInput } from '../schemas/listing.schema.js';
import { Decimal } from '@prisma/client/runtime/library';

export class ListingService {
  /**
   * Create a new listing
   */
  static async createListing(ownerProfileId: string, data: CreateListingInput) {
    const listing = await prisma.listing.create({
      data: {
        propertyId: data.propertyId,
        ownerId: ownerProfileId,
        title: data.title,
        description: data.description,
        monthlyRent: new Decimal(data.monthlyRent),
        depositAmount: new Decimal(data.depositAmount),
        utilitiesIncluded: data.utilitiesIncluded ?? false,
        minLeaseTermMonths: data.minLeaseTermMonths,
        maxLeaseTermMonths: data.maxLeaseTermMonths,
        availableFrom: new Date(data.availableFrom),
        preferredTenantCriteria: data.preferredTenantCriteria,
        channels: data.channels ?? [],
        status: 'DRAFT',
      },
      include: {
        property: {
          include: {
            photos: {
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });

    return listing;
  }

  /**
   * Get all listings for an owner
   */
  static async getListingsByOwner(ownerProfileId: string) {
    const listings = await prisma.listing.findMany({
      where: {
        ownerId: ownerProfileId,
      },
      include: {
        property: {
          include: {
            photos: {
              orderBy: { sortOrder: 'asc' },
              take: 1,
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return listings;
  }

  /**
   * Get all active listings (public)
   */
  static async getActiveListings() {
    const listings = await prisma.listing.findMany({
      where: {
        status: 'ACTIVE',
      },
      include: {
        property: {
          include: {
            photos: {
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
      orderBy: {
        publishedAt: 'desc',
      },
    });

    return listings;
  }

  /**
   * Get listing by ID
   */
  static async getListingById(listingId: string) {
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        property: {
          include: {
            photos: {
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
        viewingSlots: {
          where: {
            isAvailable: true,
            startAt: {
              gte: new Date(),
            },
          },
          orderBy: { startAt: 'asc' },
        },
      },
    });

    return listing;
  }

  /**
   * Update listing
   */
  static async updateListing(listingId: string, data: UpdateListingInput) {
    const updateData: Record<string, unknown> = {};

    if (data.title !== undefined) {
      updateData.title = data.title;
    }
    if (data.description !== undefined) {
      updateData.description = data.description;
    }
    if (data.monthlyRent !== undefined) {
      updateData.monthlyRent = new Decimal(data.monthlyRent);
    }
    if (data.depositAmount !== undefined) {
      updateData.depositAmount = new Decimal(data.depositAmount);
    }
    if (data.utilitiesIncluded !== undefined) {
      updateData.utilitiesIncluded = data.utilitiesIncluded;
    }
    if (data.minLeaseTermMonths !== undefined) {
      updateData.minLeaseTermMonths = data.minLeaseTermMonths;
    }
    if (data.maxLeaseTermMonths !== undefined) {
      updateData.maxLeaseTermMonths = data.maxLeaseTermMonths;
    }
    if (data.availableFrom !== undefined) {
      updateData.availableFrom = new Date(data.availableFrom);
    }
    if (data.preferredTenantCriteria !== undefined) {
      updateData.preferredTenantCriteria = data.preferredTenantCriteria;
    }
    if (data.channels !== undefined) {
      updateData.channels = data.channels;
    }

    const listing = await prisma.listing.update({
      where: { id: listingId },
      data: updateData,
      include: {
        property: {
          include: {
            photos: {
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });

    return listing;
  }

  /**
   * Delete listing
   */
  static async deleteListing(listingId: string) {
    await prisma.listing.delete({
      where: { id: listingId },
    });
  }

  /**
   * Publish listing (change status to ACTIVE)
   */
  static async publishListing(listingId: string) {
    const listing = await prisma.listing.update({
      where: { id: listingId },
      data: {
        status: 'ACTIVE',
        publishedAt: new Date(),
      },
      include: {
        property: {
          include: {
            photos: {
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });

    return listing;
  }

  /**
   * Pause listing (change status to PAUSED)
   */
  static async pauseListing(listingId: string) {
    const listing = await prisma.listing.update({
      where: { id: listingId },
      data: {
        status: 'PAUSED',
      },
      include: {
        property: {
          include: {
            photos: {
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });

    return listing;
  }

  /**
   * Check if user owns listing
   */
  static async isListingOwner(listingId: string, ownerProfileId: string): Promise<boolean> {
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { ownerId: true },
    });

    return listing?.ownerId === ownerProfileId;
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

  /**
   * Check if property exists and belongs to owner
   */
  static async isPropertyOwner(propertyId: string, ownerProfileId: string): Promise<boolean> {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { ownerId: true },
    });

    return property?.ownerId === ownerProfileId;
  }

  /**
   * Check if property exists
   */
  static async propertyExists(propertyId: string): Promise<boolean> {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true },
    });

    return property !== null;
  }
}
