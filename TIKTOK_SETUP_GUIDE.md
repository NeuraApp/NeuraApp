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
FRONTEND_URL=https://luxury-crepe-10dd8a.netlify.app
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
2. Add redirect URI: `https://zenhswdapnofjpkdggyy.supabase.co/functions/v1/oauth-callback`
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
Check in Supabase Edge Functions logs for successful configuration

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

## Production Checklist

- [ ] TikTok app approved for production
- [ ] All required scopes approved
- [ ] Token encryption implemented
- [ ] Rate limiting configured
- [ ] HTTPS redirect URIs configured