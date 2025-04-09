# Contributing to BioProof

We love your input! We want to make contributing to BioProof as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## Development Process

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

### Pull Requests

Pull requests are the best way to propose changes to the codebase. We actively welcome your pull requests:

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code lints.
6. Issue that pull request!

### Issues

We use GitHub issues to track public bugs. Report a bug by [opening a new issue](https://github.com/your-username/bioproof/issues/new); it's that easy!

**Great Bug Reports** tend to have:

- A quick summary and/or background
- Steps to reproduce
  - Be specific!
  - Give sample code if you can
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening, or stuff you tried that didn't work)

### Feature Requests

We also use GitHub issues for feature requests. When proposing a new feature:

- Explain in detail how it would work.
- Keep the scope as narrow as possible, to make it easier to implement.
- Remember that this is a volunteer-driven project, and that contributions are welcome.

## Coding Conventions

### For Smart Contracts (Solidity)

- Use [OpenZeppelin](https://openzeppelin.com/contracts/) contracts whenever possible
- Follow the [Solidity Style Guide](https://docs.soliditylang.org/en/latest/style-guide.html)
- Write comprehensive unit tests for all contracts
- Document all functions using NatSpec comments
- Ensure all contracts pass [Slither](https://github.com/crytic/slither) analysis
- Consider gas optimization for all code

### For Backend (Node.js)

- Follow [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- Write unit tests for all API endpoints
- Document API using OpenAPI/Swagger
- Use async/await pattern for asynchronous code
- Add meaningful error messages and proper error handling

### For Frontend (React)

- Use functional components with hooks
- Follow component-based architecture
- Use CSS modules or styled-components for styling
- Write reusable and modular code
- Implement responsive design
- Test components with React Testing Library

## Code Review Process

The maintainers team looks at Pull Requests on a regular basis. After feedback has been given, we expect responses within two weeks. After two weeks, we may close the PR if it isn't showing any activity.

## Community

Discussions about the project take place on our GitHub Discussions section or in GitHub issues. Anyone is welcome to join these conversations.

## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the [tags on this repository](https://github.com/your-username/bioproof/tags).

## License

By contributing, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).

## Setting Up Local Development Environment

### Prerequisites

- Node.js (v14+)
- npm or yarn
- PostgreSQL
- MetaMask or other Ethereum wallet
- Ethereum node access (via Infura, Alchemy, or local node)
- IPFS node access (via Infura, Pinata, or local node)

### Getting Started

1. Clone your fork of the repository:
   ```
   git clone https://github.com/YOUR-USERNAME/bioproof.git
   cd bioproof
   ```

2. Install dependencies:
   ```
   # Install backend dependencies
   cd backend
   npm install

   # Install frontend dependencies
   cd ../frontend
   npm install

   # Install contract dependencies
   cd ../contracts
   npm install
   ```

3. Set up environment variables (see README.md for details)

4. Run local development environment:
   ```
   # In one terminal, run the blockchain
   cd contracts
   npx hardhat node

   # In another terminal, deploy contracts
   cd contracts
   npx hardhat run scripts/deploy.js --network localhost

   # In another terminal, run the backend
   cd backend
   npm run dev

   # In another terminal, run the frontend
   cd frontend
   npm start
   ```

### Running Tests

```
# Smart contract tests
cd contracts
npx hardhat test

# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## Questions?

Feel free to contact the project maintainers if you have any questions or need further guidance.

Thank you for contributing to BioProof!