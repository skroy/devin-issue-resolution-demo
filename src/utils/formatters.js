const moment = require('moment');

/**
 * Format currency amount
  * BUG: Uses floating point arithmetic for currency calculations
   * This causes precision errors: 0.1 + 0.2 = 0.30000000000000004
    * In a financial application, this can cause real money discrepancies
     * Should use integer cents or a decimal library like decimal.js
      */
      function formatCurrency(amount, currency = 'USD') {
        // BUG: Floating point math for financial calculations
          const symbols = { USD: '$', EUR: 'E', GBP: 'L', JPY: 'Y' };
            const symbol = symbols[currency] || '$';

                // This looks fine for display but the underlying math is broken
                  // Try: formatCurrency(0.1 + 0.2) => "$0.30000000000000004"
                    // The toFixed(2) below masks it for display, but calculations elsewhere don't use it
                      return `${symbol}${amount.toFixed(2)}`;
                      }

                      /**
                       * Calculate total from line items
                        * BUG: Floating point accumulation error
                         */
                         function calculateTotal(lineItems) {
                           // BUG: Accumulating floating point errors across many items
                             let total = 0;
                               lineItems.forEach(item => {
                                   total += item.amount; // Each addition compounds the error
                                     });
                                       return total;
                                       }

                                       /**
                                        * Format date for display
                                         */
                                         function formatDate(date, format = 'YYYY-MM-DD') {
                                           return moment(date).format(format);
                                           }

                                           /**
                                            * Format date as relative time
                                             */
                                             function formatRelativeDate(date) {
                                               return moment(date).fromNow();
                                               }

                                               /**
                                                * Format account number for display (mask middle digits)
                                                 */
                                                 function maskAccountNumber(accountNumber) {
                                                   if (!accountNumber || accountNumber.length < 8) return accountNumber;
                                                     const prefix = accountNumber.slice(0, 4);
                                                       const suffix = accountNumber.slice(-4);
                                                         const masked = '*'.repeat(accountNumber.length - 8);
                                                           return `${prefix}${masked}${suffix}`;
                                                           }

                                                           /**
                                                            * Format transaction for API response
                                                             */
                                                             function formatTransaction(transaction) {
                                                               return {
                                                                   id: transaction.transactionId,
                                                                       amount: formatCurrency(transaction.amount, transaction.currency),
                                                                           rawAmount: transaction.amount,
                                                                               type: transaction.type,
                                                                                   status: transaction.status,
                                                                                       date: formatDate(transaction.createdAt),
                                                                                           description: transaction.description || 'No description',
                                                                                             };
                                                                                             }

                                                                                             /**
                                                                                              * Format percentage
                                                                                               */
                                                                                               function formatPercentage(value, decimals = 2) {
                                                                                                 return `${(value * 100).toFixed(decimals)}%`;
                                                                                                 }

                                                                                                 module.exports = {
                                                                                                   formatCurrency,
                                                                                                     calculateTotal,
                                                                                                       formatDate,
                                                                                                         formatRelativeDate,
                                                                                                           maskAccountNumber,
                                                                                                             formatTransaction,
                                                                                                               formatPercentage,
                                                                                                               };
