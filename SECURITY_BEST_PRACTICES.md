# 🔒 Security Best Practices

## Critical Security Rules

### 1. **NEVER EXPOSE SENSITIVE URLS OR SECRETS IN BROWSER**

❌ **WRONG - Exposes video URL in browser:**
```typescript
// BAD: Full URL visible in address bar
navigate(`/video?url=https://drive.google.com/file/d/SECRET_ID/view`)
```

✅ **CORRECT - Use resource IDs only:**
```typescript
// GOOD: Only ID in URL, fetch actual URL server-side
openModal('video', { lectureId: '123' })
// URL becomes: /lectures?modal=video&lectureId=123
// Actual video URL fetched from backend when modal opens
```

### 2. **API Keys and Secrets Management**

#### Publishable Keys (Safe in .env)
✅ These are OK to commit:
- Supabase anon/publishable key
- Public API keys explicitly marked as "publishable"
- Public configuration values

```env
# .env - Safe publishable keys
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGci...
VITE_SUPABASE_URL=https://...
```

#### Secret Keys (NEVER in code)
❌ NEVER commit these:
- Private API keys
- Secret tokens
- Database passwords
- OAuth client secrets
- Signing keys

✅ **CORRECT Approach:**
1. Store in Supabase Secrets (Project Settings → Secrets)
2. Access only in Edge Functions:
```typescript
// Edge function can access secrets
const apiKey = Deno.env.get('PRIVATE_API_KEY');
```

### 3. **Modal Security Pattern**

```typescript
// ✅ SECURE: Modal routing with resource IDs
import { useModalRouting } from '@/utils/modalRouting';

const { openModal } = useModalRouting();

// Open video modal - lectureId fetches URL from backend
openModal('video', { lectureId: lecture.id });

// Open student details
openModal('student', { studentId: student.id });

// ❌ BLOCKED: Sensitive params automatically filtered
openModal('video', { 
  url: 'secret-url',      // 🔒 Blocked
  token: 'secret-token',  // 🔒 Blocked
  apiKey: 'secret-key'    // 🔒 Blocked
});
```

### 4. **URL Parameter Security**

Sensitive keywords automatically blocked from URLs:
- `url`, `token`, `secret`, `key`, `password`, `apiKey`
- Any parameter containing these is filtered out

### 5. **Input Validation**

Always validate user input:
```typescript
import { z } from 'zod';

const schema = z.object({
  name: z.string().trim().max(100),
  email: z.string().email().max(255)
});

// Validate before using
const validated = schema.parse(userInput);
```

### 6. **API Request Security**

Current setup:
- ✅ Base URLs stored in code (not secrets)
- ✅ Auth tokens in localStorage (secure)
- ✅ Bearer token authentication
- ✅ Automatic 401 handling (token expiry)

```typescript
// Already implemented in auth.api.ts
const headers = {
  'Authorization': `Bearer ${localStorage.getItem('access_token')}`
};
```

## Migration Checklist

If you currently have exposed secrets:

### For Video URLs
- [ ] Replace `?modal=video&url=https://...` 
- [ ] With `?modal=video&lectureId=123`
- [ ] Backend fetches actual URL when needed

### For API Keys
- [ ] Move from code to Supabase Secrets
- [ ] Update to use Edge Functions for sensitive operations
- [ ] Remove hardcoded keys from all files

### For Tokens
- [ ] Never pass tokens in URL params
- [ ] Use localStorage for client-side tokens
- [ ] Use Authorization headers for API calls

## Current Security Status

✅ **Secure:**
- Modal routing filters sensitive params
- Publishable keys properly managed
- Auth tokens in localStorage
- Bearer token authentication
- 403/401 error handling

⚠️ **Review Needed:**
- Check all video/document URLs use reference IDs
- Ensure no API keys in component files
- Verify all external API calls use proper authentication

## How to Add New Secrets

1. **For Backend Use (Edge Functions):**
   ```bash
   # In Supabase Dashboard:
   # Settings → Secrets → Add Secret
   # Name: STRIPE_SECRET_KEY
   # Value: sk_live_...
   ```

2. **For Frontend Use (if absolutely needed):**
   ```env
   # Only for PUBLISHABLE keys
   VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
   ```

3. **Usage in Edge Function:**
   ```typescript
   const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
   const stripe = new Stripe(stripeKey);
   ```

## Security Contacts

If you discover a security vulnerability:
1. Do NOT commit it
2. Document the issue
3. Implement fix following patterns above
4. Test thoroughly

---

Remember: **Security is not optional. When in doubt, ask before exposing data.**
