require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { errorHandler } = require('./api/middleware/errorHandler');
const { rateLimiter } = require('./api/middleware/rateLimit');
const { authenticate } = require('./api/middleware/auth');

const accountRoutes = require('./api/routes/accounts');
const transactionRoutes = require('./api/routes/transactions');
const userRoutes = require('./api/routes/users');
const complianceRoutes = require('./api/routes/compliance');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(rateLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '2.4.1', timestamp: new Date().toISOString() });
  });

  // Routes
  app.use('/api/v1/accounts', authenticate, accountRoutes);
  app.use('/api/v1/transactions', authenticate, transactionRoutes);
  app.use('/api/v1/users', authenticate, userRoutes);
  app.use('/api/v1/compliance', authenticate, complianceRoutes);

  // Error handling
  app.use(errorHandler);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: 'Not Found', message: `Route ${req.method} ${req.path} not found` });
    });

    app.listen(PORT, () => {
      console.log(`FinServ Platform API running on port ${PORT}`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        });

        module.exports = app;
