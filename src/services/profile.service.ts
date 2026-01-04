import { prisma } from '../db/client.js';
import {
  CreateOwnerProfileInput,
  UpdateOwnerProfileInput,
  CreateTenantProfileInput,
  UpdateTenantProfileInput,
} from '../schemas/profile.schema.js';
import { Decimal } from '@prisma/client/runtime/library';

export class ProfileService {
  /**
   * Create owner profile
   */
  static async createOwnerProfile(userId: string, data: CreateOwnerProfileInput) {
    // Check if owner profile already exists
    const existingProfile = await prisma.ownerProfile.findUnique({
      where: { userId },
    });

    if (existingProfile) {
      throw new Error('Owner profile already exists');
    }

    // Create owner profile and add OWNER role
    const profile = await prisma.ownerProfile.create({
      data: {
        userId,
        firstName: data.firstName,
        lastName: data.lastName,
        documentType: data.documentType,
        documentNumber: data.documentNumber,
        isCompany: data.isCompany ?? false,
        companyName: data.companyName,
        taxId: data.taxId,
        bankAccountIban: data.bankAccountIban,
      },
    });

    // Add OWNER role if not already present
    const existingRole = await prisma.userRole.findUnique({
      where: {
        userId_role: {
          userId,
          role: 'OWNER',
        },
      },
    });

    if (!existingRole) {
      await prisma.userRole.create({
        data: {
          userId,
          role: 'OWNER',
        },
      });
    }

    return profile;
  }

  /**
   * Create tenant profile
   */
  static async createTenantProfile(userId: string, data: CreateTenantProfileInput) {
    // Check if tenant profile already exists
    const existingProfile = await prisma.tenantProfile.findUnique({
      where: { userId },
    });

    if (existingProfile) {
      throw new Error('Tenant profile already exists');
    }

    // Convert date strings to Date objects
    const dateOfBirth = data.dateOfBirth ? new Date(data.dateOfBirth) : undefined;
    const preferredMoveInDate = data.preferredMoveInDate
      ? new Date(data.preferredMoveInDate)
      : undefined;

    // Convert monthlyIncome to Decimal
    const monthlyIncome = data.monthlyIncome ? new Decimal(data.monthlyIncome) : undefined;

    // Create tenant profile
    const profile = await prisma.tenantProfile.create({
      data: {
        userId,
        firstName: data.firstName,
        lastName: data.lastName,
        documentType: data.documentType,
        documentNumber: data.documentNumber,
        dateOfBirth,
        occupation: data.occupation,
        employerName: data.employerName,
        monthlyIncome,
        hasPets: data.hasPets ?? false,
        petsDescription: data.petsDescription,
        numberOfOccupants: data.numberOfOccupants,
        hasChildren: data.hasChildren,
        childrenAges: data.childrenAges,
        preferredMoveInDate,
        rentalDurationMonths: data.rentalDurationMonths,
        applicationSource: data.applicationSource,
      },
    });

    // Add TENANT role if not already present
    const existingRole = await prisma.userRole.findUnique({
      where: {
        userId_role: {
          userId,
          role: 'TENANT',
        },
      },
    });

    if (!existingRole) {
      await prisma.userRole.create({
        data: {
          userId,
          role: 'TENANT',
        },
      });
    }

    return profile;
  }

  /**
   * Get profile (owner or tenant)
   */
  static async getProfile(userId: string) {
    // Try to find owner profile
    const ownerProfile = await prisma.ownerProfile.findUnique({
      where: { userId },
    });

    if (ownerProfile) {
      return {
        type: 'owner' as const,
        profile: ownerProfile,
      };
    }

    // Try to find tenant profile
    const tenantProfile = await prisma.tenantProfile.findUnique({
      where: { userId },
    });

    if (tenantProfile) {
      return {
        type: 'tenant' as const,
        profile: tenantProfile,
      };
    }

    return null;
  }

  /**
   * Update profile (owner or tenant)
   */
  static async updateProfile(
    userId: string,
    data: UpdateOwnerProfileInput | UpdateTenantProfileInput
  ) {
    // Try to find owner profile
    const ownerProfile = await prisma.ownerProfile.findUnique({
      where: { userId },
    });

    if (ownerProfile) {
      // Update owner profile
      const ownerData = data as UpdateOwnerProfileInput;

      // Build update object with only provided fields
      const updateData: Record<string, unknown> = {};
      if (ownerData.firstName !== undefined) {
        updateData.firstName = ownerData.firstName;
      }
      if (ownerData.lastName !== undefined) {
        updateData.lastName = ownerData.lastName;
      }
      if (ownerData.documentType !== undefined) {
        updateData.documentType = ownerData.documentType;
      }
      if (ownerData.documentNumber !== undefined) {
        updateData.documentNumber = ownerData.documentNumber;
      }
      if (ownerData.isCompany !== undefined) {
        updateData.isCompany = ownerData.isCompany;
      }
      if (ownerData.companyName !== undefined) {
        updateData.companyName = ownerData.companyName;
      }
      if (ownerData.taxId !== undefined) {
        updateData.taxId = ownerData.taxId;
      }
      if (ownerData.bankAccountIban !== undefined) {
        updateData.bankAccountIban = ownerData.bankAccountIban;
      }

      return prisma.ownerProfile.update({
        where: { userId },
        data: updateData,
      });
    }

    // Try to find tenant profile
    const tenantProfile = await prisma.tenantProfile.findUnique({
      where: { userId },
    });

    if (tenantProfile) {
      // Update tenant profile
      const tenantData = data as UpdateTenantProfileInput;

      // Build update object with only provided fields
      const updateData: Record<string, unknown> = {};
      if (tenantData.firstName !== undefined) {
        updateData.firstName = tenantData.firstName;
      }
      if (tenantData.lastName !== undefined) {
        updateData.lastName = tenantData.lastName;
      }
      if (tenantData.documentType !== undefined) {
        updateData.documentType = tenantData.documentType;
      }
      if (tenantData.documentNumber !== undefined) {
        updateData.documentNumber = tenantData.documentNumber;
      }
      if (tenantData.dateOfBirth !== undefined) {
        updateData.dateOfBirth = new Date(tenantData.dateOfBirth);
      }
      if (tenantData.occupation !== undefined) {
        updateData.occupation = tenantData.occupation;
      }
      if (tenantData.employerName !== undefined) {
        updateData.employerName = tenantData.employerName;
      }
      if (tenantData.monthlyIncome !== undefined) {
        updateData.monthlyIncome = new Decimal(tenantData.monthlyIncome);
      }
      if (tenantData.hasPets !== undefined) {
        updateData.hasPets = tenantData.hasPets;
      }
      if (tenantData.petsDescription !== undefined) {
        updateData.petsDescription = tenantData.petsDescription;
      }
      if (tenantData.numberOfOccupants !== undefined) {
        updateData.numberOfOccupants = tenantData.numberOfOccupants;
      }
      if (tenantData.hasChildren !== undefined) {
        updateData.hasChildren = tenantData.hasChildren;
      }
      if (tenantData.childrenAges !== undefined) {
        updateData.childrenAges = tenantData.childrenAges;
      }
      if (tenantData.preferredMoveInDate !== undefined) {
        updateData.preferredMoveInDate = new Date(tenantData.preferredMoveInDate);
      }
      if (tenantData.rentalDurationMonths !== undefined) {
        updateData.rentalDurationMonths = tenantData.rentalDurationMonths;
      }
      if (tenantData.applicationSource !== undefined) {
        updateData.applicationSource = tenantData.applicationSource;
      }

      return prisma.tenantProfile.update({
        where: { userId },
        data: updateData,
      });
    }

    throw new Error('Profile not found');
  }
}
