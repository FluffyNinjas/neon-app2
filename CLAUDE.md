# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

This is a full-stack TypeScript application for a screen rental platform called "NEON" with the following architecture:

- **Frontend**: Expo (React Native) app with TypeScript, using expo-router for navigation
- **Backend**: Firebase Functions with TypeScript for serverless cloud functions
- **Database**: Firebase Firestore for data persistence
- **Shared**: Common TypeScript models and types used by both frontend and backend

### Directory Structure

```
├── frontend/          # Expo React Native app
│   ├── app/           # Expo Router file-based navigation
│   │   ├── (auth)/    # Authentication routes
│   │   ├── (owners)/  # Screen owner routes  
│   │   ├── (users)/   # User/renter routes
│   │   ├── add-screen/# Screen creation flow (multi-step wizard)
│   │   ├── booking-screen/# Booking flow  
│   │   └── book-screen/# Legacy booking flow
│   └── package.json
├── functions/         # Firebase Cloud Functions
│   ├── src/           # Functions source code
│   └── package.json
├── shared/            # Shared TypeScript models
│   └── models/
│       └── firestore.ts # Complete Firestore data models
├── firebase.json      # Firebase project configuration
└── CLAUDE.md         # This file
```

## Development Commands

### Frontend (Expo React Native)
```bash
cd frontend
npm install         # Install dependencies
npm start           # Start Expo development server (alias: npx expo start)
npm run android     # Run on Android
npm run ios         # Run on iOS  
npm run web         # Run on web
npm run lint        # Run ESLint
npm run reset-project # Reset to blank project (moves starter code to app-example/)
```

### Backend (Firebase Functions)
```bash
cd functions  
npm install         # Install dependencies
npm run lint        # Run ESLint on functions
npm run build       # Compile TypeScript to lib/
npm run build:watch # Compile TypeScript with watch mode
npm run serve       # Build and start local emulator
npm run shell       # Build and start functions shell
npm run start       # Alias for shell
npm run deploy      # Deploy to Firebase
npm run logs        # View function logs
```

### Firebase Project Management
```bash
firebase emulators:start  # Start all emulators (functions on port 5002)
firebase deploy          # Deploy all services
firebase functions:log    # View function logs
```

## Core Data Models

The application uses a comprehensive Firestore data model defined in `shared/models/firestore.ts`. Key entities include:

- **Users**: Screen owners and content creators with Stripe integration
- **Screens**: Physical advertising screens with location, pricing, and availability 
- **Bookings**: Rental transactions with date ranges and payment tracking
- **Content**: Images/videos to display on screens
- **Reviews**: User ratings for screens
- **Analytics**: Daily revenue tracking per owner

The models include:
- Branded type IDs for type safety (UserId, ScreenId, etc.)
- Firestore converters for proper serialization
- Builder functions for new documents with server timestamps
- Path helpers for consistent Firestore document references

## Key Technical Details

### TypeScript Configuration
- Functions use Node.js target with strict mode
- Frontend extends Expo's TypeScript base configuration
- Both projects use absolute imports with path mapping

### Firebase Integration
- Project ID: `finalneon-30e6e`
- Functions emulator runs on port 5002
- Uses Firebase v9 SDK with modular imports

### Code Conventions
- Strict TypeScript with branded types for IDs
- Firestore documents use server timestamps
- ESLint for code quality (Google style for functions, Expo style for frontend)
- React Native with Expo Router for file-based navigation

## Development Workflow

### Local Development Setup
1. Install Node.js 20 (required for Firebase Functions)
2. Install Firebase CLI: `npm install -g firebase-tools`
3. Install dependencies in both frontend and functions directories
4. Start development servers:
   - Frontend: `cd frontend && npm start`
   - Functions: `cd functions && npm run serve` (or `firebase emulators:start`)

### Current Git Status
- Main branch: `main`
- Recent work includes multi-step screen creation flow in `frontend/app/add-screen/`
- New booking flow in development at `frontend/app/booking-screen/`

### Testing & Building

Always run linting before deploying:
- Functions: `npm run lint && npm run build`
- Frontend: `npm run lint`

The Firebase configuration automatically runs lint and build before deployment via the predeploy hooks in `firebase.json`.