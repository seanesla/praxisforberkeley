# Backend Security Improvements Guide

This document outlines the security improvements made to the backend API routes and provides guidance for applying these patterns to remaining routes.

## Overview of Improvements

### 1. Input Validation with Zod
- Created comprehensive validation schemas in `/src/validation/schemas.ts`
- Added validation middleware in `/src/middleware/validation.ts`
- Validates request body, query parameters, and URL parameters

### 2. Rate Limiting
- Added multiple rate limiting strategies in `/src/middleware/rateLimiter.ts`:
  - `standardLimiter`: 100 requests per 15 minutes for general endpoints
  - `aiLimiter`: 10 requests per 15 minutes for AI operations
  - `reportLimiter`: 5 requests per hour for report generation
  - `searchLimiter`: 30 requests per minute for search
  - `authLimiter`: 5 failed attempts per 15 minutes

### 3. Security Configuration
- Created `/src/config/security.ts` with:
  - Request size limits (10MB JSON, 20MB raw)
  - File upload restrictions
  - Security headers via Helmet
  - CORS configuration

### 4. Path Traversal Prevention
- Fixed vulnerability in `reports.ts` file download/delete operations
- Added path sanitization utilities

### 5. Type Safety
- Created comprehensive TypeScript interfaces in `/src/types/api.ts`
- Replaced `any` types with proper interfaces

### 6. Helper Function Organization
- Moved helper functions from route files to utility modules:
  - Network export functions → `/src/utils/networkExport.ts`
  - Search utilities → `/src/utils/searchUtils.ts`

## How to Apply These Improvements

### Step 1: Update Route Imports
```typescript
import { validateBody, validateQuery, validateParams } from '../middleware/validation';
import { standardLimiter, aiLimiter } from '../middleware/rateLimiter';
import { yourSchema } from '../validation/schemas';
import type { YourRequestType, YourResponseType } from '../types/api';
```

### Step 2: Add Middleware to Routes
```typescript
router.post(
  '/endpoint',
  standardLimiter,           // Rate limiting
  authenticateToken,         // Authentication
  validateBody(schema),      // Input validation
  async (req: AuthRequest, res: Response<ResponseType | ApiError>) => {
    // Route handler
  }
);
```

### Step 3: Use Typed Responses
```typescript
// Instead of:
return res.json({ data });

// Use:
const response: YourResponseType = {
  data,
  metadata: { ... }
};
return res.json(response);
```

### Step 4: Proper Error Handling
```typescript
// Consistent error format
return res.status(400).json({
  error: 'Descriptive error message',
  code: 'ERROR_CODE',
  details: validationErrors // if applicable
});
```

## Files Updated

### Fully Updated Examples:
- `/src/routes/document-dna.ts` - Added validation and rate limiting
- `/src/routes/citation-network.ts` - Fixed helper functions and added security
- `/src/routes/search-v2.ts` - Moved utilities and added validation
- `/src/routes/exercises.ts` - Fixed imports and added middleware
- `/src/routes/reports.ts` - Fixed path traversal vulnerability

### New Files Created:
- `/src/validation/schemas.ts` - Zod validation schemas
- `/src/middleware/validation.ts` - Validation middleware
- `/src/middleware/rateLimiter.ts` - Rate limiting configurations
- `/src/types/api.ts` - TypeScript interfaces
- `/src/utils/networkExport.ts` - Network export utilities
- `/src/utils/searchUtils.ts` - Search helper functions
- `/src/config/security.ts` - Security configuration
- `/src/routes/example-improved.ts` - Complete example implementation

## Remaining Routes to Update

The following routes still need the security improvements applied:
- `/src/routes/cross-document.ts`
- `/src/routes/workspace.ts`
- `/src/routes/spaced-repetition.ts`
- `/src/routes/knowledge-gap.ts`
- `/src/routes/workflow.ts`
- `/src/routes/analytics-v2.ts`

## Testing Recommendations

1. **Validation Testing**: Test each endpoint with invalid data to ensure validation works
2. **Rate Limit Testing**: Use tools like Apache Bench to verify rate limits
3. **Security Testing**: Use OWASP ZAP or similar tools to test for vulnerabilities
4. **Type Safety**: Enable strict TypeScript checking

## Deployment Checklist

- [ ] Install new dependencies: `npm install zod express-rate-limit`
- [ ] Update all route files with new patterns
- [ ] Test all endpoints with validation
- [ ] Verify rate limits are appropriate for your use case
- [ ] Update API documentation with new validation requirements
- [ ] Monitor error rates after deployment

## Security Best Practices Reminder

1. Never trust user input - validate everything
2. Use parameterized queries - avoid SQL injection
3. Implement proper rate limiting - prevent abuse
4. Sanitize file paths - prevent directory traversal
5. Use strong typing - catch errors at compile time
6. Log security events - monitor for attacks
7. Keep dependencies updated - patch vulnerabilities