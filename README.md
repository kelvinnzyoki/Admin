# TAM Admin Dashboard - Implementation Guide

## Overview
This admin dashboard provides real-time activity tracking, user management, and analytics for your TAM (Total Accountability Management) platform.

## Features

 ## Implemented Features

1. **Real-Time Activity Tracking**
   - Live monitoring of user signups, logins, and actions
   - Activity feed with 30-second auto-refresh
   - Redis-backed real-time activity cache

2. **User Management**
   - View all users with stats
   - Delete users (with cascading data deletion)
   - Protected admin accounts
   - User activity history

3. **Audit Log Management**
   - View all user audits
   - Delete individual audits
   - Search and filter capabilities

4. **Analytics Dashboard**
   - User growth charts (last 30 days)
   - Activity breakdown by type
   - Top 10 activity types in last 7 days

5. **Security**
   - Admin-only access via role-based authentication
   - Session fingerprinting
   - CSRF protection via httpOnly cookies

## Installation

### 1. Database Setup

Run the migration script to create necessary tables:

```bash
psql $DATABASE_URL -f database-migration.sql
```

This creates:
- `activity_logs` table for tracking all user activities
- Adds `role` column to `users` table
- Creates indexes for optimal query performance
- Sets up an admin summary view

### 2. Update Server File

Replace your current `server.js` with `server-enhanced.js`:

```bash
cp server-enhanced.js server.js
```

Or manually integrate the new admin endpoints into your existing server.

### 3. Set Admin User

You need to manually set at least one user as admin in your database:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your-admin-email@example.com';
```

### 4. Update Frontend Files

**Option A: Use Enhanced Version**
```bash
# Use the new enhanced HTML and JS
cp admin-dashboard-enhanced.html admin.html
cp script-enhanced.js script.js
```

**Option B: Manual Integration**
If you prefer to keep your existing files, add these to your current `script.js`:
- API helper object
- All the async functions for loading data
- Auto-refresh mechanism

### 5. Configure API Base URL

In `script.js`, update the API base URL:

```javascript
const API = {
  baseURL: 'https://cctamcc.site', // Your server URL
  // ... rest of code
};
```

## API Endpoints Reference

### Admin Endpoints (Require Admin Role)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/admin/stats` | GET | Dashboard statistics |
| `/admin/audits` | GET | All audit logs |
| `/admin/audit/:userId` | DELETE | Delete specific audit |
| `/admin/activities` | GET | Recent activities from DB |
| `/admin/activities/realtime` | GET | Real-time activities from Redis |
| `/admin/users` | GET | All users with stats |
| `/admin/user/:userId` | DELETE | Delete user |
| `/admin/activity-stats` | GET | Activity breakdown (7 days) |
| `/admin/user-growth` | GET | Daily signups (30 days) |

### Activity Logging

Activities are automatically logged for:
- User signups
- User logins
- Recovery log updates
- Arena posts
- Audit updates
- Score updates (pushups, situps, etc.)
- Admin actions (deletions)

## Activity Types Tracked

```javascript
{
  'user_signup': 'User registration',
  'user_login': 'User login',
  'recovery_log_updated': 'Recovery data entry',
  'arena_post_created': 'Arena post',
  'audit_updated': 'Audit log update',
  'pushups_score_updated': 'Pushups logged',
  'situps_score_updated': 'Situps logged',
  'squats_score_updated': 'Squats logged',
  'steps_score_updated': 'Steps logged',
  'addictions_score_updated': 'Addiction score',
  'admin_audit_deleted': 'Admin deleted audit',
  'admin_user_deleted': 'Admin deleted user'
}
```

## Data Flow

### Activity Logging Flow
```
User Action → Server Endpoint → logActivity() → PostgreSQL + Redis
                                                    ↓
                                            Admin Dashboard
```

### Real-Time Updates
```
Every 30 seconds:
  ↓
Dashboard → /admin/stats (stats)
         → /admin/activities (recent activities)
         → Auto-refresh UI
```

## Security Considerations

### Admin Authentication
The `authenticateAdmin` middleware checks:
1. Valid JWT token
2. User exists in database
3. User role is 'admin'

### Activity Logging Security
- User IDs are validated against authenticated sessions
- Details are stored as JSONB for flexibility
- IP addresses and user agents can be logged (optional)

### CORS Configuration
Already configured for:
- `https://cctamcc.site`
- `https://www.cctamcc.site`
- `http://localhost:5500` (development)

## Performance Optimization

### Database Indexes
Created indexes on:
- `activity_logs(user_id)`
- `activity_logs(timestamp)`
- `activity_logs(action)`
- `users(role)`

### Redis Caching
- Last 100 activities cached in Redis
- Faster real-time feed loading
- Reduces database queries

### Query Optimization
- Aggregate queries use efficient UNION ALL
- Limit clauses prevent large result sets
- JOIN operations use indexed columns

## Monitoring & Maintenance

### Database Size Management
Activity logs will grow over time. Set up a cleanup job:

```sql
-- Delete activity logs older than 90 days
DELETE FROM activity_logs WHERE timestamp < NOW() - INTERVAL '90 days';
```

### Redis Memory Management
Redis automatically maintains the last 100 activities using `LTRIM`.

## Troubleshooting

### "Unauthenticated" Error
- Ensure you're logged in as an admin user
- Check that cookies are being sent (credentials: 'include')
- Verify CORS configuration matches your domain

### Activities Not Showing
- Check if `logActivity()` is being called after user actions
- Verify Redis is connected (`Redis Online` in server logs)
- Check PostgreSQL connection

### Stats Showing Zero
- Run the migration script to create tables
- Ensure users have the `created_at` column
- Check database permissions

### Cannot Delete User
- Admin users are protected from deletion
- Check if user ID exists
- Verify admin authentication

## Testing

### Test Admin Access
```bash
# Create a test admin user
psql $DATABASE_URL -c "INSERT INTO users (username, email, password, role) VALUES ('admin', 'admin@test.com', '\$2a\$12\$...', 'admin');"
```

### Test Activity Logging
1. Sign up a new user
2. Check admin dashboard → should see "user_signup" activity
3. Log in as that user
4. Check admin dashboard → should see "user_login" activity

### Test Real-Time Feed
1. Open admin dashboard
2. In another tab, perform user actions
3. Wait 30 seconds
4. Dashboard should auto-refresh with new activities

## Future Enhancements

Potential additions:
- [ ] Export activity logs to CSV
- [ ] Advanced filtering and search
- [ ] Real-time WebSocket updates (instead of polling)
- [ ] User behavior analytics
- [ ] Automated alert system for suspicious activity
- [ ] Role-based permissions (admin, moderator, etc.)
- [ ] Activity log archiving system

## Support

For issues or questions:
1. Check server logs for errors
2. Verify database schema is up to date
3. Test API endpoints directly with curl/Postman
4. Check browser console for frontend errors

## License

This admin dashboard is part of the TAM platform.
