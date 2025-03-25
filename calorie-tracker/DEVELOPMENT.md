# Apollo Calorie Tracker Development Workflow

This document outlines the workflow for continuing local development and deploying changes to production.

## Local Development Workflow

### 1. Starting Local Development

To start the development server:

```bash
npm run dev
```

This will start Vite's development server with hot module reloading (HMR) at http://localhost:5173 (or another port if 5173 is in use).

### 2. Testing Changes Locally

Before deploying to production, test your changes locally:

```bash
# Build the app for production
npm run build

# Preview the production build locally
npm run preview
```

This will spin up a local server with your production build, typically at http://localhost:4173.

## Deployment Workflow

### 1. Deploy Only Hosting Changes

If you've only made changes to the frontend code (React components, styling, etc.):

```bash
npm run deploy
```

This command:
1. Builds your app for production
2. Deploys only the hosting files to Firebase

### 2. Deploy Firestore Rules

If you've only modified your Firestore security rules:

```bash
npm run deploy:rules
```

### 3. Deploy Everything

If you've made changes to both frontend code and Firebase configuration:

```bash
npm run deploy:full
```

This deploys all Firebase services (hosting, Firestore rules, indexes, etc.).

## Environment Management

### Development vs. Production

When working with different environments:

1. **Development**: Use `.env.development` for local development variables
2. **Production**: Use `.env.production` for production variables

To load a specific environment file:

```bash
# Start development with development environment variables
npm run dev

# Build with production environment variables
npm run build
```

## Best Practices for Deployment

1. **Commit Changes**: Always commit your changes to version control before deploying
2. **Run Linting**: Run `npm run lint` to check for code issues
3. **Test Locally**: Always test your production build locally before deploying
4. **Check Bundle Size**: Monitor your JavaScript bundle size for performance issues
5. **Incremental Deployments**: Make small, focused changes rather than large deployments

## Rollback Process

If a deployment causes issues:

1. Identify the last known good deployment in the Firebase console
2. Click the "Rollback" button next to that version

Alternatively, you can roll back using the CLI:

```bash
firebase hosting:clone PROJECT_ID:SITE_ID:VERSION_ID PROJECT_ID:SITE_ID:live
```

## Monitoring Deployed Application

After deployment, monitor your application:

1. Check the Firebase console for any errors
2. Monitor performance using Firebase Performance Monitoring
3. Check user analytics to ensure features are being used as expected

## Troubleshooting Common Issues

### Firebase Deployment Failed

If deployment fails:

1. Check your Firebase JSON configuration
2. Ensure you're logged in with the correct Firebase account
3. Verify you have the necessary permissions

### Environment Variables Not Working

If environment variables aren't being applied:

1. Verify that variables are prefixed with `VITE_` for client-side code
2. Check that you're using `import.meta.env.VARIABLE_NAME` to access them
3. Restart your development server after changing environment variables 