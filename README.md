# FinServ Platform

Internal platform for FinServ Co - handles accounts, transactions, compliance reporting, and user management.

## Tech Stack

- **Runtime**: Node.js 18+
- - **Framework**: Express.js
  - - **Database**: MongoDB (Mongoose ODM)
    - - **Auth**: JWT-based authentication
      - - **Testing**: Jest + Supertest
       
        - ## Project Structure
       
        - ```
          src/
            api/
              middleware/    # Auth, rate limiting, error handling
              routes/       # API route handlers
            models/         # Mongoose models
            services/       # Business logic layer
            utils/          # Validators, formatters, constants
          tests/            # Unit and integration tests
          ```

          ## Getting Started

          ```bash
          # Install dependencies
          npm install

          # Copy environment config
          cp .env.example .env

          # Start development server
          npm run dev

          # Run tests
          npm test
          ```

          ## API Endpoints

          - `POST /api/v1/users/register` - Create account
          - - `POST /api/v1/users/login` - Authenticate
            - - `GET /api/v1/accounts` - List user accounts
              - - `GET /api/v1/accounts/:id` - Get account details
                - - `POST /api/v1/transactions` - Create transaction
                  - - `GET /api/v1/transactions/:accountId` - List transactions
                    - - `GET /api/v1/compliance/report/daily` - Daily compliance report
                     
                      - ## Known Issues
                     
                      - See the [Issues tab](../../issues) for the current backlog. We have a significant number of open issues across bugs, tech debt, and feature requests that need triage and resolution.
