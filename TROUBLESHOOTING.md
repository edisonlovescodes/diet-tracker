# Whop Macro Tracker - Troubleshooting Guide

This document chronicles the complete debugging process for fixing authentication issues in the Whop Macro Tracker app.

## Problem Summary

Users were seeing the guest landing page ("Sign in through Whop to start tracking") instead of their personalized dashboard when accessing the app through Whop.

## Initial Symptoms

- Developer account: ✅ Working perfectly
- Non-developer account: ❌ Showing guest landing page
- All environment variables were set correctly
- Database connection was working
- Whop configuration appeared correct

## Root Cause

**Database Schema Issue:** The `User` model had a `@unique` constraint on the `email` field, causing user creation to fail when multiple Whop users shared the same email address.

```prisma
model User {
  id          String        @id @map("_id")
  email       String?       @unique  // ← This caused the issue
  // ...
}
```

**Error in logs:**
```
[session] Failed to create user record
Error [PrismaClientKnownRequestError]:
Invalid `prisma.user.create()` invocation:
Unique constraint failed on the constraint: `User_email_key`
```

## Debugging Journey

### 1. Initial Investigation - Environment Variables

**Checked:** Environment variables on Vercel
- ✅ `WHOP_APP_ID` - Initially missing, then added
- ✅ `NEXT_PUBLIC_WHOP_APP_ID` - Set correctly
- ✅ `WHOP_API_KEY` - Set correctly
- ✅ `DATABASE_URL` - Set correctly

**Created debug endpoint:** `/api/debug/headers`
```typescript
// This helped verify that headers were being sent by Whop
export async function GET(request: NextRequest) {
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  return Response.json({
    whopSpecificHeaders: {
      userToken: request.headers.get("x-whop-user-token") ?? "NOT FOUND",
      experienceId: request.headers.get("x-whop-experience-id") ?? "NOT FOUND",
    },
    allHeaders: headers,
  });
}
```

### 2. Session Verification Issues

**Discovered:** Token verification was working, but session creation was failing.

**Created debug endpoint:** `/api/debug/session`
```typescript
export async function GET(request: NextRequest) {
  try {
    const session = await getOptionalSession();
    if (session) {
      return Response.json({ status: "authenticated", user: session.user });
    } else {
      return Response.json({ status: "unauthenticated" });
    }
  } catch (error) {
    return Response.json({ status: "error", error });
  }
}
```

**Result:** Session was returning `null` for non-developer account.

### 3. Token Verification Testing

**Created debug endpoint:** `/api/debug/verify-token`
```typescript
export async function GET(request: NextRequest) {
  const token = request.headers.get("x-whop-user-token");
  const client = getWhopClient();
  const validation = await client.verifyUserToken(token, {
    appId: process.env.WHOP_APP_ID,
  });

  return Response.json({
    success: true,
    validation: { userId: validation?.userId }
  });
}
```

**Result:** ✅ Token verification was working correctly - proving the issue was downstream.

### 4. Database Connection Testing

**Created debug endpoint:** `/api/debug/database`
```typescript
export async function GET(request: NextRequest) {
  try {
    const count = await prisma.user.count();
    return Response.json({
      status: "connected",
      userCount: count,
    });
  } catch (error) {
    return Response.json({ status: "error", error });
  }
}
```

**Result:** ✅ Database was connected and accessible.

### 5. URL Routing Investigation

**Discovered issue:** Non-developer was accessing via different URL format:
- Developer: `https://whop.com/joined/wsa/exp_6Zia8kYK3FuAMy/app/` ✅
- Non-developer: `https://whop.com/joined/ed-e5e3/diet-tracker-AvYeKPsMFRPUD6/app/` ❌

The non-developer URL used a product slug (`diet-tracker-...`) instead of experience ID (`exp_...`).

**Added middleware** to handle root path redirects:
```typescript
export function middleware(request: NextRequest) {
  if (pathname === "/") {
    const experienceId = request.headers.get("x-whop-experience-id");
    if (experienceId) {
      const url = request.nextUrl.clone();
      url.pathname = `/experiences/${experienceId}`;
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}
```

**Updated root page** to read experience ID from headers:
```typescript
export default async function Home({ searchParams }: PageProps) {
  const headersList = await headers();
  const experienceId = headersList.get("x-whop-experience-id");
  return <DashboardPage experienceId={experienceId ?? undefined} />;
}
```

### 6. Vercel Logs Analysis - THE BREAKTHROUGH

**Key finding in logs:**
```
GET /experiences/exp_AvYeKPsMFRPUD6
[session] Failed to create user record
Error: Unique constraint failed on the constraint: `User_email_key`
```

This revealed that:
1. ✅ The correct URL was being accessed
2. ✅ Token verification was working
3. ✅ User lookup was happening
4. ❌ User creation was failing due to duplicate email

### 7. The Fix - Remove Unique Constraint

**Problem:** Multiple Whop users can have the same email address, but the database enforced uniqueness.

**Solution:** Removed `@unique` constraint from User email field:

```prisma
model User {
  id          String        @id @map("_id")
  email       String?       // Removed @unique
  displayName String?
  // ...
}
```

**Applied change:**
```bash
npx prisma db push
```

**Result:** ✅ Non-developer could now sign in successfully!

## Key Learnings About Whop Apps

### 1. Whop App Architecture

- **Base URL + Path:** Whop constructs full URLs by combining your Base URL with the configured Path
- **Example Config:**
  - Base URL: `https://macro-tracker-whop.vercel.app`
  - Path: `/experiences/[experienceId]`
  - Result: `https://macro-tracker-whop.vercel.app/experiences/exp_123`

### 2. Whop Proxy Domains

- Whop assigns each app a proxy domain: `[subdomain].apps.whop.com`
- This domain proxies requests to your actual Base URL
- Whop injects authentication headers during the proxy process

### 3. Authentication Headers

Whop sends these headers to your app:
- `x-whop-user-token` - JWT token for user authentication
- `x-whop-app-id` - Your app's ID
- `x-whop-experience-id` - The experience ID (sometimes missing)

### 4. User Identification

- Users are identified by their **Whop User ID** (e.g., `user_VeR89isUKLjVj`)
- **Email is NOT unique** across Whop users
- Always use the Whop User ID as the primary key in your database

### 5. File Structure for Consumer Apps

```
app/
  experiences/
    [experienceId]/
      page.tsx          ← Main entry point for consumer apps
  api/
    meals/
      route.ts          ← API endpoints
```

### 6. Token Verification Pattern

```typescript
import { headers } from "next/headers";

export default async function ExperiencePage({ params }) {
  const headersList = await headers();
  const { userId } = await whopSdk.verifyUserToken(headersList);

  // Now use userId to fetch/create user data
  const user = await ensureUser(userId);

  return <Dashboard user={user} />;
}
```

## Debug Endpoints Reference

Keep these endpoints in production for future troubleshooting:

### `/api/debug/headers`
Shows all incoming headers and Whop-specific headers
```
GET https://your-app.vercel.app/api/debug/headers
```

### `/api/debug/session`
Tests session creation and authentication flow
```
GET https://your-app.vercel.app/api/debug/session
```

### `/api/debug/verify-token`
Tests token verification in isolation
```
GET https://your-app.vercel.app/api/debug/verify-token
```

### `/api/debug/database`
Verifies database connectivity
```
GET https://your-app.vercel.app/api/debug/database
```

## Common Issues & Solutions

### Issue: Guest landing page shown instead of dashboard

**Possible causes:**
1. Missing `WHOP_APP_ID` environment variable on Vercel
2. Database schema constraints preventing user creation
3. Incorrect Whop app configuration (wrong Base URL or Path)
4. User accessing wrong URL (product slug instead of experience ID)

**Debug steps:**
1. Check `/api/debug/headers` - verify `x-whop-user-token` is present
2. Check `/api/debug/session` - see if session creation fails
3. Check `/api/debug/verify-token` - verify token can be decoded
4. Check Vercel function logs for detailed error messages

### Issue: "Unique constraint failed" errors

**Cause:** Database schema has unique constraints that conflict with Whop's user model

**Solution:** Remove unique constraints from fields that aren't truly unique across Whop users (like email)

### Issue: Headers not being sent by Whop

**Possible causes:**
1. Wrong URL being accessed (not the configured Path)
2. App not properly installed in the Whop community
3. Dev mode enabled when testing production

**Debug steps:**
1. Verify user is accessing the correct experience URL
2. Check Whop app is installed and user has access
3. Verify production mode is enabled in Whop dashboard

## Deployment Checklist

Use this checklist when deploying Whop apps:

- [ ] Set all environment variables on Vercel (see `DEPLOYMENT-CHECKLIST.md`)
- [ ] Configure Base URL in Whop dashboard: `https://your-app.vercel.app`
- [ ] Configure Path in Whop dashboard: `/experiences/[experienceId]`
- [ ] Set environment to Production (not Development/Localhost)
- [ ] Remove `@unique` constraint from User email field
- [ ] Test token verification with `/api/debug/verify-token`
- [ ] Test session creation with `/api/debug/session`
- [ ] Test with both developer and non-developer accounts
- [ ] Verify users can be created successfully
- [ ] Check Vercel function logs for errors

## Monitoring in Production

### Check Vercel Logs Regularly

Look for these patterns:
```
✅ Good: [session] User found in database: user_xxx
✅ Good: [session] Token verified successfully for user: user_xxx

❌ Bad: [session] UnauthorizedError caught: Missing Whop user token header
❌ Bad: [session] Failed to verify Whop token
❌ Bad: [session] Failed to create user record
```

### Set Up Alerts

Consider setting up alerts for:
- High rate of `UnauthorizedError` messages
- Database connection failures
- User creation failures

## Additional Resources

- [Whop Apps Documentation](https://docs.whop.com/apps)
- [Whop SDK Documentation](https://dev.whop.com/sdk)
- [Prisma Documentation](https://www.prisma.io/docs)
- Project README: `README.md`
- Deployment Guide: `DEPLOYMENT-CHECKLIST.md`

## Timeline of Issue

- **Initial Problem:** Users seeing guest landing page
- **First Fix Attempt:** Added missing `WHOP_APP_ID` environment variable
- **Second Investigation:** Created debug endpoints to trace issue
- **Third Investigation:** Verified token verification was working
- **Fourth Investigation:** Checked database connectivity
- **Fifth Investigation:** Analyzed URL routing patterns
- **Breakthrough:** Found "Unique constraint failed" error in Vercel logs
- **Final Fix:** Removed `@unique` constraint from User email field
- **Result:** ✅ All users can now authenticate successfully

## Lessons Learned

1. **Use debug endpoints early** - They save hours of guessing
2. **Check Vercel function logs** - They contain the actual errors
3. **Don't assume uniqueness** - Email addresses are NOT unique across Whop users
4. **Test with multiple accounts** - Developer accounts may have different behavior
5. **Trust the logs** - The error message was there all along, we just needed to look in the right place
6. **Understand the platform** - Learning how Whop routing works was crucial
7. **Be systematic** - Working through each layer (headers → token → session → database) eventually found the issue

---

**Last Updated:** October 30, 2025
**Issue Resolution Time:** ~50 minutes
**Key Breakthrough:** Finding the Prisma unique constraint error in Vercel logs
