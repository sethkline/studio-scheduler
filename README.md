# Dance Studio Scheduler

[![CI](https://github.com/sethkline/studio-scheduler/workflows/CI/badge.svg)](https://github.com/sethkline/studio-scheduler/actions/workflows/ci.yml)
[![PR Checks](https://github.com/sethkline/studio-scheduler/workflows/Pull%20Request%20Checks/badge.svg)](https://github.com/sethkline/studio-scheduler/actions/workflows/pr.yml)
[![codecov](https://codecov.io/gh/sethkline/studio-scheduler/branch/main/graph/badge.svg)](https://codecov.io/gh/sethkline/studio-scheduler)

A dance studio management application built with Nuxt 3, featuring class scheduling, recital management, ticketing with seat selection, and Stripe payment integration.

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Quality & CI/CD

This project has comprehensive CI/CD pipelines and quality gates:

- **Automated Testing**: All PRs run linting, type checking, unit tests, and builds
- **Code Coverage**: Enforced minimum 30% code coverage threshold
- **Quality Gates**: PRs cannot be merged unless all checks pass
- **Dependency Updates**: Automated weekly updates for npm packages via Dependabot
- **Security**: Monthly automated updates for GitHub Actions

### Available Scripts

```bash
npm run lint          # Run ESLint to check code quality
npm run lint:fix      # Auto-fix ESLint issues
npm run typecheck     # Run TypeScript type checking
npm run test          # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
```

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
