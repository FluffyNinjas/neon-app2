Neon is a React Native application that enables advertisers to rent local digital screens through a time-based model.
Screen owners can monetize their displays, while advertisers can seamlessly browse, book, and manage ad campaigns—all from one app.

✨ Features

Screen Listings – Owners list screens with details (location, price, availability, media type).

Browse & Search – Advertisers explore available screens and filter by category.

Ad Uploads – Support for image and video advertisements with metadata (duration, size, tags).

Booking System – Daily or time-slot rentals with conflict prevention.

Wishlist – Save and manage favorite screens.

Messaging – Real-time chat with read receipts, emoji support, and image sharing.

Payments – Secure transactions via Stripe Connect with delayed payouts.

Calendar View – Intuitive date picker showing available and booked days.

🛠 Tech Stack

Frontend: React Native (Expo)

Backend: Firebase (Authentication, Firestore, Storage)

Payments: Stripe Connect

Navigation: Expo Router

UI: Tailwind + custom components

🚀 Getting Started
Prerequisites

Node.js (v18+)

Expo CLI

Firebase project (Auth, Firestore, Storage enabled)

Stripe Connect account

Installation
# Clone repository
git clone https://github.com/yourusername/neon.git
cd neon

# Install dependencies
npm install

# Start app
npx expo start


Add your Firebase config in firebaseConfig.js.

Set up Stripe API keys as environment variables.

📂 Project Structure
/neon
  ├── app/                # Screens & navigation
  │   ├── (tabs)/         # Tab navigation (Home, Browse, Upload, Wishlist, Profile)
  │   ├── components/     # Reusable UI elements
  │   ├── screens/        # Modals, booking flow, details
  │   └── utils/          # Firebase & helper functions
  ├── assets/             # Images, icons, fonts
  ├── firebaseConfig.js   # Firebase setup
  └── App.js              # Entry point

📈 Roadmap

Push notifications for booking updates

Screen analytics for owners (views, impressions)

Recurring/long-term booking support

AI-based ad placement recommendations
