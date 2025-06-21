## Claude Behavior Guide

### Critical Reminders

1. Read this file fully before any work. Missing anything is FORBIDDEN.
2. Keep a mental checklist of requirements.
3. Pause after major changes to ensure you’re following guidelines and commit appropriately.
4. Ask for clarification on commit style, approach, scope, or missing details.
5. Never skip requirements—ask if unclear.

### User Context

* The user is an amateur programmer and may struggle with low-level details. Provide high-level plans and explanations.

### Logging

* Log all actions to the console: any new code generated, changes to existing code, and any operational steps taken.

### Documentation Standards

* No arbitrary statistics, mock data, or unsubstantiated claims.
* Be factual: describe actual functionality, not hypothetical benefits or outcomes.

### Context Awareness

* Before making changes, review the project’s README, key documentation, and overall architecture.
* Familiarize yourself with the folder structure, major modules, and coding patterns.
* Summarize your understanding and ask the user to confirm or correct your context if needed.
* On IDE restart or new session, reload this context to avoid losing project memory.

### Communication

* Proactively ask clear follow-up questions when requirements or patterns are ambiguous.
* Clarify commit preferences, implementation approach, scope of changes, or edge cases as needed.
* If a request is too broad or lacks detail, ask targeted clarifying questions to ensure edits are accurate and aligned with user expectations.

### Essential Commands

* **Development**: run appropriate dev scripts for the repository.
* **Testing**: run full-suite and targeted tests before commits.
* **Build & Lint**: build for production and enforce linting rules.

### Git Guidelines

* Commit often with clear messages (concise summary + detailed description).
* Never commit configuration or support files for AI tools.
* Never include console logs or mock data in code—runtime logs should go to console at execution time, not in files.
* Do not take credit for generating code: commit messages must never say “made by Claude” or claim authorship. Do not add yourself as a co-author.
* Stage only relevant files; unstage mistakes immediately.

### Testing & Debugging

#### Testing Principles

1. **Verify assumptions**: Read and trace the actual code paths before writing tests. Confirm that each feature exists and behaves as expected in the current codebase.
2. **Authenticate first**: Seed test users directly into the database or use fixtures. Ensure login flows work before testing protected functionality.
3. **Enable visible browser mode**: Run end-to-end tests (e.g., Cypress, Playwright) in headed mode first so you can observe interactions and debug UI issues.
4. **Test progressively**: Start with unit tests for individual functions, add integration tests for module interactions, then full end-to-end scenarios. Build complexity step-by-step.
5. **Monitor all channels**: Watch console logs, network requests, API responses, browser devtools errors, and performance metrics to catch issues early.
6. **Handle async correctly**: Use proper async/await or test framework callbacks. Mock timers and network delays to prevent flakiness in real-time or delayed operations.
7. **Document working behavior**: Update test documentation or README with the actual tested scenarios, API endpoints, and UI flows that passed validation.

**Golden Rule:** “Test the application that exists, not the one you imagine.”

* Aim for high coverage (90–100%) and thorough edge-case testing.
* Co-locate tests with source files using clear naming conventions.
* Mock dependencies to isolate units under test.
* Use debugging utilities (`screen.debug()`, log inspection) and performance budgets to catch regressions.

### Dev Constraints & Best Practices

* Respect existing patterns; don’t introduce new conventions without approval.
* Treat all “don’t do X” rules as permanent for this codebase.
* Follow error-handling, logging, migration, transaction, and security guidelines consistently.
* Ask questions whenever in doubt to ensure alignment with user expectations.
* Require code review: assign reviewers and obtain approval before merging.

### Context Management Features (New!)

The app now includes enhanced context management to prevent Claude from losing important information:

1. **Intelligent Context Compression**
   - Automatically summarizes older messages when conversation gets long
   - Preserves important messages and decisions
   - Shows context usage in the UI

2. **Enhanced RAG (Retrieval-Augmented Generation)**
   - Semantic chunking: Documents split at natural boundaries (paragraphs)
   - Retrieves up to 15 relevant chunks (up from 5)
   - Reranks chunks for better relevance
   - Larger chunk size (1500 chars) for better context

3. **Context Budget Visualization**
   - Shows token usage in real-time
   - Breakdown by category (messages, documents, summaries)
   - Warns when approaching limits
   - Automatic optimization when near capacity

4. **Smart Context Selection**
   - User preferences included in every request
   - Recent messages prioritized
   - Automatic conversation summarization after 30 messages
   - Document chunks ranked by relevance

To test context management:
```bash
cd backend
npx ts-node src/utils/test-context-manager.ts
```