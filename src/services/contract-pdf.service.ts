import PDFDocument from 'pdfkit';
import { Prisma } from '@prisma/client';
import { format } from 'date-fns';
import { serviceLoggers } from '../utils/logger.js';

const log = serviceLoggers.contract;

// ─── Types ───────────────────────────────────────────────────────────────────

interface PropertyAddress {
  street?: string;
  city?: string;
  postalCode?: string;
  province?: string;
  country?: string;
  [key: string]: unknown;
}

export interface ContractForPdf {
  id: string;
  contractNumber: string;
  leaseType: 'RESIDENTIAL' | 'SEASONAL';
  startDate: Date;
  endDate: Date;
  monthlyRent: Prisma.Decimal | number;
  depositAmount: Prisma.Decimal | number;
  depositMonths: number;
  additionalGuaranteeMonths: number;
  paymentDueDay: number;
  utilitiesResponsibility: 'OWNER' | 'TENANT' | 'SHARED';
  sublettingAllowed: boolean;
  owner: {
    firstName: string;
    lastName: string;
    documentType: string;
    documentNumber: string;
    bankAccountIban?: string | null;
    user: { email: string };
  };
  tenant: {
    firstName: string;
    lastName: string;
    documentType: string;
    documentNumber: string;
    user: { email: string };
  };
  listing: {
    property: {
      address: unknown;
      cadastralNumber?: string | null;
    };
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDateEs(date: Date): string {
  const d = format(date, 'd');
  const months = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
  ];
  const m = months[date.getMonth()];
  const y = format(date, 'yyyy');
  return `${d} de ${m} de ${y}`;
}

function fmtDateEn(date: Date): string {
  return format(date, 'MMMM d, yyyy');
}

function fmtCurrencyEs(amount: Prisma.Decimal | number): string {
  const n = Number(amount);
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' EUR';
}

function fmtCurrencyEn(amount: Prisma.Decimal | number): string {
  const n = Number(amount);
  return '€' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseAddress(raw: unknown): PropertyAddress {
  if (raw && typeof raw === 'object') return raw as PropertyAddress;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return { street: raw };
    }
  }
  return {};
}

function formatAddressEs(addr: PropertyAddress): string {
  const parts = [addr.street, addr.city, addr.postalCode, addr.province].filter(Boolean);
  return parts.join(', ');
}

function utilitiesEs(u: string): string {
  if (u === 'OWNER') return 'El arrendador';
  if (u === 'TENANT') return 'El arrendatario';
  return 'Ambas partes';
}

function utilitiesEn(u: string): string {
  if (u === 'OWNER') return 'The landlord';
  if (u === 'TENANT') return 'The tenant';
  return 'Both parties';
}

function docTypeEs(type: string): string {
  const map: Record<string, string> = {
    DNI: 'DNI',
    NIE: 'NIE',
    TIE: 'TIE',
    PASSPORT: 'Pasaporte',
  };
  return map[type] ?? type;
}

function docTypeEn(type: string): string {
  const map: Record<string, string> = {
    DNI: 'DNI',
    NIE: 'NIE',
    TIE: 'TIE',
    PASSPORT: 'Passport',
  };
  return map[type] ?? type;
}

// ─── PDF Builder ─────────────────────────────────────────────────────────────

const MARGIN = 50;
const PAGE_WIDTH = 595.28; // A4
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const COLOR_PRIMARY = '#1a1a2e';
const COLOR_SECONDARY = '#4a4a6a';
const COLOR_ACCENT = '#2563eb';
const COLOR_LINE = '#d1d5db';
const COLOR_LABEL_ES = '#b91c1c'; // dark red for Spanish label
const COLOR_LABEL_EN = '#1d4ed8'; // dark blue for English label

export class ContractPdfService {
  /**
   * Generate bilingual (ES + EN) PDF for a lease contract
   * Returns the PDF as a Buffer
   */
  static async generateContract(contract: ContractForPdf): Promise<Buffer> {
    log.info({ contractId: contract.id, leaseType: contract.leaseType }, 'Generating contract PDF');

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: MARGIN, left: MARGIN, bottom: MARGIN, right: MARGIN },
        info: {
          Title: `Lease Contract ${contract.contractNumber}`,
          Author: 'NoGency AI',
          Subject:
            contract.leaseType === 'RESIDENTIAL'
              ? 'Residential Lease Agreement'
              : 'Seasonal Lease Agreement',
        },
      });

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      try {
        if (contract.leaseType === 'RESIDENTIAL') {
          ContractPdfService.buildResidential(doc, contract);
        } else {
          ContractPdfService.buildSeasonal(doc, contract);
        }
        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  // ── Shared helpers ───────────────────────────────────────────────────────

  private static addPageHeader(doc: PDFKit.PDFDocument, contractNumber: string) {
    doc
      .fillColor(COLOR_PRIMARY)
      .fontSize(7)
      .text(`NoGency AI  ·  Contrato ${contractNumber}`, MARGIN, 20, {
        width: CONTENT_WIDTH,
        align: 'right',
      });
    doc
      .moveTo(MARGIN, 35)
      .lineTo(PAGE_WIDTH - MARGIN, 35)
      .strokeColor(COLOR_LINE)
      .lineWidth(0.5)
      .stroke();
  }

  private static addCoverHeader(
    doc: PDFKit.PDFDocument,
    titleEs: string,
    titleEn: string,
    subtitle: string,
    contractNumber: string
  ) {
    // Blue accent bar
    doc.rect(MARGIN, MARGIN, CONTENT_WIDTH, 4).fill(COLOR_ACCENT);

    doc
      .moveDown(0.5)
      .fillColor(COLOR_PRIMARY)
      .fontSize(18)
      .font('Helvetica-Bold')
      .text(titleEs, MARGIN, MARGIN + 20, { width: CONTENT_WIDTH, align: 'center' });

    doc
      .fillColor(COLOR_SECONDARY)
      .fontSize(13)
      .font('Helvetica')
      .text(titleEn, { width: CONTENT_WIDTH, align: 'center' });

    doc.moveDown(0.3);
    doc.fillColor(COLOR_LINE).fontSize(9).text(subtitle, { width: CONTENT_WIDTH, align: 'center' });

    doc.moveDown(0.5);
    doc
      .fillColor(COLOR_ACCENT)
      .fontSize(10)
      .font('Helvetica-Bold')
      .text(`N.º ${contractNumber}`, { width: CONTENT_WIDTH, align: 'center' });

    doc.moveDown(1);
    doc
      .moveTo(MARGIN, doc.y)
      .lineTo(PAGE_WIDTH - MARGIN, doc.y)
      .strokeColor(COLOR_ACCENT)
      .lineWidth(1)
      .stroke();
    doc.moveDown(1);
  }

  private static addParties(doc: PDFKit.PDFDocument, contract: ContractForPdf) {
    const addr = parseAddress(contract.listing.property.address);
    const signingDate = new Date();

    ContractPdfService.sectionHeader(doc, 'REUNIDOS / PARTIES', 'REUNIDOS', 'PARTIES');

    // Location & date
    doc
      .fillColor(COLOR_PRIMARY)
      .fontSize(10)
      .font('Helvetica')
      .text(
        `En Valencia, a ${fmtDateEs(signingDate)} — In Valencia, on ${fmtDateEn(signingDate)}`,
        { width: CONTENT_WIDTH }
      );
    doc.moveDown(0.7);

    // Owner
    doc
      .fillColor(COLOR_LABEL_ES)
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('ARRENDADOR / LANDLORD:');
    doc
      .fillColor(COLOR_PRIMARY)
      .fontSize(10)
      .font('Helvetica')
      .text(
        `D./Dña. ${contract.owner.firstName} ${contract.owner.lastName}, ` +
          `${docTypeEs(contract.owner.documentType)} núm. ${contract.owner.documentNumber}, ` +
          `correo electrónico: ${contract.owner.user.email}`,
        { width: CONTENT_WIDTH }
      )
      .text(
        `Mr./Ms. ${contract.owner.firstName} ${contract.owner.lastName}, ` +
          `${docTypeEn(contract.owner.documentType)} no. ${contract.owner.documentNumber}, ` +
          `email: ${contract.owner.user.email}`,
        { width: CONTENT_WIDTH }
      );
    doc.moveDown(0.7);

    // Tenant
    doc
      .fillColor(COLOR_LABEL_EN)
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('ARRENDATARIO / TENANT:');
    doc
      .fillColor(COLOR_PRIMARY)
      .fontSize(10)
      .font('Helvetica')
      .text(
        `D./Dña. ${contract.tenant.firstName} ${contract.tenant.lastName}, ` +
          `${docTypeEs(contract.tenant.documentType)} núm. ${contract.tenant.documentNumber}, ` +
          `correo electrónico: ${contract.tenant.user.email}`,
        { width: CONTENT_WIDTH }
      )
      .text(
        `Mr./Ms. ${contract.tenant.firstName} ${contract.tenant.lastName}, ` +
          `${docTypeEn(contract.tenant.documentType)} no. ${contract.tenant.documentNumber}, ` +
          `email: ${contract.tenant.user.email}`,
        { width: CONTENT_WIDTH }
      );
    doc.moveDown(0.7);

    // Property
    doc.fillColor(COLOR_LABEL_ES).fontSize(10).font('Helvetica-Bold').text('INMUEBLE / PROPERTY:');
    const addressStr = formatAddressEs(addr);
    const cadastral = contract.listing.property.cadastralNumber;
    doc
      .fillColor(COLOR_PRIMARY)
      .fontSize(10)
      .font('Helvetica')
      .text(addressStr + (cadastral ? ` (Ref. catastral: ${cadastral})` : ''), {
        width: CONTENT_WIDTH,
      });
    doc.moveDown(1);
  }

  private static sectionHeader(
    doc: PDFKit.PDFDocument,
    _id: string,
    titleEs: string,
    titleEn: string
  ) {
    // Horizontal rule
    doc
      .moveTo(MARGIN, doc.y)
      .lineTo(PAGE_WIDTH - MARGIN, doc.y)
      .strokeColor(COLOR_LINE)
      .lineWidth(0.5)
      .stroke();
    doc.moveDown(0.4);

    doc
      .fillColor(COLOR_ACCENT)
      .fontSize(11)
      .font('Helvetica-Bold')
      .text(titleEs.toUpperCase(), MARGIN, doc.y, { continued: true })
      .fillColor(COLOR_SECONDARY)
      .text('  /  ', { continued: true })
      .fillColor(COLOR_ACCENT)
      .text(titleEn.toUpperCase());
    doc.moveDown(0.5);
  }

  private static clause(
    doc: PDFKit.PDFDocument,
    number: string,
    titleEs: string,
    titleEn: string,
    textEs: string,
    textEn: string
  ) {
    // Clause heading
    doc
      .fillColor(COLOR_PRIMARY)
      .fontSize(10)
      .font('Helvetica-Bold')
      .text(`CLÁUSULA ${number}. — ${titleEs.toUpperCase()}`, MARGIN, doc.y, {
        width: CONTENT_WIDTH,
      });
    doc
      .fillColor(COLOR_SECONDARY)
      .fontSize(9)
      .font('Helvetica-Oblique')
      .text(`CLAUSE ${number}. — ${titleEn.toUpperCase()}`, { width: CONTENT_WIDTH });
    doc.moveDown(0.3);

    // Spanish text
    doc
      .fillColor(COLOR_LABEL_ES)
      .fontSize(8)
      .font('Helvetica-Bold')
      .text('ES ›', MARGIN, doc.y, { continued: true })
      .fillColor(COLOR_PRIMARY)
      .fontSize(9.5)
      .font('Helvetica')
      .text('  ' + textEs, { width: CONTENT_WIDTH });
    doc.moveDown(0.4);

    // English text
    doc
      .fillColor(COLOR_LABEL_EN)
      .fontSize(8)
      .font('Helvetica-Bold')
      .text('EN ›', MARGIN, doc.y, { continued: true })
      .fillColor(COLOR_SECONDARY)
      .fontSize(9.5)
      .font('Helvetica')
      .text('  ' + textEn, { width: CONTENT_WIDTH });
    doc.moveDown(0.9);
  }

  private static addSignatureBlock(doc: PDFKit.PDFDocument, contract: ContractForPdf) {
    // Ensure we have space or add new page
    if (doc.y > 680) {
      doc.addPage();
      ContractPdfService.addPageHeader(doc, contract.contractNumber);
      doc.moveDown(2);
    }

    doc
      .moveTo(MARGIN, doc.y)
      .lineTo(PAGE_WIDTH - MARGIN, doc.y)
      .strokeColor(COLOR_ACCENT)
      .lineWidth(1)
      .stroke();
    doc.moveDown(1);

    doc
      .fillColor(COLOR_PRIMARY)
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('FIRMAS / SIGNATURES', { width: CONTENT_WIDTH, align: 'center' });
    doc.moveDown(1);

    const col = CONTENT_WIDTH / 2 - 10;
    const rightX = MARGIN + col + 20;

    // Save Y before starting the two-column section
    const startY = doc.y;

    // ── Left column: Owner ──────────────────────────────────────────────────
    doc
      .fillColor(COLOR_PRIMARY)
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('EL ARRENDADOR / THE LANDLORD', MARGIN, startY, { width: col });
    doc
      .fillColor(COLOR_SECONDARY)
      .fontSize(10)
      .font('Helvetica')
      .text(`${contract.owner.firstName} ${contract.owner.lastName}`, MARGIN, doc.y, {
        width: col,
      });

    const yAfterOwner = doc.y;

    // ── Right column: Tenant (reset to startY) ──────────────────────────────
    doc
      .fillColor(COLOR_PRIMARY)
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('EL ARRENDATARIO / THE TENANT', rightX, startY, { width: col });
    doc
      .fillColor(COLOR_SECONDARY)
      .fontSize(10)
      .font('Helvetica')
      .text(`${contract.tenant.firstName} ${contract.tenant.lastName}`, rightX, doc.y, {
        width: col,
      });

    const yAfterTenant = doc.y;

    // Continue from the lower of the two columns
    doc.y = Math.max(yAfterOwner, yAfterTenant) + 50;

    // Signature lines
    const lineY = doc.y;
    doc
      .moveTo(MARGIN, lineY)
      .lineTo(MARGIN + col, lineY)
      .strokeColor(COLOR_PRIMARY)
      .lineWidth(0.5)
      .stroke();
    doc
      .moveTo(rightX, lineY)
      .lineTo(rightX + col, lineY)
      .strokeColor(COLOR_PRIMARY)
      .lineWidth(0.5)
      .stroke();

    doc.y = lineY + 6;
    doc
      .fillColor(COLOR_SECONDARY)
      .fontSize(8)
      .text('Firma / Signature', MARGIN, doc.y, { width: col, align: 'center' })
      .text('Firma / Signature', rightX, doc.y, { width: col, align: 'center' });

    doc.moveDown(2);
    const dateY = doc.y;
    doc
      .fillColor(COLOR_SECONDARY)
      .fontSize(9)
      .text('Fecha / Date: ___________________________', MARGIN, dateY, { width: col })
      .text('Fecha / Date: ___________________________', rightX, dateY, { width: col });

    doc.moveDown(2);
    doc
      .fillColor(COLOR_LINE)
      .fontSize(7)
      .text('Generado por NoGency AI · nogency.io', { width: CONTENT_WIDTH, align: 'center' });
  }

  // ── RESIDENTIAL (LAU Title II) ───────────────────────────────────────────

  private static buildResidential(doc: PDFKit.PDFDocument, c: ContractForPdf) {
    const addr = parseAddress(c.listing.property.address);
    const addrStr = formatAddressEs(addr);
    const rent = fmtCurrencyEs(c.monthlyRent);
    const rentEn = fmtCurrencyEn(c.monthlyRent);
    const deposit = fmtCurrencyEs(c.depositAmount);
    const depositEn = fmtCurrencyEn(c.depositAmount);
    const addlGuaranteeAmt = fmtCurrencyEs(Number(c.monthlyRent) * c.additionalGuaranteeMonths);
    const addlGuaranteeAmtEn = fmtCurrencyEn(Number(c.monthlyRent) * c.additionalGuaranteeMonths);
    const startEs = fmtDateEs(c.startDate);
    const endEs = fmtDateEs(c.endDate);
    const startEn = fmtDateEn(c.startDate);
    const endEn = fmtDateEn(c.endDate);
    const iban = c.owner.bankAccountIban ?? '______________________________';
    const utilsEs = utilitiesEs(c.utilitiesResponsibility);
    const utilsEn = utilitiesEn(c.utilitiesResponsibility);

    // Cover
    ContractPdfService.addCoverHeader(
      doc,
      'CONTRATO DE ARRENDAMIENTO DE VIVIENDA',
      'RESIDENTIAL LEASING AGREEMENT',
      'Ley 29/1994 de Arrendamientos Urbanos — Título II',
      c.contractNumber
    );

    ContractPdfService.addParties(doc, c);

    // Preamble
    ContractPdfService.sectionHeader(doc, 'MANIFIESTAN / RECITALS', 'MANIFIESTAN', 'RECITALS');

    doc
      .fillColor(COLOR_PRIMARY)
      .fontSize(9.5)
      .font('Helvetica')
      .text(
        `I. El arrendador declara ser propietario del inmueble sito en ${addrStr}, con las características recogidas en el Anexo I, libre de cargas y con certificado de eficiencia energética vigente.\n` +
          `I. The landlord declares to be the owner of the property located at ${addrStr}, with the characteristics set out in Annex I, free of encumbrances and with a valid energy efficiency certificate.`,
        { width: CONTENT_WIDTH }
      );
    doc.moveDown(0.5);
    doc
      .fillColor(COLOR_PRIMARY)
      .fontSize(9.5)
      .font('Helvetica')
      .text(
        `II. El arrendatario tiene interés en arrendar dicho inmueble para destinarlo a vivienda habitual y permanente.\n` +
          `II. The tenant wishes to lease the said property for use as their main and permanent residence.`,
        { width: CONTENT_WIDTH }
      );
    doc.moveDown(0.5);
    doc
      .fillColor(COLOR_PRIMARY)
      .fontSize(9.5)
      .font('Helvetica')
      .text(
        `III. Ambas partes, reconociéndose capacidad legal para contratar, formalizan el presente contrato.\n` +
          `III. Both parties, acknowledging their legal capacity to contract, hereby formalise this agreement.`,
        { width: CONTENT_WIDTH }
      );
    doc.moveDown(1);

    ContractPdfService.sectionHeader(doc, 'ESTIPULACIONES / CLAUSES', 'ESTIPULACIONES', 'CLAUSES');

    // Clause 1
    ContractPdfService.clause(
      doc,
      'PRIMERA',
      'Objeto',
      'Purpose',
      `El arrendador cede en arrendamiento al arrendatario el inmueble descrito en el encabezamiento, con los elementos y accesorios que constan en el Anexo I. El inmueble se destina exclusivamente a vivienda habitual y permanente del arrendatario. Se prohíbe expresamente cualquier uso comercial, profesional o de alojamiento turístico.`,
      `The landlord leases to the tenant the property described in the header, together with the furniture and accessories listed in Annex I. The property shall be used exclusively as the tenant's main and permanent residence. Any commercial, professional or tourist accommodation use is expressly prohibited.`
    );

    // Clause 2
    ContractPdfService.clause(
      doc,
      'SEGUNDA',
      'Estado del Inmueble',
      'Condition of the Property',
      `El arrendatario declara recibir el inmueble en buen estado de conservación y habitabilidad. Dispone de un plazo de quince (15) días desde la firma para comunicar al arrendador, por escrito, cualquier defecto o desperfecto preexistente. El inmueble se entregará limpio y en perfecto estado, y deberá ser devuelto en idénticas condiciones al término del contrato, salvo el desgaste normal derivado del uso.`,
      `The tenant acknowledges receiving the property in good condition and habitable state. Within fifteen (15) days of signing, the tenant may notify the landlord in writing of any pre-existing defects. The property shall be handed over clean and in perfect condition and must be returned in the same state at the end of the contract, subject to normal wear and tear.`
    );

    // Clause 3 — Term (residential specifics)
    ContractPdfService.clause(
      doc,
      'TERCERA',
      'Plazo',
      'Term',
      `El contrato tiene una duración de ${Math.round((c.endDate.getTime() - c.startDate.getTime()) / (1000 * 60 * 60 * 24 * 30))} meses, con inicio el ${startEs} y vencimiento el ${endEs}. Si el arrendatario es persona física, el contrato se prorrogará obligatoriamente por períodos anuales hasta alcanzar un mínimo de cinco (5) años, salvo que el arrendatario notifique su voluntad de no renovar con al menos treinta (30) días de antelación al vencimiento de cada período. El arrendador podrá recuperar el inmueble para uso propio transcurrido el primer año, con un preaviso mínimo de dos (2) meses. Superado el plazo mínimo legal, cualquiera de las partes podrá no renovar con un preaviso de cuatro (4) meses el arrendador o dos (2) meses el arrendatario. Los últimos dos meses, el arrendatario permitirá visitas al inmueble con preaviso de veinticuatro (24) horas.`,
      `The lease term is ${Math.round((c.endDate.getTime() - c.startDate.getTime()) / (1000 * 60 * 60 * 24 * 30))} months, commencing on ${startEn} and expiring on ${endEn}. Where the tenant is a natural person, the contract shall be automatically renewed annually up to a minimum of five (5) years, unless the tenant gives at least thirty (30) days' notice prior to each renewal date. The landlord may reclaim the property for personal use after the first year with at least two (2) months' notice. After the minimum legal term, either party may decline renewal upon four (4) months' notice (landlord) or two (2) months' notice (tenant). During the final two months, the tenant shall allow viewings of the property upon twenty-four (24) hours' notice.`
    );

    // Clause 4 — Rent
    ContractPdfService.clause(
      doc,
      'CUARTA',
      'Renta y Forma de Pago',
      'Rent and Payment',
      `La renta mensual se fija en ${rent}. El pago se realizará mediante domiciliación bancaria, dentro de los primeros ${c.paymentDueDay} días de cada mes, en la cuenta bancaria indicada por el arrendador (IBAN: ${iban}). Los gastos de devolución bancaria serán de cargo del arrendatario. El incumplimiento del plazo de pago generará el derecho del arrendador a exigir los intereses de demora legales.`,
      `The monthly rent is ${rentEn}. Payment shall be made by bank transfer by the ${c.paymentDueDay}${['st', 'nd', 'rd'][c.paymentDueDay - 1] || 'th'} day of each month to the landlord's account (IBAN: ${iban}). Any bank return charges shall be borne by the tenant. Late payment entitles the landlord to claim statutory default interest.`
    );

    // Clause 5 — Rent review
    ContractPdfService.clause(
      doc,
      'QUINTA',
      'Actualización de la Renta',
      'Rent Review',
      `La renta se actualizará anualmente en la fecha en que se cumpla cada año de vigencia del contrato, conforme a la variación porcentual del Índice de Precios al Consumo General publicado por el INE para el mes de referencia. El arrendador notificará la actualización por escrito; el retraso en la notificación no supone la renuncia al derecho.`,
      `The rent shall be reviewed annually on each anniversary of the contract commencement date, in accordance with the percentage variation of the Spanish General Consumer Price Index (CPI) published by INE for the reference month. The landlord shall notify the revision in writing; delay in notification does not constitute a waiver of the right.`
    );

    // Clause 6 — Utilities
    ContractPdfService.clause(
      doc,
      'SEXTA',
      'Suministros',
      'Utilities',
      `${utilsEs} asume el coste de los suministros del inmueble (agua, electricidad, gas y telecomunicaciones). El arrendatario deberá cambiar la titularidad de los contratos de suministro a su nombre en el plazo de quince (15) días desde la firma. Al término del contrato, el arrendatario no cancelará los suministros; la titularidad revertirá al arrendador desde la fecha de entrega de llaves.`,
      `${utilsEn} shall bear the cost of utilities (water, electricity, gas and telecommunications). The tenant shall transfer the utility contracts into their name within fifteen (15) days of signing. At the end of the contract, the tenant shall not cancel any utilities; the contracts shall revert to the landlord from the date of key handover.`
    );

    // Clause 7 — Works
    ContractPdfService.clause(
      doc,
      'SÉPTIMA',
      'Obras y Reparaciones',
      'Works and Repairs',
      `Las obras de conservación necesarias para mantener el inmueble en condiciones de habitabilidad son a cargo del arrendador, conforme al artículo 21 LAU. El arrendatario notificará al arrendador cualquier desperfecto con la mayor diligencia. Las pequeñas reparaciones derivadas del desgaste normal del uso serán de cargo del arrendatario (cristales, cerraduras, persianas, griferías, desagües, pintura interior). Queda prohibida cualquier obra de reforma, instalación o modificación estructural sin consentimiento expreso y escrito del arrendador. Las obras no autorizadas podrán dar lugar a la resolución del contrato y a la obligación de reponer el inmueble a su estado original.`,
      `Maintenance works necessary to keep the property habitable shall be the landlord's responsibility under LAU Article 21. The tenant shall promptly notify the landlord of any damage. Minor repairs arising from normal use (glass, locks, blinds, taps, drains, interior paintwork) are the tenant's responsibility. Any structural alterations or installations are prohibited without the landlord's express written consent. Unauthorised works may result in termination of the contract and an obligation to restore the property to its original condition.`
    );

    // Clause 8 — Liability
    ContractPdfService.clause(
      doc,
      'OCTAVA',
      'Responsabilidad e Seguro',
      'Liability and Insurance',
      `El arrendatario responde de los daños causados al inmueble o a terceros por su actividad o la de las personas de su unidad familiar. El arrendatario se compromete a contratar y mantener en vigor durante toda la vigencia del contrato un seguro de responsabilidad civil que cubra los daños derivados de su ocupación del inmueble.`,
      `The tenant is liable for any damage caused to the property or to third parties by their own activities or those of members of their household. The tenant undertakes to take out and maintain throughout the lease term a third-party liability insurance policy covering damage arising from their occupation of the property.`
    );

    // Clause 9 — Obligations
    ContractPdfService.clause(
      doc,
      'NOVENA',
      'Obligaciones del Arrendatario',
      `Tenant's Obligations`,
      `El arrendatario se obliga a: (i) pagar la renta en el plazo convenido; (ii) no ceder ni subarrendar total ni parcialmente el inmueble sin consentimiento escrito del arrendador; (iii) no almacenar materiales explosivos, inflamables o nocivos; (iv) cumplir la normativa de la comunidad de propietarios; (v) no tener mascotas sin autorización escrita previa del arrendador; (vi) no realizar perforaciones en alicatados de baños o cocinas. El incumplimiento de estas obligaciones podrá dar lugar a la resolución del contrato.`,
      `The tenant undertakes to: (i) pay the rent by the agreed date; (ii) not assign or sublet the property, in whole or in part, without the landlord's written consent; (iii) not store explosive, flammable or hazardous materials; (iv) comply with the homeowners' community rules; (v) not keep pets without the landlord's prior written authorisation; (vi) not drill into bathroom or kitchen tiling. Breach of these obligations may result in termination of the contract.`
    );

    // Clause 10 — Deposit
    ContractPdfService.clause(
      doc,
      'DÉCIMA',
      'Garantías',
      'Guarantees',
      `En concepto de fianza legal, el arrendatario entrega al arrendador la cantidad de ${deposit} (equivalente a ${c.depositMonths} mes/es de renta). Dicha fianza no podrá aplicarse al pago de rentas vencidas. El arrendador la depositará ante el organismo competente de la Comunitat Valenciana en el plazo legalmente establecido.${c.additionalGuaranteeMonths > 0 ? ` Adicionalmente, el arrendatario constituye una garantía adicional de ${addlGuaranteeAmt} (${c.additionalGuaranteeMonths} mes/es de renta) en metálico o mediante aval bancario.` : ''} Ambas garantías serán devueltas en el plazo máximo de treinta (30) días desde la entrega de llaves, deduciéndose, en su caso, los importes correspondientes a rentas impagadas, suministros pendientes o daños al inmueble.`,
      `As statutory security deposit (fianza), the tenant pays the landlord ${depositEn} (equivalent to ${c.depositMonths} month(s) of rent). This deposit may not be applied to outstanding rent. The landlord shall lodge it with the competent authority of the Comunitat Valenciana within the legally established period.${c.additionalGuaranteeMonths > 0 ? ` Additionally, the tenant provides a supplementary guarantee of ${addlGuaranteeAmtEn} (${c.additionalGuaranteeMonths} month(s) of rent) in cash or as a bank guarantee.` : ''} Both guarantees shall be returned within thirty (30) days of key handover, net of any deductions for unpaid rent, outstanding utilities or damage to the property.`
    );

    // Clause 11 — Misc
    ContractPdfService.clause(
      doc,
      'UNDÉCIMA',
      'Disposiciones Generales',
      'General Provisions',
      `Cualquiera de las partes podrá solicitar la elevación del contrato a escritura pública e inscripción en el Registro de la Propiedad, siendo los gastos de cargo de quien lo solicite. El arrendatario renuncia expresamente a los derechos de adquisición preferente (tanteo y retracto). Las notificaciones se realizarán al domicilio que figura en el encabezamiento o por correo electrónico a las direcciones indicadas. Este contrato se rige por la Ley 29/1994 de Arrendamientos Urbanos y, supletoriamente, por el Código Civil.`,
      `Either party may request the notarisation and registration of this contract at the Land Registry at their own expense. The tenant expressly waives the right of first refusal and repurchase. Notices shall be served at the addresses in the header or by email to the addresses provided. This contract is governed by the Spanish Urban Leasing Act (LAU 29/1994) and, supplementarily, by the Civil Code.`
    );

    // Clause 12 — Language
    ContractPdfService.clause(
      doc,
      'DUODÉCIMA',
      'Idioma',
      'Language',
      `Este contrato se redacta en español e inglés. En caso de discrepancia entre ambas versiones, prevalecerá la versión en español.`,
      `This contract is drafted in Spanish and English. In the event of any discrepancy between the two versions, the Spanish version shall prevail.`
    );

    ContractPdfService.addSignatureBlock(doc, c);
  }

  // ── SEASONAL (LAU Title III) ─────────────────────────────────────────────

  private static buildSeasonal(doc: PDFKit.PDFDocument, c: ContractForPdf) {
    const addr = parseAddress(c.listing.property.address);
    const addrStr = formatAddressEs(addr);
    const rent = fmtCurrencyEs(c.monthlyRent);
    const rentEn = fmtCurrencyEn(c.monthlyRent);
    const deposit = fmtCurrencyEs(c.depositAmount);
    const depositEn = fmtCurrencyEn(c.depositAmount);
    const addlGuaranteeAmt = fmtCurrencyEs(Number(c.monthlyRent) * c.additionalGuaranteeMonths);
    const addlGuaranteeAmtEn = fmtCurrencyEn(Number(c.monthlyRent) * c.additionalGuaranteeMonths);
    const startEs = fmtDateEs(c.startDate);
    const endEs = fmtDateEs(c.endDate);
    const startEn = fmtDateEn(c.startDate);
    const endEn = fmtDateEn(c.endDate);
    const iban = c.owner.bankAccountIban ?? '______________________________';
    const utilsEs = utilitiesEs(c.utilitiesResponsibility);
    const utilsEn = utilitiesEn(c.utilitiesResponsibility);

    // Cover
    ContractPdfService.addCoverHeader(
      doc,
      'CONTRATO DE ARRENDAMIENTO DE TEMPORADA',
      'SEASONAL LEASING AGREEMENT',
      'Ley 29/1994 de Arrendamientos Urbanos — Título III (Uso distinto de vivienda)',
      c.contractNumber
    );

    ContractPdfService.addParties(doc, c);

    // Preamble
    ContractPdfService.sectionHeader(doc, 'MANIFIESTAN / RECITALS', 'MANIFIESTAN', 'RECITALS');

    doc
      .fillColor(COLOR_PRIMARY)
      .fontSize(9.5)
      .font('Helvetica')
      .text(
        `I. El arrendador declara ser propietario del inmueble sito en ${addrStr}, amueblado y provisto de electrodomésticos, libre de cargas y con la documentación técnica vigente.\n` +
          `I. The landlord declares to be the owner of the furnished property located at ${addrStr}, equipped with household appliances, free of encumbrances and with valid technical documentation.`,
        { width: CONTENT_WIDTH }
      );
    doc.moveDown(0.5);
    doc
      .fillColor(COLOR_PRIMARY)
      .fontSize(9.5)
      .font('Helvetica')
      .text(
        `II. El arrendatario desea arrendar el inmueble con carácter temporal, siendo su residencia habitual el extranjero, lo que determina la calificación del contrato como de uso distinto de vivienda conforme al artículo 3 de la LAU.\n` +
          `II. The tenant wishes to lease the property on a temporary basis, having their habitual residence abroad, which classifies this contract as a non-residential use lease under Article 3 of the LAU.`,
        { width: CONTENT_WIDTH }
      );
    doc.moveDown(0.5);
    doc
      .fillColor(COLOR_PRIMARY)
      .fontSize(9.5)
      .font('Helvetica')
      .text(
        `III. Ambas partes formalizan el presente contrato de temporada al amparo de lo previsto en el Título III de la LAU.\n` +
          `III. Both parties hereby formalise this seasonal lease agreement pursuant to Title III of the LAU.`,
        { width: CONTENT_WIDTH }
      );
    doc.moveDown(1);

    ContractPdfService.sectionHeader(doc, 'ESTIPULACIONES / CLAUSES', 'ESTIPULACIONES', 'CLAUSES');

    // Clause 1
    ContractPdfService.clause(
      doc,
      'PRIMERA',
      'Objeto',
      'Purpose',
      `El arrendador cede en arrendamiento de temporada al arrendatario el inmueble descrito en el encabezamiento, con el mobiliario y enseres recogidos en el Anexo I. El inmueble se destina a residencia temporal del arrendatario, quedando expresamente excluido cualquier uso comercial o turístico.`,
      `The landlord leases the property described in the header to the tenant on a seasonal basis, together with the furniture and fittings listed in Annex I. The property shall be used as the tenant's temporary residence; any commercial or tourist use is expressly excluded.`
    );

    // Clause 2
    ContractPdfService.clause(
      doc,
      'SEGUNDA',
      'Estado del Inmueble',
      'Condition of the Property',
      `El arrendatario declara recibir el inmueble en buen estado de conservación y con todo el mobiliario y electrodomésticos en correcto funcionamiento. Dispone de quince (15) días desde la firma para comunicar por escrito cualquier defecto preexistente. El inmueble deberá ser devuelto al término del contrato en el mismo estado en que fue entregado, salvo el desgaste normal de uso.`,
      `The tenant acknowledges receiving the property in good condition with all furniture and appliances in proper working order. Within fifteen (15) days of signing, the tenant may notify the landlord in writing of any pre-existing defects. The property must be returned at the end of the contract in the same condition as received, subject to normal wear and tear.`
    );

    // Clause 3 — Term (seasonal — fixed, no extensions)
    ContractPdfService.clause(
      doc,
      'TERCERA',
      'Plazo',
      'Term',
      `El contrato tendrá una duración fija desde el ${startEs} hasta el ${endEs}, sin posibilidad de prórroga automática. Cualquier extensión requerirá acuerdo escrito entre las partes con al menos un (1) mes de antelación al vencimiento. Al tratarse de un arrendamiento de uso distinto de vivienda, no son de aplicación los plazos mínimos de duración ni las prórrogas obligatorias previstas en el Título II de la LAU. Durante los dos últimos meses, el arrendatario permitirá visitas al inmueble con un preaviso de veinticuatro (24) horas.`,
      `The contract shall have a fixed term from ${startEn} to ${endEn}, with no automatic renewal. Any extension requires a written agreement between the parties at least one (1) month before expiry. As this is a non-residential use lease, the minimum duration and mandatory renewal provisions of LAU Title II do not apply. During the final two months, the tenant shall allow viewings of the property upon twenty-four (24) hours' notice.`
    );

    // Clause 4 — Rent and payment (seasonal includes ITP note)
    ContractPdfService.clause(
      doc,
      'CUARTA',
      'Renta y Forma de Pago',
      'Rent and Payment',
      `La renta mensual se fija en ${rent}. El pago se realizará mediante transferencia bancaria dentro de los primeros ${c.paymentDueDay} días de cada mes a la cuenta (IBAN: ${iban}). El primer mes de renta se abona simultáneamente a la entrega de las garantías. Los gastos de devolución bancaria son de cargo del arrendatario. El arrendatario queda obligado a presentar autoliquidación del Impuesto sobre Transmisiones Patrimoniales (ITP) en el plazo de treinta (30) días hábiles desde la firma del presente contrato, conforme al Real Decreto Legislativo 1/1993, y a acreditar su pago antes del abono de la primera renta.`,
      `The monthly rent is ${rentEn}. Payment shall be made by bank transfer by the ${c.paymentDueDay}${['st', 'nd', 'rd'][c.paymentDueDay - 1] || 'th'} day of each month to (IBAN: ${iban}). The first month's rent is paid simultaneously with the deposit. Bank return charges are borne by the tenant. The tenant is required to file a self-assessed Property Transfer Tax (ITP) return within thirty (30) business days of signing, in accordance with Royal Legislative Decree 1/1993, and to provide proof of payment before the first rent transfer.`
    );

    // Clause 5 — Utilities
    ContractPdfService.clause(
      doc,
      'QUINTA',
      'Suministros',
      'Utilities',
      `${utilsEs} asume el coste de los suministros del inmueble. El arrendatario deberá cambiar la titularidad de los contratos de suministro a su nombre en el plazo de quince (15) días desde la firma. Al término del contrato, el arrendatario no cancelará los suministros; la titularidad revertirá al arrendador desde la fecha de entrega de llaves.`,
      `${utilsEn} shall bear the cost of utilities. The tenant shall transfer the utility contracts into their name within fifteen (15) days of signing. At the end of the contract, the tenant shall not cancel any utilities; the contracts shall revert to the landlord from the date of key handover.`
    );

    // Clause 6 — Works
    ContractPdfService.clause(
      doc,
      'SEXTA',
      'Obras y Reparaciones',
      'Works and Repairs',
      `Las reparaciones necesarias para conservar el inmueble en condiciones de uso son de cargo del arrendador, salvo los desperfectos causados por negligencia o mal uso del arrendatario. El arrendatario notificará con diligencia cualquier avería. Queda prohibida cualquier obra de reforma sin consentimiento escrito del arrendador. Las obras no autorizadas podrán dar lugar a la resolución del contrato y a la obligación de restitución del inmueble a su estado original.`,
      `Repairs necessary to maintain the property in usable condition are the landlord's responsibility, except for damage caused by the tenant's negligence or misuse. The tenant shall promptly notify the landlord of any breakdown. Any renovation work is prohibited without the landlord's written consent. Unauthorised works may result in termination of the contract and an obligation to restore the property to its original condition.`
    );

    // Clause 7 — Liability (seasonal: landlord bears property insurance)
    ContractPdfService.clause(
      doc,
      'SÉPTIMA',
      'Responsabilidad y Seguro',
      'Liability and Insurance',
      `El arrendatario responde de los daños al inmueble ocasionados por su actividad o negligencia. El arrendador asume la responsabilidad por fallos estructurales, catástrofes naturales, incendio y daños por agua no imputables al arrendatario, debiendo mantener en vigor el seguro correspondiente. El arrendatario no está obligado a suscribir seguro de daños sobre el inmueble, sin perjuicio de su responsabilidad por los daños que le sean imputables.`,
      `The tenant is liable for damage to the property caused by their own activities or negligence. The landlord assumes responsibility for structural failures, natural disasters, fire and water damage not attributable to the tenant, and shall maintain the corresponding insurance policy. The tenant is not required to take out property damage insurance, without prejudice to their liability for damage attributable to them.`
    );

    // Clause 8 — Obligations
    ContractPdfService.clause(
      doc,
      'OCTAVA',
      'Obligaciones del Arrendatario',
      `Tenant's Obligations`,
      `El arrendatario se obliga a: (i) pagar la renta puntualmente; (ii) no ceder ni subarrendar el inmueble sin consentimiento escrito del arrendador; (iii) no almacenar materiales peligrosos; (iv) cumplir la normativa de la comunidad de propietarios; (v) no tener mascotas sin autorización escrita previa del arrendador. El incumplimiento faculta al arrendador a resolver el contrato.`,
      `The tenant undertakes to: (i) pay rent punctually; (ii) not assign or sublet the property without the landlord's written consent; (iii) not store hazardous materials; (iv) comply with the homeowners' community rules; (v) not keep pets without the landlord's prior written authorisation. Breach entitles the landlord to terminate the contract.`
    );

    // Clause 9 — Deposit
    ContractPdfService.clause(
      doc,
      'NOVENA',
      'Garantías',
      'Guarantees',
      `El arrendatario entrega en concepto de fianza la cantidad de ${deposit} (equivalente a ${c.depositMonths} mes/es de renta).${c.additionalGuaranteeMonths > 0 ? ` Adicionalmente, se constituye una garantía complementaria de ${addlGuaranteeAmt}.` : ''} Ninguna de estas cantidades podrá imputarse al pago de rentas. Ambas serán devueltas en el plazo de treinta (30) días desde la entrega de llaves, una vez comprobado el estado del inmueble y deducidos, en su caso, los importes correspondientes a suministros o daños.`,
      `The tenant pays a security deposit of ${depositEn} (equivalent to ${c.depositMonths} month(s) of rent).${c.additionalGuaranteeMonths > 0 ? ` Additionally, a supplementary guarantee of ${addlGuaranteeAmtEn} is provided.` : ''} Neither amount may be offset against rent. Both shall be returned within thirty (30) days of key handover, after inspection of the property and deduction, where applicable, of any outstanding utilities or damage costs.`
    );

    // Clause 10 — Misc
    ContractPdfService.clause(
      doc,
      'DÉCIMA',
      'Disposiciones Generales',
      'General Provisions',
      `Este contrato se rige por el Título III de la Ley 29/1994 de Arrendamientos Urbanos y, supletoriamente, por el Código Civil. El arrendatario renuncia expresamente a los derechos de adquisición preferente. Las notificaciones se realizarán a los domicilios indicados en el encabezamiento o por correo electrónico a las direcciones facilitadas.`,
      `This contract is governed by Title III of the Spanish Urban Leasing Act (LAU 29/1994) and, supplementarily, by the Civil Code. The tenant expressly waives the right of first refusal and repurchase. Notices shall be served at the addresses in the header or by email to the addresses provided.`
    );

    // Clause 11 — Language
    ContractPdfService.clause(
      doc,
      'UNDÉCIMA',
      'Idioma',
      'Language',
      `Este contrato se redacta en español e inglés. En caso de discrepancia entre ambas versiones, prevalecerá la versión en español.`,
      `This contract is drafted in Spanish and English. In the event of any discrepancy between the two versions, the Spanish version shall prevail.`
    );

    ContractPdfService.addSignatureBlock(doc, c);
  }
}
