# Apollo Calorie Tracker

A modern, responsive web application for tracking daily calorie consumption and exercise. Built with React, TypeScript, and Firebase.

## Features

- 📊 Track daily calorie intake and burned calories
- 📱 Responsive design for desktop and mobile
- 🔐 User authentication with email/password and Google sign-in
- 📈 Weekly summary with charts and statistics
- ⚙️ Customizable user profiles with timezone settings
- 🎯 Set and track daily calorie targets

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Firebase account

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/apollo-calorie-tracker.git
   cd apollo-calorie-tracker
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn
   ```

3. Create a `.env` file in the root directory based on the `.env.example` file:
   ```bash
   cp .env.example .env
   ```

4. Update the Firebase configuration in the `.env` file with your own Firebase project details.

5. Run the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

## Deployment

### Building for Production

To create a production build:

```bash
npm run build
# or
yarn build
```

This will generate a `dist` folder with optimized production files.

### Deploying to Firebase Hosting

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase (if not already done):
   ```bash
   firebase init
   ```
   - Select "Hosting"
   - Select your Firebase project
   - Specify "dist" as the public directory
   - Configure as a single-page app
   - Set up automatic deploys (optional)

4. Deploy to Firebase:
   ```bash
   firebase deploy
   ```

### Deploying to Netlify or Vercel

Both Netlify and Vercel offer simple deployment options:

1. Connect your GitHub repository
2. Configure the build settings:
   - Build command: `npm run build` or `yarn build`
   - Publish directory: `dist`
3. Set up environment variables in the provider's dashboard

## Firebase Security Rules

For production, ensure you have proper security rules for your Firestore database:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, update, delete: if request.auth != null && request.auth.uid == userId;
      allow create: if request.auth != null;
      
      match /dailyLogs/{logId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [React](https://reactjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Firebase](https://firebase.google.com/)
- [Vite](https://vitejs.dev/)
- [Chart.js](https://www.chartjs.org/)
