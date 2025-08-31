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
│   │   ├── add-screen/# Screen creation flow
│   │   └── book-screen/# Booking flow
│   └── package.json
├── functions/         # Firebase Cloud Functions
│   ├── src/           # Functions source code
│   └── package.json
└── shared/            # Shared TypeScript models
    └── models/
        └── firestore.ts # Complete Firestore data models
```

## Development Commands

### Frontend (Expo React Native)
```bash
cd frontend
npm start           # Start Expo development server
npm run android     # Run on Android
npm run ios         # Run on iOS  
npm run web         # Run on web
npm run lint        # Run ESLint
```

### Backend (Firebase Functions)
```bash
cd functions
npm run lint        # Run ESLint on functions
npm run build       # Compile TypeScript to lib/
npm run serve       # Start local emulator
npm run deploy      # Deploy to Firebase
```

### Firebase Project Management
```bash
firebase emulators:start  # Start all emulators
firebase deploy          # Deploy all services
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

## Testing & Building

Always run linting before deploying:
- Functions: `npm run lint && npm run build`
- Frontend: `npm run lint`

The Firebase configuration automatically runs lint and build before deployment via the predeploy hooks in `firebase.json`.