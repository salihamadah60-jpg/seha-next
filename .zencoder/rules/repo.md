---
description: Repository Information Overview
alwaysApply: true
---

# Seha-Next Information

## Summary
A Next.js application for managing medical leave services in Arabic. The application provides a login system for users to access their medical leave information, with different dashboards for regular users and administrators. It includes features for viewing, managing, and generating PDF reports of medical leaves.

## Structure
- **src/**: Contains the main application code
  - **app/**: Next.js app directory with pages and API routes
  - **components/**: Reusable React components
  - **lib/**: Utility functions and routes
- **public/**: Static assets including images, fonts, and configuration
- **lib/**: Server-side utilities for authentication, database, and PDF generation
- **generated_pdfs/**: Output directory for generated PDF documents

## Language & Runtime
**Language**: TypeScript/JavaScript
**Version**: ES2017 target
**Framework**: Next.js 15.5.4
**Package Manager**: npm
**Node Version**: Compatible with latest Node.js LTS

## Dependencies
**Main Dependencies**:
- next: 15.5.4 - React framework
- react: 19.1.0 - UI library
- mongoose: 8.18.2 - MongoDB ODM
- axios: 1.12.2 - HTTP client
- jsonwebtoken: 9.0.2 - Authentication
- puppeteer: 24.22.2 - PDF generation
- handlebars: 4.7.8 - Template engine
- twilio: 5.9.0 - SMS notifications
- moment-hijri: 3.0.0 - Hijri calendar support

**Development Dependencies**:
- typescript: 5.x
- eslint: 9.x
- tailwindcss: 4.x

## Build & Installation
```bash
# Install dependencies
npm install

# Development server
npm run dev

# Production build
npm run build

# Start production server
npm start
```

## Database
**Type**: MongoDB
**Connection**: Uses mongoose for MongoDB connection
**Models**: User and Leave models for data management
**Environment**: Requires MONGODB_URI in .env.local

## API Routes
**Authentication**:
- /api/auth/login - User login
- /api/auth/add-admin - Admin creation
- /api/auth/refresh-token - JWT refresh

**Data Management**:
- /api/leaves - Medical leave management
- /api/hospitals - Hospital information
- /api/users - User management
- /api/send-sms - SMS notification service

## Frontend
**Styling**: Uses Tailwind CSS
**Routing**: Next.js App Router
**State Management**: React hooks (useState)
**Localization**: Arabic UI with RTL support
**Assets**: Custom fonts and hospital images in public directory

## External Services
**SMS**: Twilio integration for notifications
**PDF Generation**: Uses Puppeteer and Handlebars for PDF reports
**Authentication**: JWT-based authentication system

## Environment Variables
Required environment variables in .env.local:
- MONGODB_URI - MongoDB connection string
- JWT_SECRET - Secret for JWT signing
- TWILIO_ACCOUNT_SID - Twilio account identifier
- TWILIO_AUTH_TOKEN - Twilio authentication token
- TWILIO_PHONE_NUMBER - Sender phone number