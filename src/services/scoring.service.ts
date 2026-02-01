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
  financialStabilityScore: number | null;
  riskLevel: RiskLevel;
  notes: string;
}

interface PlaidData {
  incomeStreams?: Array<{
    name: string | null;
    amount: number;
    frequency: string | null;
    confidence: number | null;
  }>;
  accountBalance?: number;
  lastUpdated?: string;
  paystubCount?: number;
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

    // Use Plaid-verified income if available, otherwise use self-reported income
    const incomeVerifiedViaPlaid = application.tenant.incomeVerifiedViaPlaid;
    const plaidVerifiedMonthlyIncome = application.tenant.plaidVerifiedMonthlyIncome
      ? Number(application.tenant.plaidVerifiedMonthlyIncome)
      : null;
    const selfReportedIncome = application.tenant.monthlyIncome
      ? Number(application.tenant.monthlyIncome)
      : null;

    const monthlyIncome =
      incomeVerifiedViaPlaid && plaidVerifiedMonthlyIncome
        ? plaidVerifiedMonthlyIncome
        : selfReportedIncome;

    // 1. Income Score (0-100) - enhanced with Plaid verification bonus
    const incomeScore = this.calculateIncomeScore(
      monthlyIncome,
      monthlyRent,
      incomeVerifiedViaPlaid
    );

    // 2. Employment Score (0-100)
    const employmentScore = this.calculateEmploymentScore(
      application.tenant,
      application.documents,
      application.tenant.user.documents
    );

    // 3. Rental History Score (0-100)
    const rentalHistoryScore = this.calculateRentalHistoryScore(application.tenant);

    // 4. Verification Score (0-100) - includes Plaid verification
    const verificationScore = this.calculateVerificationScore(
      application.tenant.user.documents,
      application.documents,
      incomeVerifiedViaPlaid
    );

    // 5. Criteria Match Score (0-100)
    const criteriaMatchScore = this.calculateCriteriaMatchScore(
      application.tenant,
      application.listing.preferredTenantCriteria
    );

    // 6. Financial Stability Score (0-100) - only if Plaid connected
    const plaidData = application.tenant.plaidData as PlaidData | null;
    const financialStabilityScore = incomeVerifiedViaPlaid
      ? this.calculateFinancialStabilityScore(plaidData)
      : null;

    // Calculate total score
    // If Plaid is connected: average of 6 scores
    // If not: average of 5 scores (excluding financial stability)
    let totalScore: number;
    if (financialStabilityScore !== null) {
      const scores =
        incomeScore +
        employmentScore +
        rentalHistoryScore +
        verificationScore +
        criteriaMatchScore +
        financialStabilityScore;
      totalScore = Math.round(scores / 6);
    } else {
      const scores =
        incomeScore + employmentScore + rentalHistoryScore + verificationScore + criteriaMatchScore;
      totalScore = Math.round(scores / 5);
    }

    const riskLevel = this.calculateRiskLevel(totalScore);
    const notes = this.generateNotes({
      incomeScore,
      employmentScore,
      rentalHistoryScore,
      verificationScore,
      criteriaMatchScore,
      financialStabilityScore,
      incomeVerifiedViaPlaid,
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
        financialStabilityScore:
          financialStabilityScore !== null ? new Decimal(financialStabilityScore) : null,
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
        financialStabilityScore:
          financialStabilityScore !== null ? new Decimal(financialStabilityScore) : null,
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
      financialStabilityScore,
      riskLevel,
      notes,
    };
  }

  /**
   * Income Score: ratio of income to rent
   * Ideal: income >= 3x rent = 100 points
   * Bonus for Plaid-verified income
   */
  private static calculateIncomeScore(
    monthlyIncome: number | null,
    monthlyRent: number,
    incomeVerifiedViaPlaid: boolean
  ): number {
    if (!monthlyIncome || monthlyIncome <= 0) return 0;
    if (monthlyRent <= 0) return 100;

    const ratio = monthlyIncome / monthlyRent;

    let baseScore: number;
    if (ratio >= 4) {
      baseScore = 100; // Excellent
    } else if (ratio >= 3) {
      baseScore = 90; // Very good
    } else if (ratio >= 2.5) {
      baseScore = 75; // Good
    } else if (ratio >= 2) {
      baseScore = 60; // Acceptable
    } else if (ratio >= 1.5) {
      baseScore = 40; // Risky
    } else {
      baseScore = 20; // High risk
    }

    // Bonus for Plaid-verified income (+10 points, capped at 100)
    if (incomeVerifiedViaPlaid) {
      return Math.min(baseScore + 10, 100);
    }

    return baseScore;
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
   * Includes bonus for Plaid income verification
   */
  private static calculateVerificationScore(
    userDocs: { type: string; status: string }[],
    applicationDocs: { type: string; status: string }[],
    incomeVerifiedViaPlaid: boolean
  ): number {
    const allDocs = [...userDocs, ...applicationDocs];

    // Start with base score for Plaid verification
    let score = incomeVerifiedViaPlaid ? 30 : 0;

    if (allDocs.length === 0) {
      // Only Plaid verification counts
      return incomeVerifiedViaPlaid ? 50 : 0;
    }

    const verifiedCount = allDocs.filter((d) => d.status === 'VERIFIED').length;
    const totalCount = allDocs.length;

    // Base verification percentage (scaled to remaining points)
    const maxDocScore = incomeVerifiedViaPlaid ? 50 : 80;
    const verificationRate = (verifiedCount / totalCount) * maxDocScore;
    score += verificationRate;

    // Bonus for ID verification
    const hasVerifiedId = userDocs.some(
      (d) => ['ID', 'NIE_TIE'].includes(d.type) && d.status === 'VERIFIED'
    );
    if (hasVerifiedId) score += 20;

    return Math.min(Math.round(score), 100);
  }

  /**
   * Financial Stability Score: analyze Plaid data for financial health
   * Only calculated when Plaid is connected
   */
  private static calculateFinancialStabilityScore(plaidData: PlaidData | null): number {
    let score = 50; // Base score

    if (!plaidData) {
      return score;
    }

    // Bonus for having income streams
    const incomeStreams = plaidData.incomeStreams || [];
    if (incomeStreams.length > 0) {
      score += 15; // Has verified income sources
    }

    // Bonus for multiple income streams (diversified income)
    if (incomeStreams.length > 1) {
      score += 10;
    }

    // Bonus for high confidence scores
    const avgConfidence =
      incomeStreams.length > 0
        ? incomeStreams.reduce((sum, s) => sum + (s.confidence || 0), 0) / incomeStreams.length
        : 0;
    if (avgConfidence > 0.9) {
      score += 10;
    } else if (avgConfidence > 0.7) {
      score += 5;
    }

    // Bonus for positive account balance (if available)
    const accountBalance = plaidData.accountBalance;
    if (accountBalance !== undefined && accountBalance !== null) {
      if (accountBalance > 10000) {
        score += 15; // Strong savings
      } else if (accountBalance > 5000) {
        score += 10; // Good savings
      } else if (accountBalance > 1000) {
        score += 5; // Some savings
      } else if (accountBalance < 0) {
        score -= 10; // Overdraft (negative indicator)
      }
    }

    // Bonus for multiple paystubs (indicates stable employment)
    const paystubCount = plaidData.paystubCount || 0;
    if (paystubCount >= 3) {
      score += 10; // 3+ months of paystubs
    } else if (paystubCount >= 2) {
      score += 5; // 2 months of paystubs
    }

    return Math.min(Math.max(score, 0), 100);
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
    financialStabilityScore: number | null;
    incomeVerifiedViaPlaid: boolean;
  }): string {
    const recommendations: string[] = [];

    // Plaid verification bonus note
    if (scores.incomeVerifiedViaPlaid) {
      recommendations.push(
        '✓ Ingresos verificados a través de Plaid. ' +
          'Los datos de ingresos provienen directamente de la institución financiera del inquilino.'
      );
    }

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

    // Financial stability recommendations
    if (scores.financialStabilityScore !== null) {
      if (scores.financialStabilityScore >= 80) {
        recommendations.push('✓ Excelente estabilidad financiera verificada por Plaid.');
      } else if (scores.financialStabilityScore < 50) {
        recommendations.push(
          'La estabilidad financiera del inquilino es baja según los datos de Plaid. ' +
            'Considere solicitar garantías adicionales.'
        );
      }
    } else if (!scores.incomeVerifiedViaPlaid) {
      recommendations.push(
        'El inquilino no ha conectado su cuenta bancaria a través de Plaid. ' +
          'Solicite la verificación de ingresos para mayor seguridad.'
      );
    }

    if (
      recommendations.length === 0 ||
      (recommendations.length === 1 && scores.incomeVerifiedViaPlaid)
    ) {
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
