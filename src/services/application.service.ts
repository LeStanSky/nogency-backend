import { prisma } from '../db/client.js';
import {
  CreateApplicationInput,
  UpdateApplicationStatusInput,
  ApplicationQueryInput,
} from '../schemas/application.schema.js';

export class ApplicationService {
  /**
   * Create a new application
   */
  static async createApplication(tenantProfileId: string, data: CreateApplicationInput) {
    const application = await prisma.application.create({
      data: {
        listingId: data.listingId,
        tenantId: tenantProfileId,
        message: data.message,
        proposedMoveInDate: data.proposedMoveInDate ? new Date(data.proposedMoveInDate) : null,
        proposedLeaseTermMonths: data.proposedLeaseTermMonths,
        source: data.source ?? 'APP',
        status: 'PENDING',
      },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            monthlyRent: true,
            property: {
              select: {
                id: true,
                address: true,
              },
            },
          },
        },
        tenant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Increment applications count on listing
    await prisma.listing.update({
      where: { id: data.listingId },
      data: {
        applicationsCount: {
          increment: 1,
        },
      },
    });

    return application;
  }

  /**
   * Get applications for tenant
   */
  static async getApplicationsByTenant(tenantProfileId: string, query: ApplicationQueryInput) {
    const where: Record<string, unknown> = {
      tenantId: tenantProfileId,
    };

    if (query.status) {
      where.status = query.status;
    }

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        include: {
          listing: {
            select: {
              id: true,
              title: true,
              monthlyRent: true,
              status: true,
              property: {
                select: {
                  id: true,
                  address: true,
                  photos: {
                    orderBy: { sortOrder: 'asc' },
                    take: 1,
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.application.count({ where }),
    ]);

    return {
      applications,
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  /**
   * Get applications for owner's listings
   */
  static async getApplicationsByOwner(ownerProfileId: string, query: ApplicationQueryInput) {
    const where: Record<string, unknown> = {
      listing: {
        ownerId: ownerProfileId,
      },
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.listingId) {
      where.listingId = query.listingId;
    }

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        include: {
          listing: {
            select: {
              id: true,
              title: true,
              monthlyRent: true,
              property: {
                select: {
                  id: true,
                  address: true,
                },
              },
            },
          },
          tenant: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              occupation: true,
              monthlyIncome: true,
            },
          },
          scoring: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.application.count({ where }),
    ]);

    return {
      applications,
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  /**
   * Get application by ID with full details
   */
  static async getApplicationById(applicationId: string) {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            monthlyRent: true,
            depositAmount: true,
            minLeaseTermMonths: true,
            status: true,
            ownerId: true,
            property: {
              select: {
                id: true,
                address: true,
                propertyType: true,
                roomCount: true,
                photos: {
                  orderBy: { sortOrder: 'asc' },
                },
              },
            },
          },
        },
        tenant: {
          select: {
            id: true,
            userId: true,
            firstName: true,
            lastName: true,
            occupation: true,
            employerName: true,
            monthlyIncome: true,
            hasPets: true,
            numberOfOccupants: true,
          },
        },
        documents: {
          include: {
            // ApplicationDocument doesn't have a separate document relation
            // It contains the document data directly
          },
        },
        scoring: true,
      },
    });

    return application;
  }

  /**
   * Update application status
   */
  static async updateApplicationStatus(applicationId: string, data: UpdateApplicationStatusInput) {
    const application = await prisma.application.update({
      where: { id: applicationId },
      data: {
        status: data.status,
        rejectionReason: data.rejectionReason,
      },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            monthlyRent: true,
            property: {
              select: {
                id: true,
                address: true,
              },
            },
          },
        },
        tenant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return application;
  }

  /**
   * Withdraw application (tenant action)
   */
  static async withdrawApplication(applicationId: string) {
    const application = await prisma.application.update({
      where: { id: applicationId },
      data: {
        status: 'WITHDRAWN',
      },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    return application;
  }

  /**
   * Check if tenant already applied to this listing
   */
  static async hasExistingApplication(
    tenantProfileId: string,
    listingId: string
  ): Promise<boolean> {
    const existing = await prisma.application.findFirst({
      where: {
        tenantId: tenantProfileId,
        listingId: listingId,
        status: {
          notIn: ['WITHDRAWN', 'REJECTED'],
        },
      },
    });

    return existing !== null;
  }

  /**
   * Check if application exists
   */
  static async applicationExists(applicationId: string): Promise<boolean> {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      select: { id: true },
    });

    return application !== null;
  }

  /**
   * Check if user is application owner (tenant)
   */
  static async isApplicationTenant(
    applicationId: string,
    tenantProfileId: string
  ): Promise<boolean> {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      select: { tenantId: true },
    });

    return application?.tenantId === tenantProfileId;
  }

  /**
   * Check if user is listing owner of the application
   */
  static async isApplicationListingOwner(
    applicationId: string,
    ownerProfileId: string
  ): Promise<boolean> {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      select: {
        listing: {
          select: {
            ownerId: true,
          },
        },
      },
    });

    return application?.listing?.ownerId === ownerProfileId;
  }

  /**
   * Check if listing exists and is active
   */
  static async isListingActive(listingId: string): Promise<boolean> {
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { status: true },
    });

    return listing?.status === 'ACTIVE';
  }

  /**
   * Check if listing exists
   */
  static async listingExists(listingId: string): Promise<boolean> {
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true },
    });

    return listing !== null;
  }

  /**
   * Get tenant profile ID by user ID
   */
  static async getTenantProfileId(userId: string): Promise<string | null> {
    const profile = await prisma.tenantProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    return profile?.id ?? null;
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
   * Get application status
   */
  static async getApplicationStatus(applicationId: string): Promise<string | null> {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      select: { status: true },
    });

    return application?.status ?? null;
  }

  /**
   * Check if application can be withdrawn
   */
  static async canWithdraw(applicationId: string): Promise<boolean> {
    const status = await this.getApplicationStatus(applicationId);
    // Can withdraw if not already withdrawn, rejected, or approved
    return status !== null && !['WITHDRAWN', 'REJECTED', 'APPROVED'].includes(status);
  }
}
