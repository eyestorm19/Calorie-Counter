# Apollo Calorie Tracker

A modern, responsive web application for tracking daily calorie consumption and exercise. Built with React, TypeScript, and Firebase.

## Features

- 📊 Track daily calorie intake and burned calories
- 📱 Responsive design for desktop and mobile
- 🔐 User authentication with email/password and Google sign-in
- 📈 Weekly summary with charts and statistics
- ⚙️ Customizable user profiles with timezone settings
- 🎯 Set and track daily calorie targets
- 🤖 AI-powered activity logging with natural language processing
- 💰 Pay-as-you-go cloud deployment options

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

## AI Setup

Apollo uses [Ollama](https://ollama.com/) for natural language processing of food and activity inputs. There are three setup options:

### Development Setup

In development mode, Apollo connects to a locally running Ollama instance:

1. Install Ollama from [ollama.com/download](https://ollama.com/download)
2. Start Ollama: `ollama serve`
3. Install required models with our helper script:
   ```bash
   chmod +x scripts/ollama-setup.sh
   ./scripts/ollama-setup.sh
   ```
   Alternatively, you can manually install models:
   ```bash
   ollama pull mistral   # Default model
   ollama pull llama2    # Optional: Meta's LLama2 model 
   ollama pull distilbert # Optional: Smaller, faster model
   ```
4. Run Apollo in development mode: `npm run dev`

The app will automatically connect to the local Ollama instance at `http://localhost:11434`. You can switch between different models using the model selector at the top of the chat interface.

### Google Cloud Run Setup (Recommended for Production)

For a scalable, pay-as-you-go deployment with zero idle costs, we provide an automated setup for Google Cloud Run:

1. Run the provided setup script:
   ```bash
   chmod +x scripts/setup-ollama-cloud-run.sh
   ./scripts/setup-ollama-cloud-run.sh
   ```

2. Follow the interactive prompts to deploy Ollama to Cloud Run

3. Deploy your updated app to Firebase:
   ```bash
   ./deploy.sh
   ```

For detailed setup instructions and cost estimates, see [CLOUD_RUN_OLLAMA.md](CLOUD_RUN_OLLAMA.md).

### Traditional Server Setup

Alternatively, you can install Ollama on your own web server:

1. Install Ollama on your web server
2. Start Ollama as a service: `ollama serve`
3. Pull the Mistral model: `ollama pull mistral`
4. Update the Firebase Function in `functions/index.js` to point to your Ollama server
5. Deploy the Firebase Function: `firebase deploy --only functions`

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
- [Ollama](https://ollama.com/) - Local AI processing

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```
