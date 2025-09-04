# Migration to Self-Hosted PostgreSQL Database

## Overview
This guide covers migrating the Gemlaunch Rewards System from Replit's managed PostgreSQL to your own self-hosted PostgreSQL instance.

## Prerequisites
- PostgreSQL 14+ installed and running on your server
- Database administrator access
- Network connectivity from your application server to the database

## Step 1: Database Setup

### 1.1 Create Database and User
```sql
-- Connect as postgres superuser
CREATE DATABASE gemlaunch_rewards;
CREATE USER gemlaunch_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE gemlaunch_rewards TO gemlaunch_user;

-- Connect to the new database
\c gemlaunch_rewards

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO gemlaunch_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO gemlaunch_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO gemlaunch_user;
```

### 1.2 Import Database Schema and Data
```bash
# Import the complete database structure and data
psql -h your_host -p 5432 -U gemlaunch_user -d gemlaunch_rewards < database_export.sql
```

## Step 2: Environment Configuration

### 2.1 Update Environment Variables
Replace the current Replit database connection with your self-hosted instance:

```env
# Replace with your database connection details
DATABASE_URL=postgresql://gemlaunch_user:your_secure_password@your_host:5432/gemlaunch_rewards
PGHOST=your_host
PGPORT=5432
PGUSER=gemlaunch_user
PGPASSWORD=your_secure_password
PGDATABASE=gemlaunch_rewards
```

### 2.2 SSL Configuration (Recommended)
For production environments, enable SSL:
```env
DATABASE_URL=postgresql://gemlaunch_user:your_secure_password@your_host:5432/gemlaunch_rewards?sslmode=require
```

## Step 3: Application Updates

The application already uses environment variables for database connections, so no code changes are required. The Drizzle ORM configuration in `server/db.ts` will automatically use the new connection string.

## Step 4: Verification

### 4.1 Test Database Connection
```bash
# Test connection from your application server
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM users;"
```

### 4.2 Verify Application Functionality
1. Start the application
2. Check that users and accolades load correctly
3. Verify leaderboard functionality
4. Test wallet connection and point tracking

## Step 5: Security Considerations

### 5.1 Network Security
- Use firewall rules to restrict database access to application servers only
- Consider VPN or private network connections for additional security

### 5.2 Database Security
```sql
-- Limit user permissions to application needs only
REVOKE ALL ON DATABASE gemlaunch_rewards FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
```

### 5.3 Backup Strategy
Set up automated backups:
```bash
# Example backup script
pg_dump "$DATABASE_URL" > gemlaunch_backup_$(date +%Y%m%d_%H%M%S).sql
```

## Step 6: Performance Optimization

### 6.1 Database Configuration
Optimize PostgreSQL settings for your workload:
```sql
-- Example optimizations (adjust based on your hardware)
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
SELECT pg_reload_conf();
```

### 6.2 Connection Pooling
Consider implementing connection pooling with PgBouncer for better performance:
```ini
# pgbouncer.ini example
[databases]
gemlaunch_rewards = host=localhost port=5432 dbname=gemlaunch_rewards

[pgbouncer]
listen_port = 6432
auth_type = md5
pool_mode = transaction
max_client_conn = 100
default_pool_size = 25
```

## Step 7: Monitoring

### 7.1 Database Monitoring
Monitor key metrics:
- Connection count
- Query performance
- Disk usage
- Memory usage

### 7.2 Application Monitoring
Verify the application continues to function correctly:
- API response times
- Database query performance
- Error rates

## Rollback Plan

If issues occur, you can quickly rollback by:
1. Reverting the environment variables to the original Replit values
2. Restarting the application
3. The original Replit database will still contain all data

## Production Checklist

- [ ] PostgreSQL server properly configured and secured
- [ ] Database user created with minimal required permissions
- [ ] SSL/TLS encryption enabled
- [ ] Firewall rules configured
- [ ] Backup strategy implemented
- [ ] Monitoring systems in place
- [ ] Environment variables updated
- [ ] Application tested with new database
- [ ] Performance benchmarks verified
- [ ] Rollback plan documented and tested

## Support

If you encounter issues during migration:
1. Check PostgreSQL logs for connection errors
2. Verify network connectivity between application and database
3. Confirm environment variables are correctly set
4. Test database queries manually using psql