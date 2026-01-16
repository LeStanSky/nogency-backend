import { prisma } from '../db/client.js';
import {
  CreateContractInput,
  TerminateContractInput,
  ContractQueryInput,
} from '../schemas/contract.schema.js';
import { nanoid } from 'nanoid';
import { Prisma, ContractStatus } from '@prisma/client';

export class ContractService {
  /**
   * Generate unique contract number
   */
  private static generateContractNumber(): string {
    const year = new Date().getFullYear();
    const uniqueId = nanoid(8).toUpperCase();
    return `CTR-${year}-${uniqueId}`;
  }

  /**
   * Create a new contract from an approved application
   */
  static async createContract(ownerProfileId: string, input: CreateContractInput) {
    // Get the application with related data
    const application = await prisma.application.findUnique({
      where: { id: input.applicationId },
      include: {
        listing: {
          include: {
            property: true,
            owner: true,
          },
        },
        tenant: true,
      },
    });

    if (!application) {
      throw new Error('Application not found');
    }

    // Check if application is approved
    if (application.status !== 'APPROVED') {
      throw new Error('Contract can only be created for approved applications');
    }

    // Check if the user is the owner of the listing
    if (application.listing.ownerId !== ownerProfileId) {
      throw new Error('Only the listing owner can create a contract');
    }

    // Check if contract already exists for this application
    const existingContract = await prisma.leaseContract.findFirst({
      where: { applicationId: input.applicationId },
    });

    if (existingContract) {
      throw new Error('Contract already exists for this application');
    }

    // Create the contract
    const contract = await prisma.leaseContract.create({
      data: {
        applicationId: input.applicationId,
        listingId: application.listingId,
        propertyId: application.listing.propertyId,
        ownerId: ownerProfileId,
        tenantId: application.tenantId,
        contractNumber: this.generateContractNumber(),
        startDate: input.startDate,
        endDate: input.endDate,
        monthlyRent: input.monthlyRent,
        depositAmount: input.depositAmount,
        depositMonths: input.depositMonths,
        additionalGuaranteeMonths: input.additionalGuaranteeMonths || 0,
        paymentDueDay: input.paymentDueDay,
        utilitiesResponsibility: input.utilitiesResponsibility,
        sublettingAllowed: input.sublettingAllowed || false,
        status: 'DRAFT',
      },
      include: {
        listing: {
          include: {
            property: true,
          },
        },
        tenant: {
          include: {
            user: {
              select: {
                email: true,
              },
            },
          },
        },
        owner: {
          include: {
            user: {
              select: {
                email: true,
              },
            },
          },
        },
      },
    });

    // Create lease event
    await prisma.leaseEvent.create({
      data: {
        contractId: contract.id,
        type: 'CONTRACT_CREATED',
        triggeredBy: ownerProfileId,
        data: {
          startDate: input.startDate,
          endDate: input.endDate,
          monthlyRent: input.monthlyRent,
        },
      },
    });

    return contract;
  }

  /**
   * Get contracts for a user (owner or tenant)
   */
  static async getContracts(userId: string, query: ContractQueryInput) {
    // Get user's profiles
    const ownerProfile = await prisma.ownerProfile.findUnique({
      where: { userId },
    });

    const tenantProfile = await prisma.tenantProfile.findUnique({
      where: { userId },
    });

    const where: Prisma.LeaseContractWhereInput = {};

    // Filter by owner or tenant
    const orConditions: Array<{ ownerId?: string; tenantId?: string }> = [];
    if (ownerProfile) {
      orConditions.push({ ownerId: ownerProfile.id });
    }
    if (tenantProfile) {
      orConditions.push({ tenantId: tenantProfile.id });
    }

    if (orConditions.length === 0) {
      return { contracts: [], total: 0, page: query.page, limit: query.limit };
    }

    where.OR = orConditions;

    // Filter by status
    if (query.status) {
      where.status = query.status as ContractStatus;
    }

    const [contracts, total] = await Promise.all([
      prisma.leaseContract.findMany({
        where,
        include: {
          listing: {
            include: {
              property: true,
            },
          },
          tenant: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.leaseContract.count({ where }),
    ]);

    return {
      contracts,
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  /**
   * Get contract by ID
   */
  static async getContractById(contractId: string, userId: string) {
    const contract = await prisma.leaseContract.findUnique({
      where: { id: contractId },
      include: {
        listing: {
          include: {
            property: true,
          },
        },
        tenant: {
          include: {
            user: {
              select: {
                email: true,
              },
            },
          },
        },
        owner: {
          include: {
            user: {
              select: {
                email: true,
              },
            },
          },
        },
        payments: {
          orderBy: { dueDate: 'desc' },
          take: 10,
        },
        events: {
          orderBy: { timestamp: 'desc' },
          take: 10,
        },
      },
    });

    if (!contract) {
      return null;
    }

    // Check if user has access to this contract
    const ownerProfile = await prisma.ownerProfile.findUnique({
      where: { userId },
    });

    const tenantProfile = await prisma.tenantProfile.findUnique({
      where: { userId },
    });

    const isOwner = ownerProfile && contract.ownerId === ownerProfile.id;
    const isTenant = tenantProfile && contract.tenantId === tenantProfile.id;

    if (!isOwner && !isTenant) {
      throw new Error('Access denied');
    }

    return contract;
  }

  /**
   * Send contract for signing (change status to PENDING_SIGNATURES)
   */
  static async sendForSigning(contractId: string, ownerProfileId: string) {
    const contract = await prisma.leaseContract.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      throw new Error('Contract not found');
    }

    if (contract.ownerId !== ownerProfileId) {
      throw new Error('Only the owner can send contract for signing');
    }

    if (contract.status !== 'DRAFT') {
      throw new Error('Only DRAFT contracts can be sent for signing');
    }

    const updatedContract = await prisma.leaseContract.update({
      where: { id: contractId },
      data: {
        status: 'PENDING_SIGNATURES',
      },
      include: {
        listing: {
          include: {
            property: true,
          },
        },
        tenant: true,
        owner: true,
      },
    });

    // Create lease event
    await prisma.leaseEvent.create({
      data: {
        contractId: contract.id,
        type: 'CONTRACT_SENT',
        triggeredBy: ownerProfileId,
      },
    });

    return updatedContract;
  }

  /**
   * Sign contract (owner or tenant)
   */
  static async signContract(contractId: string, userId: string) {
    const contract = await prisma.leaseContract.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      throw new Error('Contract not found');
    }

    if (contract.status !== 'PENDING_SIGNATURES') {
      throw new Error('Contract must be in PENDING_SIGNATURES status to sign');
    }

    // Get user profiles
    const ownerProfile = await prisma.ownerProfile.findUnique({
      where: { userId },
    });

    const tenantProfile = await prisma.tenantProfile.findUnique({
      where: { userId },
    });

    const isOwner = ownerProfile && contract.ownerId === ownerProfile.id;
    const isTenant = tenantProfile && contract.tenantId === tenantProfile.id;

    if (!isOwner && !isTenant) {
      throw new Error('You are not a party to this contract');
    }

    const updateData: {
      ownerSignedAt?: Date;
      tenantSignedAt?: Date;
      status?: 'ACTIVE';
    } = {};

    if (isOwner) {
      if (contract.ownerSignedAt) {
        throw new Error('Owner has already signed this contract');
      }
      updateData.ownerSignedAt = new Date();
    }

    if (isTenant) {
      if (contract.tenantSignedAt) {
        throw new Error('Tenant has already signed this contract');
      }
      updateData.tenantSignedAt = new Date();
    }

    // Check if both parties will have signed after this update
    const willOwnerBeSigned = updateData.ownerSignedAt || contract.ownerSignedAt;
    const willTenantBeSigned = updateData.tenantSignedAt || contract.tenantSignedAt;

    if (willOwnerBeSigned && willTenantBeSigned) {
      updateData.status = 'ACTIVE';
    }

    const updatedContract = await prisma.leaseContract.update({
      where: { id: contractId },
      data: updateData,
      include: {
        listing: {
          include: {
            property: true,
          },
        },
        tenant: true,
        owner: true,
      },
    });

    // Create lease event
    const triggeredById = isOwner && ownerProfile ? ownerProfile.id : tenantProfile?.id;
    await prisma.leaseEvent.create({
      data: {
        contractId: contract.id,
        type: isOwner ? 'SIGNED_OWNER' : 'SIGNED_TENANT',
        triggeredBy: triggeredById,
      },
    });

    // If contract became active, create another event
    if (updateData.status === 'ACTIVE') {
      await prisma.leaseEvent.create({
        data: {
          contractId: contract.id,
          type: 'ACTIVE',
        },
      });

      // Update listing status to RENTED
      await prisma.listing.update({
        where: { id: contract.listingId },
        data: { status: 'RENTED' },
      });
    }

    return updatedContract;
  }

  /**
   * Terminate contract
   */
  static async terminateContract(
    contractId: string,
    ownerProfileId: string,
    input: TerminateContractInput
  ) {
    const contract = await prisma.leaseContract.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      throw new Error('Contract not found');
    }

    if (contract.ownerId !== ownerProfileId) {
      throw new Error('Only the owner can terminate the contract');
    }

    if (contract.status !== 'ACTIVE') {
      throw new Error('Only ACTIVE contracts can be terminated');
    }

    const updatedContract = await prisma.leaseContract.update({
      where: { id: contractId },
      data: {
        status: 'TERMINATED',
        endDate: input.terminationDate,
      },
      include: {
        listing: {
          include: {
            property: true,
          },
        },
        tenant: true,
        owner: true,
      },
    });

    // Create lease event
    await prisma.leaseEvent.create({
      data: {
        contractId: contract.id,
        type: 'TERMINATED',
        triggeredBy: ownerProfileId,
        data: {
          reason: input.reason,
          terminationDate: input.terminationDate,
        },
      },
    });

    // Update listing status back to ACTIVE
    await prisma.listing.update({
      where: { id: contract.listingId },
      data: { status: 'ACTIVE' },
    });

    return updatedContract;
  }
}
