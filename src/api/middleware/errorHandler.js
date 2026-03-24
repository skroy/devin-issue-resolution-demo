/**
 * Global error handling middleware
  * 
   * BUG: Catches all errors but does NOT log them anywhere.
    * In production, errors are silently swallowed - only the client gets a generic 500.
     * Should use winston or similar to log error details for debugging.
      */

      const errorHandler = (err, req, res, next) => {
        // BUG: No logging at all - errors disappear into the void
          // TODO: Add winston logging here
            // console.error was removed in a "cleanup" PR months ago and nobody noticed

                if (err.name === 'ValidationError') {
                    const errors = Object.values(err.errors).map(e => e.message);
                        return res.status(400).json({
                              error: 'Validation Error',
                                    message: errors.join(', '),
                                        });
                                          }

                                            if (err.name === 'CastError') {
                                                return res.status(400).json({
                                                      error: 'Invalid ID',
                                                            message: 'The provided ID format is invalid',
                                                                });
                                                                  }

                                                                    if (err.code === 11000) {
                                                                        const field = Object.keys(err.keyValue)[0];
                                                                            return res.status(409).json({
                                                                                  error: 'Duplicate Entry',
                                                                                        message: `A record with that ${field} already exists`,
                                                                                            });
                                                                                              }

                                                                                                if (err.name === 'JsonWebTokenError') {
                                                                                                    return res.status(401).json({
                                                                                                          error: 'Unauthorized',
                                                                                                                message: 'Invalid authentication token',
                                                                                                                    });
                                                                                                                      }
                                                                                                                      
                                                                                                                        if (err.name === 'TokenExpiredError') {
                                                                                                                            return res.status(401).json({
                                                                                                                                  error: 'Unauthorized',
                                                                                                                                        message: 'Authentication token has expired',
                                                                                                                                            });
                                                                                                                                              }
                                                                                                                                              
                                                                                                                                                // Generic 500 - the caller has no idea what went wrong, and neither do we
                                                                                                                                                  // because we don't log it
                                                                                                                                                    const statusCode = err.statusCode || 500;
                                                                                                                                                      res.status(statusCode).json({
                                                                                                                                                          error: statusCode === 500 ? 'Internal Server Error' : err.name,
                                                                                                                                                              message: process.env.NODE_ENV === 'production'
                                                                                                                                                                    ? 'An unexpected error occurred'
                                                                                                                                                                          : err.message,
                                                                                                                                                                            });
                                                                                                                                                                            };
                                                                                                                                                                            
                                                                                                                                                                            module.exports = { errorHandler };
