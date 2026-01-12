import { prisma } from '../db/client.js';
import { Decimal } from '@prisma/client/runtime/library';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface ScoringResult {
  totalScore: number;
  incomeScore: number;
  employmentScore: number;
  rentalHistoryScore: number;
  verificationScore: number;
  criteriaMatchScore: number;
  riskLevel: RiskLevel;
  notes: string;
}

export class ScoringService {
  /**
   * Calculate AI scoring for an application
   */
  static async calculateScore(applicationId: string): Promise<ScoringResult> {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        tenant: {
          include: {
            user: {
              include: {
                documents: {
                  where: { status: 'VERIFIED' },
                },
              },
            },
          },
        },
        documents: true,
        listing: {
          select: {
            monthlyRent: true,
            preferredTenantCriteria: true,
          },
        },
      },
    });

    if (!application) {
      throw new Error('Application not found');
    }

    const monthlyRent = Number(application.listing.monthlyRent);
    const monthlyIncome = application.tenant.monthlyIncome
      ? Number(application.tenant.monthlyIncome)
      : null;

    // 1. Income Score (0-100)
    const incomeScore = this.calculateIncomeScore(monthlyIncome, monthlyRent);

    // 2. Employment Score (0-100)
    const employmentScore = this.calculateEmploymentScore(
      application.tenant,
      application.documents,
      application.tenant.user.documents
    );

    // 3. Rental History Score (0-100)
    const rentalHistoryScore = this.calculateRentalHistoryScore(application.tenant);

    // 4. Verification Score (0-100)
    const verificationScore = this.calculateVerificationScore(
      application.tenant.user.documents,
      application.documents
    );

    // 5. Criteria Match Score (0-100)
    const criteriaMatchScore = this.calculateCriteriaMatchScore(
      application.tenant,
      application.listing.preferredTenantCriteria
    );

    // Calculate total score (average of all scores)
    const scores =
      incomeScore + employmentScore + rentalHistoryScore + verificationScore + criteriaMatchScore;
    const totalScore = Math.round(scores / 5);

    const riskLevel = this.calculateRiskLevel(totalScore);
    const notes = this.generateNotes({
      incomeScore,
      employmentScore,
      rentalHistoryScore,
      verificationScore,
      criteriaMatchScore,
    });

    // Save or update scoring in database
    await prisma.tenantScoring.upsert({
      where: { applicationId },
      create: {
        applicationId,
        totalScore: new Decimal(totalScore),
        incomeScore: new Decimal(incomeScore),
        employmentScore: new Decimal(employmentScore),
        rentalHistoryScore: new Decimal(rentalHistoryScore),
        verificationScore: new Decimal(verificationScore),
        criteriaMatchScore: new Decimal(criteriaMatchScore),
        riskLevel,
        notes,
        calculatedAt: new Date(),
      },
      update: {
        totalScore: new Decimal(totalScore),
        incomeScore: new Decimal(incomeScore),
        employmentScore: new Decimal(employmentScore),
        rentalHistoryScore: new Decimal(rentalHistoryScore),
        verificationScore: new Decimal(verificationScore),
        criteriaMatchScore: new Decimal(criteriaMatchScore),
        riskLevel,
        notes,
        calculatedAt: new Date(),
      },
    });

    // Update application with scoring
    await prisma.application.update({
      where: { id: applicationId },
      data: {
        scoringAtApplication: new Decimal(totalScore),
      },
    });

    return {
      totalScore,
      incomeScore,
      employmentScore,
      rentalHistoryScore,
      verificationScore,
      criteriaMatchScore,
      riskLevel,
      notes,
    };
  }

  /**
   * Income Score: ratio of income to rent
   * Ideal: income >= 3x rent = 100 points
   */
  private static calculateIncomeScore(monthlyIncome: number | null, monthlyRent: number): number {
    if (!monthlyIncome || monthlyIncome <= 0) return 0;
    if (monthlyRent <= 0) return 100;

    const ratio = monthlyIncome / monthlyRent;

    if (ratio >= 4) return 100; // Excellent
    if (ratio >= 3) return 90; // Very good
    if (ratio >= 2.5) return 75; // Good
    if (ratio >= 2) return 60; // Acceptable
    if (ratio >= 1.5) return 40; // Risky
    return 20; // High risk
  }

  /**
   * Employment Score: employment stability
   */
  private static calculateEmploymentScore(
    tenant: {
      occupation: string | null;
      employerName: string | null;
    },
    applicationDocs: { type: string; status: string }[],
    userDocs: { type: string; status: string }[]
  ): number {
    let score = 50; // Base score

    // +20 if has verified employment contract
    const hasEmploymentContract =
      applicationDocs.some((d) => d.type === 'EMPLOYMENT_CONTRACT' && d.status === 'VERIFIED') ||
      userDocs.some((d) => d.type === 'EMPLOYMENT_CONTRACT' && d.status === 'VERIFIED');
    if (hasEmploymentContract) score += 20;

    // +15 if has payslip
    const hasPayslip =
      applicationDocs.some((d) => d.type === 'PAYSLIP' && d.status === 'VERIFIED') ||
      userDocs.some((d) => d.type === 'PAYSLIP' && d.status === 'VERIFIED');
    if (hasPayslip) score += 15;

    // +10 if has occupation
    if (tenant.occupation) score += 10;

    // +5 if has employer name
    if (tenant.employerName) score += 5;

    return Math.min(score, 100);
  }

  /**
   * Rental History Score: rental history
   */
  private static calculateRentalHistoryScore(_tenant: {
    // In the future, this could include rental history references
    // For now, we give a base score
    hasPets?: boolean;
    numberOfOccupants?: number | null;
  }): number {
    // Base score for new tenants (no rental history)
    const score = 70;

    // In the future, this could be enhanced with:
    // - References from previous landlords
    // - Rental history verification
    // - Credit check results

    return Math.min(score, 100);
  }

  /**
   * Verification Score: document verification level
   */
  private static calculateVerificationScore(
    userDocs: { type: string; status: string }[],
    applicationDocs: { type: string; status: string }[]
  ): number {
    const allDocs = [...userDocs, ...applicationDocs];

    if (allDocs.length === 0) return 0;

    const verifiedCount = allDocs.filter((d) => d.status === 'VERIFIED').length;
    const totalCount = allDocs.length;

    // Base verification percentage
    const verificationRate = (verifiedCount / totalCount) * 100;

    // Bonus for ID verification
    const hasVerifiedId = userDocs.some(
      (d) => ['ID', 'NIE_TIE'].includes(d.type) && d.status === 'VERIFIED'
    );
    const idBonus = hasVerifiedId ? 20 : 0;

    return Math.min(Math.round(verificationRate * 0.8 + idBonus), 100);
  }

  /**
   * Criteria Match Score: matching owner's criteria
   */
  private static calculateCriteriaMatchScore(
    tenant: {
      monthlyIncome: Decimal | null;
      occupation: string | null;
      hasPets: boolean;
      numberOfOccupants: number | null;
    },
    criteria: unknown
  ): number {
    // If no criteria set, full score
    if (!criteria || typeof criteria !== 'object') return 100;

    const typedCriteria = criteria as {
      minIncome?: number;
      employmentStatus?: string[];
      allowPets?: boolean;
      allowSmoking?: boolean;
      maxOccupants?: number;
    };

    let score = 100;

    // Check minimum income
    if (typedCriteria.minIncome && tenant.monthlyIncome) {
      if (Number(tenant.monthlyIncome) < typedCriteria.minIncome) {
        score -= 30;
      }
    }

    // Check employment status
    if (
      typedCriteria.employmentStatus &&
      typedCriteria.employmentStatus.length > 0 &&
      tenant.occupation
    ) {
      if (!typedCriteria.employmentStatus.includes(tenant.occupation)) {
        score -= 10;
      }
    }

    // Check pets
    if (typedCriteria.allowPets === false && tenant.hasPets) {
      score -= 20;
    }

    // Check max occupants
    if (
      typedCriteria.maxOccupants &&
      tenant.numberOfOccupants &&
      tenant.numberOfOccupants > typedCriteria.maxOccupants
    ) {
      score -= 15;
    }

    return Math.max(score, 0);
  }

  /**
   * Calculate risk level based on total score
   */
  private static calculateRiskLevel(totalScore: number): RiskLevel {
    if (totalScore >= 75) return 'LOW';
    if (totalScore >= 50) return 'MEDIUM';
    return 'HIGH';
  }

  /**
   * Generate notes/recommendations for the owner
   */
  private static generateNotes(scores: {
    incomeScore: number;
    employmentScore: number;
    rentalHistoryScore: number;
    verificationScore: number;
    criteriaMatchScore: number;
  }): string {
    const recommendations: string[] = [];

    if (scores.incomeScore < 60) {
      recommendations.push(
        'El ingreso del inquilino está por debajo del nivel recomendado (3x alquiler). ' +
          'Considere solicitar un depósito adicional o un avalista.'
      );
    }

    if (scores.employmentScore < 60) {
      recommendations.push(
        'Faltan comprobantes de empleo. ' + 'Solicite contrato laboral o nóminas recientes.'
      );
    }

    if (scores.verificationScore < 50) {
      recommendations.push(
        'Nivel bajo de verificación de documentos. ' +
          'Solicite al inquilino que suba y verifique sus documentos.'
      );
    }

    if (scores.criteriaMatchScore < 70) {
      recommendations.push('El inquilino no cumple completamente con los criterios especificados.');
    }

    if (recommendations.length === 0) {
      recommendations.push(
        'El inquilino cumple con todos los criterios. Se recomienda aprobar la solicitud.'
      );
    }

    return recommendations.join('\n\n');
  }

  /**
   * Get existing scoring for an application
   */
  static async getScoring(applicationId: string) {
    return prisma.tenantScoring.findUnique({
      where: { applicationId },
    });
  }
}
