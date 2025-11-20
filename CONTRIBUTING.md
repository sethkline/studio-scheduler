# Contributing to Studio Scheduler

Thank you for your interest in contributing to Studio Scheduler! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)
- [Commit Message Guidelines](#commit-message-guidelines)

## Code of Conduct

### Our Standards

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Assume good intentions
- Keep discussions professional

### Unacceptable Behavior

- Harassment or discrimination
- Trolling or insulting comments
- Publishing others' private information
- Unethical or unprofessional conduct

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Git installed and configured
- GitHub account
- Supabase account (for database access)
- Stripe account (test mode for payments)

### Initial Setup

1. **Fork the repository**:
   - Visit https://github.com/your-org/studio-scheduler
   - Click "Fork" in the top-right corner

2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/studio-scheduler.git
   cd studio-scheduler
   ```

3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/your-org/studio-scheduler.git
   ```

4. **Install dependencies**:
   ```bash
   npm install
   ```

5. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

6. **Run the development server**:
   ```bash
   npm run dev
   ```

7. **Run tests**:
   ```bash
   npm test
   ```

## How to Contribute

### Reporting Bugs

Before submitting a bug report:
- Check existing issues to avoid duplicates
- Use the latest version of the code
- Collect relevant information (browser, OS, error messages)

**Bug Report Template**:

```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**
 - OS: [e.g., macOS 12.0]
 - Browser: [e.g., Chrome 95]
 - Node version: [e.g., 18.0.0]

**Additional context**
Any other relevant information.
```

### Suggesting Enhancements

**Enhancement Proposal Template**:

```markdown
**Is your feature request related to a problem?**
A clear description of the problem.

**Describe the solution you'd like**
A clear description of what you want to happen.

**Describe alternatives you've considered**
Any alternative solutions or features you've considered.

**Additional context**
Mockups, examples, or other relevant information.
```

### Picking an Issue

1. Browse [open issues](https://github.com/your-org/studio-scheduler/issues)
2. Look for issues labeled `good first issue` or `help wanted`
3. Comment on the issue to claim it
4. Wait for maintainer approval before starting work

## Development Workflow

### Branch Naming Conventions

Use descriptive branch names following this pattern:

- `feature/short-description` - New features
- `fix/short-description` - Bug fixes
- `docs/short-description` - Documentation updates
- `refactor/short-description` - Code refactoring
- `test/short-description` - Adding or updating tests

**Examples**:
- `feature/add-student-attendance`
- `fix/ticket-qr-code-generation`
- `docs/update-api-guide`

### Creating a Branch

```bash
# Update your main branch
git checkout main
git pull upstream main

# Create a new branch
git checkout -b feature/your-feature-name
```

### Making Changes

1. **Write code** following our coding standards
2. **Add tests** for new functionality
3. **Update documentation** if needed
4. **Test locally** to ensure everything works
5. **Commit frequently** with clear messages

### Keeping Your Branch Updated

```bash
# Fetch latest changes from upstream
git fetch upstream

# Rebase your branch on upstream/main
git rebase upstream/main

# If conflicts occur, resolve them and continue
git rebase --continue
```

## Coding Standards

### TypeScript/JavaScript

- Use TypeScript for all new code
- Follow ESLint rules (run `npm run lint`)
- Use meaningful variable and function names
- Add JSDoc comments for complex functions

**Example**:
```typescript
/**
 * Calculates the total price for a ticket order including fees
 * @param seats - Array of selected seats
 * @param feePercentage - Processing fee percentage (default: 3%)
 * @returns Total price including fees
 */
function calculateOrderTotal(seats: Seat[], feePercentage = 0.03): number {
  const subtotal = seats.reduce((sum, seat) => sum + seat.price, 0)
  const fee = subtotal * feePercentage
  return subtotal + fee
}
```

### Vue Components

- Use `<script setup>` syntax
- Define props with TypeScript interfaces
- Use composables for shared logic
- Keep components focused and single-purpose

**Example**:
```vue
<script setup lang="ts">
interface Props {
  ticket: Ticket
  showDetails?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showDetails: false
})

const emit = defineEmits<{
  delete: [id: string]
  view: [ticket: Ticket]
}>()
</script>

<template>
  <div class="ticket-card">
    <!-- Component template -->
  </div>
</template>
```

### CSS/Tailwind

- Use Tailwind utility classes
- Avoid custom CSS when possible
- Use PrimeVue component classes
- Maintain responsive design

### File Organization

- Place components in feature-specific folders
- Group related files together
- Use index files to export multiple items
- Keep files under 300 lines when possible

## Testing Requirements

All contributions must include tests:

### Unit Tests

Test individual functions and composables:

```typescript
// __tests__/unit/composables/usePermissions.spec.ts
describe('usePermissions', () => {
  it('should return true for admin with canManageStudents', () => {
    const { can } = usePermissions()
    expect(can('canManageStudents')).toBe(true)
  })
})
```

### Integration Tests

Test interactions between components:

```typescript
// __tests__/integration/ticketing.spec.ts
describe('Ticket Purchase Flow', () => {
  it('should create order after successful payment', async () => {
    const order = await purchaseTickets(testData)
    expect(order.status).toBe('completed')
  })
})
```

### Coverage Requirements

- New features: 80%+ coverage
- Bug fixes: Add test that reproduces the bug
- Run `npm run test:coverage` to check coverage

## Pull Request Process

### Before Submitting

- [ ] Code follows style guidelines
- [ ] Tests are written and passing
- [ ] Documentation is updated
- [ ] Commit messages follow conventions
- [ ] Branch is rebased on latest main
- [ ] No merge conflicts

### Submitting a Pull Request

1. **Push your branch**:
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Open a pull request**:
   - Go to your fork on GitHub
   - Click "New Pull Request"
   - Select your branch
   - Fill out the PR template

3. **PR Template**:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix (non-breaking change)
- [ ] New feature (non-breaking change)
- [ ] Breaking change (fix or feature that causes existing functionality to not work as expected)
- [ ] Documentation update

## Related Issue
Fixes #123

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Screenshots (if applicable)
Add screenshots to demonstrate changes

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-reviewed the code
- [ ] Commented complex code
- [ ] Updated documentation
- [ ] No new warnings generated
- [ ] Added tests
- [ ] All tests pass locally
```

### Code Review Process

1. **Automated checks**: CI/CD runs tests and linting
2. **Peer review**: At least one maintainer reviews code
3. **Feedback**: Address review comments
4. **Approval**: Maintainer approves PR
5. **Merge**: Maintainer merges to main

### After Your PR is Merged

1. **Delete your branch**:
   ```bash
   git branch -d feature/your-feature-name
   git push origin --delete feature/your-feature-name
   ```

2. **Update your fork**:
   ```bash
   git checkout main
   git pull upstream main
   git push origin main
   ```

## Commit Message Guidelines

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```bash
# Feature
feat(ticketing): add QR code generation for tickets

# Bug fix
fix(attendance): correct check-in time calculation

# Documentation
docs(readme): update installation instructions

# Breaking change
feat(auth)!: migrate to Supabase Auth v2

BREAKING CHANGE: All users must re-authenticate after this update
```

### Best Practices

- Use present tense ("add" not "added")
- Use imperative mood ("move" not "moves")
- Keep subject line under 50 characters
- Capitalize first letter of subject
- No period at end of subject
- Separate subject from body with blank line
- Wrap body at 72 characters
- Use body to explain what and why, not how

## Getting Help

### Resources

- [Architecture Documentation](/docs/architecture.md)
- [Testing Guide](/docs/testing.md)
- [Deployment Guide](/docs/deployment.md)
- [CLAUDE.md](/CLAUDE.md) - AI assistant guidance

### Communication Channels

- GitHub Issues: Bug reports and feature requests
- GitHub Discussions: Questions and general discussion
- Discord: Real-time chat (link in README)

### Asking Questions

When asking for help:
1. Search existing issues and discussions first
2. Provide context and relevant details
3. Include code snippets and error messages
4. Be patient and respectful

## Recognition

Contributors are recognized in:
- GitHub contributors list
- Release notes
- Annual contributor acknowledgment

Thank you for contributing to Studio Scheduler! Your efforts help make this project better for everyone.
