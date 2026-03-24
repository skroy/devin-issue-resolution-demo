/**
 * Validation utilities for the FinServ platform
  */

// BUG: This regex doesn't handle + addresses (e.g., user+tag@domain.com)
// Many users use + addressing for email filtering, especially in enterprise
// Also doesn't handle newer TLDs longer than 4 chars
const EMAIL_REGEX = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;

/**
 * Validate email address
  * BUG: Rejects valid emails with + character
   */
function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return EMAIL_REGEX.test(email.trim());
}

  /**
   * Validate account number format
    */
  function validateAccountNumber(accountNumber) {
    if (!accountNumber || typeof accountNumber !== 'string') return false;
    return /^FIN-\d{9}$/.test(accountNumber);
  }

    /**
     * Validate transaction amount
      */
    function validateAmount(amount) {
      if (typeof amount !== 'number') return false;
      if (isNaN(amount) || !isFinite(amount)) return false;
      if (amount <= 0) return false;
        // BUG: Doesn't check for more than 2 decimal places
        // Amount like 10.999 would pass validation but cause rounding issues
        return true;
    }

      /**
       * Validate password strength
        */
      function validatePassword(password) {
        if (!password || typeof password !== 'string') return false;
        if (password.length < 8) return false;
          // BUG: Only checks length, no complexity requirements
          // A financial platform should require uppercase, lowercase, number, special char
          return true;
      }

        /**
         * Validate date range
          */
        function validateDateRange(startDate, endDate) {
          const start = new Date(startDate);
          const end = new Date(endDate);
          if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;
          return start < end;
        }

          /**
           * Sanitize string input
            */
          function sanitizeString(input) {
            if (typeof input !== 'string') return '';
            return input.trim().replace(/[<>]/g, '');
          }

            module.exports = {
                validateEmail,
                validateAccountNumber,
                validateAmount,
                validatePassword,
                validateDateRange,
                sanitizeString,
            };
