import { tool } from '@langchain/core/tools';
import { z } from 'zod';

/**
 * Calculate monthly mortgage payment using standard amortization formula
 */
export const calculatePayment = tool(
  async ({ principal, annualRate, termYears }) => {
    try {
      // Convert annual rate to monthly decimal
      const monthlyRate = annualRate / 100 / 12;
      const numberOfPayments = termYears * 12;

      // Standard amortization formula: M = P * [r(1+r)^n] / [(1+r)^n - 1]
      let monthlyPayment;
      if (monthlyRate === 0) {
        monthlyPayment = principal / numberOfPayments;
      } else {
        monthlyPayment =
          principal *
          (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) /
          (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
      }

      const totalPayment = monthlyPayment * numberOfPayments;
      const totalInterest = totalPayment - principal;

      // Generate simple amortization summary (first year, mid-point, last year)
      const amortizationSummary = [];
      let balance = principal;

      for (let year = 1; year <= termYears; year++) {
        let yearlyInterest = 0;
        let yearlyPrincipal = 0;

        for (let month = 1; month <= 12; month++) {
          const interestPayment = balance * monthlyRate;
          const principalPayment = monthlyPayment - interestPayment;
          yearlyInterest += interestPayment;
          yearlyPrincipal += principalPayment;
          balance -= principalPayment;
        }

        // Only include key years for summary
        if (year === 1 || year === Math.floor(termYears / 2) || year === termYears) {
          amortizationSummary.push({
            year,
            principalPaid: Math.round(yearlyPrincipal),
            interestPaid: Math.round(yearlyInterest),
            remainingBalance: Math.max(0, Math.round(balance)),
          });
        }
      }

      const result = {
        loanDetails: {
          principal,
          annualRate: `${annualRate}%`,
          termYears,
          termMonths: numberOfPayments,
        },
        payment: {
          monthly: Math.round(monthlyPayment * 100) / 100,
          totalOverLife: Math.round(totalPayment * 100) / 100,
          totalInterest: Math.round(totalInterest * 100) / 100,
        },
        amortizationSummary,
        notes: [
          'This calculation assumes fixed rate for the entire term',
          'Does not include property taxes, insurance, or PMI',
          'Actual payments may vary based on lender terms',
        ],
      };

      return JSON.stringify(result, null, 2);
    } catch (error) {
      return JSON.stringify({ error: `Calculation error: ${error.message}` });
    }
  },
  {
    name: 'calculatePayment',
    description: 'Calculate monthly mortgage payment and amortization details. Useful for understanding the cost of different loan options.',
    schema: z.object({
      principal: z.number().positive().describe('Loan amount (principal) in dollars'),
      annualRate: z.number().positive().max(30).describe('Annual interest rate as a percentage (e.g., 6.5 for 6.5%)'),
      termYears: z.number().positive().max(40).describe('Loan term in years (e.g., 30 for 30-year mortgage)'),
    }),
  }
);
