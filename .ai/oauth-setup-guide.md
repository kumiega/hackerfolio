# OAuth Setup Guide for GitHub Integration

## MVP Security Assessment: ✅ SECURE ENOUGH

The oauth_tokens table approach is **secure enough for MVP** with proper safeguards in place.

## Setup Instructions

### 1. Database Migration
Run the oauth_tokens migration:
```bash
supabase db push
```

### 2. Supabase Auth Configuration
1. Go to Supabase Dashboard > Authentication > Providers
2. Enable GitHub OAuth provider
3. Set required scopes: `repo,user`
4. Configure OAuth callback URL

### 3. Webhook Configuration
1. Go to Supabase Dashboard > Authentication > Hooks
2. Add Auth Webhook:
   - URL: `https://your-domain.com/api/auth/oauth-webhook`
   - Events: `user.created`, `user.updated`
   - Add webhook secret for verification

### 4. Environment Variables
Add to your `.env` file:
```
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-anon-key
```

## Security Features Implemented

- ✅ **RLS Policies**: Users can only access their own tokens
- ✅ **Server-side Storage**: Tokens never exposed to client
- ✅ **Token Validation**: Expiry and scope checking
- ✅ **Rate Limiting**: API abuse prevention
- ✅ **Input Sanitization**: XSS prevention
- ✅ **Error Logging**: Comprehensive audit trail

## Production Considerations

When ready for production, add:
- **Token Encryption**: Use Supabase Vault for token storage
- **Token Refresh**: Automatic refresh of expired tokens
- **Webhook Verification**: HMAC signature validation
- **Audit Logging**: Detailed token usage tracking

## Testing

1. Connect GitHub account via Supabase Auth
2. Verify tokens are stored in oauth_tokens table
3. Test `/api/v1/imports/github/repos` endpoint
4. Check rate limiting and error handling
