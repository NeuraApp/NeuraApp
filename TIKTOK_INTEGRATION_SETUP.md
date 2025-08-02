# TikTok Integration Setup Guide

## Required Supabase Secrets

Add these secrets to your Supabase project dashboard under Settings > Edge Functions:

### 1. TikTok OAuth Credentials
```
TIKTOK_CLIENT_KEY=your_tiktok_client_key_here
TIKTOK_CLIENT_SECRET=your_tiktok_client_secret_here
```

### 2. Frontend URL (if not already set)
```
FRONTEND_URL=https://your-domain.netlify.app
```

## How to Get TikTok Credentials

### Step 1: Create TikTok Developer Account
1. Go to [TikTok for Developers](https://developers.tiktok.com/)
2. Sign up with your TikTok account
3. Complete the developer verification process

### Step 2: Create an App
1. Navigate to "Manage Apps" in the developer dashboard
2. Click "Create an App"
3. Fill in app details:
   - **App Name**: NEURA Social Analytics
   - **App Description**: Social media content analytics platform
   - **Category**: Social Media Tools
   - **Platform**: Web

### Step 3: Configure OAuth Settings
1. In your app dashboard, go to "Login Kit"
2. Add redirect URI: `https://your-supabase-project.supabase.co/functions/v1/oauth-callback`
3. Select required scopes:
   - `user.info.basic`
   - `user.info.profile`
   - `user.info.stats`
   - `video.list`
   - `video.insights` (if available)

### Step 4: Get Credentials
1. Copy the **Client Key** (this is your TIKTOK_CLIENT_KEY)
2. Copy the **Client Secret** (this is your TIKTOK_CLIENT_SECRET)
3. Add both to Supabase Secrets

## Testing the Integration

### 1. Verify Secrets are Set
```bash
# In Supabase Edge Functions logs, you should see:
# "TikTok OAuth configured successfully"
```

### 2. Test OAuth Flow
1. Go to `/minha-conta` in your app
2. Click "Conectar TikTok"
3. Complete TikTok authorization
4. Verify "Conectado" status appears immediately

### 3. Check Database
```sql
-- Verify connection was saved
SELECT * FROM user_connections WHERE platform = 'tiktok';
```

## API Endpoints Used

### TikTok for Developers v2 API
- **Authorization**: `https://www.tiktok.com/v2/auth/authorize/`
- **Token Exchange**: `https://open.tiktokapis.com/v2/oauth/token/`
- **User Info**: `https://open.tiktokapis.com/v2/user/info/`
- **Video List**: `https://open.tiktokapis.com/v2/video/list/`
- **Video Analytics**: `https://open.tiktokapis.com/v2/research/video/query/`

## Security Notes

### Token Storage
- Tokens are stored in `user_connections` table
- **TODO**: Implement encryption for production
- Refresh tokens are automatically managed

### Rate Limiting
- TikTok API has strict rate limits
- Implement exponential backoff in sync functions
- Monitor usage in TikTok developer dashboard

### Error Handling
- All OAuth errors are logged to `logs` table
- User-friendly error messages displayed in UI
- Automatic retry logic for expired tokens

## Troubleshooting

### Common Issues

1. **"Invalid client_key"**
   - Verify TIKTOK_CLIENT_KEY is correct
   - Check app is approved in TikTok developer dashboard

2. **"Redirect URI mismatch"**
   - Ensure redirect URI in TikTok app matches exactly:
   - `https://your-project.supabase.co/functions/v1/oauth-callback`

3. **"Scope not approved"**
   - Some scopes require TikTok approval
   - Start with basic scopes: `user.info.basic`, `user.info.profile`

4. **UI not updating after connection**
   - Check browser console for errors
   - Verify `loadConnections()` is called after OAuth success
   - Check `user_connections` table for saved data

### Debug Mode
Enable debug logging by adding to Edge Function:
```typescript
console.log('Debug: OAuth callback received', { platform, userId, code: code?.substring(0, 10) + '...' });
```

## Production Checklist

- [ ] TikTok app approved for production
- [ ] All required scopes approved
- [ ] Token encryption implemented
- [ ] Rate limiting configured
- [ ] Error monitoring setup
- [ ] HTTPS redirect URIs configured
- [ ] Webhook endpoints secured