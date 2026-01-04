import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config.js';

interface DocumentVerificationResult {
  [key: string]: any;
}

export class AIService {
  private static client = new Anthropic({
    apiKey: config.anthropic.apiKey,
  });

  /**
   * Verify document using Claude Vision API
   * Extracts structured data based on document type
   */
  static async verifyDocument(
    fileUrl: string,
    documentType: string
  ): Promise<DocumentVerificationResult> {
    try {
      const prompt = this.getPromptForDocumentType(documentType);

      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'url',
                  url: fileUrl,
                },
              },
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
      });

      // Extract JSON from response
      const textContent = response.content.find((c) => c.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text content in AI response');
      }

      // Parse JSON response
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const verificationData = JSON.parse(jsonMatch[0]);
      return verificationData;
    } catch (error) {
      throw new Error(
        `AI verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get prompt for specific document type
   */
  private static getPromptForDocumentType(documentType: string): string {
    switch (documentType) {
      case 'ID':
      case 'NIE_TIE':
        return `Analyze this Spanish identity document (DNI, NIE, or TIE).
Extract the following information and return it as JSON:

{
  "fullName": "Full name of the person",
  "documentNumber": "Document number",
  "dateOfBirth": "Date of birth (YYYY-MM-DD format)",
  "nationality": "Nationality",
  "expirationDate": "Document expiration date (YYYY-MM-DD format)",
  "documentType": "DNI, NIE, or TIE"
}

Only return the JSON object, nothing else.`;

      case 'PAYSLIP':
        return `Analyze this payslip document.
Extract the following information and return it as JSON:

{
  "employerName": "Employer company name",
  "employeeName": "Employee full name",
  "monthlyGrossIncome": "Monthly gross salary as number",
  "monthlyNetIncome": "Monthly net salary as number",
  "paymentDate": "Payment date (YYYY-MM-DD format)",
  "employmentStatus": "Employment type (FULL_TIME, PART_TIME, CONTRACTOR, etc)",
  "currency": "Currency code (EUR, USD, etc)"
}

Only return the JSON object, nothing else.`;

      case 'BANK_STATEMENT':
        return `Analyze this bank statement.
Extract the following information and return it as JSON:

{
  "accountHolder": "Account holder name",
  "accountNumber": "Last 4 digits of account number",
  "accountBalance": "Current balance as number",
  "monthlyIncome": "Estimated monthly income from deposits as number",
  "statementPeriod": "Statement period (e.g., 'January 2024')",
  "currency": "Currency code (EUR, USD, etc)",
  "largeTransactions": "Array of significant transactions (>500)"
}

Only return the JSON object, nothing else.`;

      case 'EMPLOYMENT_CONTRACT':
        return `Analyze this employment contract.
Extract the following information and return it as JSON:

{
  "employerName": "Employer company name",
  "employeeName": "Employee full name",
  "position": "Job title/position",
  "salary": "Annual or monthly salary as number",
  "salaryPeriod": "ANNUAL or MONTHLY",
  "startDate": "Contract start date (YYYY-MM-DD format)",
  "contractType": "Contract type (PERMANENT, TEMPORARY, etc)",
  "currency": "Currency code"
}

Only return the JSON object, nothing else.`;

      case 'TAX_RETURN':
        return `Analyze this tax return document.
Extract the following information and return it as JSON:

{
  "taxpayerName": "Taxpayer full name",
  "taxYear": "Tax year (YYYY)",
  "totalIncome": "Total reported income as number",
  "taxableIncome": "Taxable income as number",
  "filingStatus": "Filing status",
  "currency": "Currency code"
}

Only return the JSON object, nothing else.`;

      default:
        return `Analyze this document.
Extract all relevant information and return it as structured JSON.
Include fields that are visible and important in the document.
Only return the JSON object, nothing else.`;
    }
  }
}
