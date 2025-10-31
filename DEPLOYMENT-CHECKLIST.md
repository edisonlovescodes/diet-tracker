# Deployment Checklist for Vercel

## Required Environment Variables

Make sure ALL of these are set in Vercel (Settings → Environment Variables):

### Server-Side Variables (NOT prefixed with NEXT_PUBLIC_)
- ✅ `WHOP_APP_ID` - Your Whop app ID (e.g., app_HYK21JCsRptg2u)
- ✅ `WHOP_API_KEY` - Your Whop API key for server-side operations
- ✅ `DATABASE_URL` - MongoDB connection string
- ✅ `DIRECT_DATABASE_URL` - MongoDB connection string (same as DATABASE_URL)

### Client-Side Variables (prefixed with NEXT_PUBLIC_)
- ✅ `NEXT_PUBLIC_WHOP_APP_ID` - Your Whop app ID (same as WHOP_APP_ID)
- ✅ `NEXT_PUBLIC_WHOP_AGENT_USER_ID` - Your Whop agent user ID
- ✅ `NEXT_PUBLIC_WHOP_COMPANY_ID` - Your Whop company/business ID

### Optional
- `WHOP_REDIRECT_URI` - OAuth redirect URI (if using OAuth flow)
- `USDA_API_KEY` - For food database lookups

## Deployment Steps

1. **Set all environment variables in Vercel**
   - Go to: https://vercel.com/your-team/macro-tracker-whop/settings/environment-variables
   - Add each variable for Production, Preview, and Development environments

2. **Trigger a new deployment**
   - Either push a new commit to GitHub
   - Or use the "Redeploy" button in Vercel dashboard

3. **Verify the deployment**
   - Visit: `https://your-app.vercel.app/api/debug/headers` from within Whop
   - Check that all env variables show "SET" or "SET (hidden)"

4. **Test authentication**
   - Open the app from your Whop experience
   - You should see the dashboard instead of the guest landing page

## Troubleshooting

### Still seeing the guest landing page?

1. Check `/api/debug/headers` to verify:
   - `x-whop-user-token` is present
   - `WHOP_APP_ID` shows "SET" in the env section

2. Check browser console for errors

3. Check Vercel function logs for authentication errors

### Missing experienceId?

This is usually fine - the app works without it. The experienceId is optional and used for multi-tenant scenarios where you want to isolate data per experience.

If you need experienceId:
- Make sure your Whop app is configured as an "Experience App" (not a standalone app)
- Check your Whop app settings in the developer dashboard
