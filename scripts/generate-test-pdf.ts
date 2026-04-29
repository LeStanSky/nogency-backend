/**
 * Quick script to generate a test contract PDF and save it to disk.
 * Run with: npx tsx scripts/generate-test-pdf.ts
 */

import { writeFileSync } from 'fs';
import { ContractPdfService } from '../src/services/contract-pdf.service.js';
import { Prisma } from '@prisma/client';

const mockContract = {
  id: 'test-contract-001',
  contractNumber: 'CTR-2026-ABCD1234',
  leaseType: 'RESIDENTIAL' as const,
  startDate: new Date('2026-04-01'),
  endDate: new Date('2027-03-31'),
  monthlyRent: new Prisma.Decimal(1500),
  depositAmount: new Prisma.Decimal(1500),
  depositMonths: 1,
  additionalGuaranteeMonths: 2,
  paymentDueDay: 5,
  utilitiesResponsibility: 'TENANT' as const,
  sublettingAllowed: false,
  owner: {
    firstName: 'Pablo',
    lastName: 'García Martínez',
    documentType: 'DNI',
    documentNumber: '12345678A',
    bankAccountIban: 'ES91 2100 0418 4502 0005 1332',
    user: { email: 'pablo.garcia@example.com' },
  },
  tenant: {
    firstName: 'Iakov',
    lastName: 'Petrunin',
    documentType: 'PASSPORT',
    documentNumber: '36214908',
    user: { email: 'iakov.petrunin@example.com' },
  },
  listing: {
    property: {
      address: {
        street: 'Plaza Lope de Vega 5, 2º 3ª',
        city: 'Valencia',
        postalCode: '46001',
        province: 'Valencia',
        country: 'España',
      },
      cadastralNumber: '5728201YJ2752H0005EA',
    },
  },
};

async function main() {
  console.log('Generating RESIDENTIAL contract PDF...');
  const residentialBuffer = await ContractPdfService.generateContract(mockContract);
  const residentialPath = 'scripts/test-residential.pdf';
  writeFileSync(residentialPath, residentialBuffer);
  console.log(`✅ Saved: ${residentialPath} (${(residentialBuffer.length / 1024).toFixed(1)} KB)`);

  console.log('Generating SEASONAL contract PDF...');
  const seasonalBuffer = await ContractPdfService.generateContract({
    ...mockContract,
    contractNumber: 'CTR-2026-SEAS5678',
    leaseType: 'SEASONAL',
    endDate: new Date('2028-03-31'),
    additionalGuaranteeMonths: 1,
    utilitiesResponsibility: 'OWNER',
    owner: {
      ...mockContract.owner,
      firstName: 'Francisco',
      lastName: 'Nebot Gómez',
      documentNumber: '26755329G',
    },
  });
  const seasonalPath = 'scripts/test-seasonal.pdf';
  writeFileSync(seasonalPath, seasonalBuffer);
  console.log(`✅ Saved: ${seasonalPath} (${(seasonalBuffer.length / 1024).toFixed(1)} KB)`);
}

main().catch(console.error);
