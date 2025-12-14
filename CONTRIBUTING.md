# Contributing to MoneyGood

Thank you for your interest in contributing to MoneyGood! This document provides guidelines and instructions for contributing.

## Code of Conduct
 
Be respectful, constructive, and professional in all interactions.

## Development Setup

### Prerequisites
- Node.js 20+
- Firebase CLI
- Git
- A Firebase project for testing
- A Stripe test account

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/ataymia/MoneyGood.git
   cd MoneyGood
   ```

2. **Install dependencies**
   ```bash
   cd functions
   npm install
   cd ..
   ```

3. **Set up Firebase**
   ```bash
   firebase login
   firebase use --add  # Select your test project
   ```

4. **Configure environment**
   - Copy `.env.template` and create `.env` files as needed
   - Update `public/firebase.js` with your test project config
   - Create `functions/.env` with test Stripe keys

5. **Start Firebase Emulators**
   ```bash
   firebase emulators:start
   ```

6. **Access the app**
   - Open http://localhost:5000
   - Firestore UI: http://localhost:4000
   - Functions logs: Check terminal output

## Project Structure

```
/public/           # Frontend static files
  /ui/            # UI module files
  app.js          # Main app entry
  firebase.js     # Firebase initialization
  router.js       # SPA routing
  store.js        # State management
  api.js          # Cloud Functions API calls
  
/functions/        # Backend Cloud Functions
  /src/
    index.ts      # All function definitions
    stripe.ts     # Stripe helpers
    validators.ts # Input validation schemas
    dealMachine.ts # Business logic
```

## Making Changes

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### 2. Code Style

#### Frontend (JavaScript)
- Use ES6+ features
- Follow existing code style
- Use meaningful variable names
- Add comments for complex logic
- Keep functions small and focused

#### Backend (TypeScript)
- Enable strict mode
- Use async/await over promises
- Validate all inputs with Zod
- Add proper error handling
- Log important actions

#### CSS
- Use Tailwind utility classes when possible
- Follow existing theme color variables
- Keep custom CSS minimal
- Ensure dark mode compatibility

### 3. Testing Your Changes

#### Frontend Testing
1. Test in Chrome, Firefox, Safari
2. Test light and dark themes
3. Test mobile responsive design
4. Test all user flows:
   - Sign up / Login
   - Create deal
   - Accept invite
   - Make payment (use Stripe test cards)
   - Complete deal
   - Dispute handling

#### Backend Testing
```bash
# In functions directory
npm run build  # Check for TypeScript errors

# Test with emulators
firebase emulators:start
```

Test each Cloud Function:
- Use Firebase Emulator UI
- Check function logs for errors
- Verify Firestore writes
- Test error cases

### 4. Commit Your Changes

```bash
git add .
git commit -m "type: description

Detailed explanation of changes"
```

Commit types:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting)
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Maintenance tasks

Example:
```bash
git commit -m "feat: add deal cancellation feature

- Add cancelDeal Cloud Function
- Update deal state machine
- Add cancel button to deal detail page
- Update Firestore rules"
```

### 5. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub with:
- Clear title and description
- List of changes made
- Screenshots (if UI changes)
- Testing notes

## Areas for Contribution

### High Priority
- [ ] Enhanced dispute resolution system
- [ ] Email notification templates
- [ ] Admin dashboard for monitoring
- [ ] Additional payment methods
- [ ] Multi-currency support
- [ ] Mobile app (React Native)

### Medium Priority
- [ ] Deal templates
- [ ] Bulk deal creation
- [ ] Export deal history
- [ ] Advanced search/filters
- [ ] Deal analytics
- [ ] User ratings/reviews

### Documentation
- [ ] API documentation
- [ ] User guide
- [ ] Video tutorials
- [ ] Troubleshooting guide
- [ ] Architecture diagrams

### Testing
- [ ] Unit tests for Cloud Functions
- [ ] Integration tests
- [ ] E2E tests with Cypress
- [ ] Load testing

## Development Guidelines

### Adding New Features

1. **Plan First**
   - Discuss in GitHub Issues
   - Get feedback on approach
   - Consider security implications

2. **Frontend Features**
   - Add UI in appropriate module file
   - Use existing components when possible
   - Ensure responsive design
   - Test theme compatibility
   - Update router if needed

3. **Backend Features**
   - Add validator schema in `validators.ts`
   - Implement function in `index.ts`
   - Add business logic to `dealMachine.ts` if needed
   - Update Firestore rules
   - Add indexes if querying
   - Test with emulators

4. **Database Changes**
   - Update Firestore rules
   - Add indexes if needed
   - Document in README
   - Consider migration needs

### Security Guidelines

- Never commit API keys or secrets
- Always validate user input
- Use Zod schemas for validation
- Check authentication in Cloud Functions
- Verify user permissions before actions
- Use Firestore security rules
- Sanitize user-generated content
- Use HTTPS only
- Keep dependencies updated

### Performance Guidelines

- Minimize Firestore reads/writes
- Use batch operations when possible
- Cache data where appropriate
- Optimize Cloud Function cold starts
- Use indexes for queries
- Lazy load components
- Optimize images
- Minimize bundle size

## Reporting Issues

### Bug Reports

Include:
- Clear description
- Steps to reproduce
- Expected vs actual behavior
- Browser/device info
- Screenshots if applicable
- Console errors

### Feature Requests

Include:
- Clear use case
- Expected behavior
- Why it's valuable
- Possible implementation approach

## Code Review Process

All PRs require review before merging:

1. Automated checks must pass
2. Code review by maintainer
3. Testing verification
4. Documentation updates
5. No merge conflicts

## Questions?

- Open a GitHub Discussion
- Ask in issues
- Check existing documentation

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to MoneyGood! 🎉
