# Role-Based Access Control (RBAC) Implementation Plan

## Current State
- Simple owner/guest binary permissions
- Basic user isolation
- No administrative roles or granular permissions

## Proposed RBAC Structure

### 1. User Roles
- **User**: Basic access to own/shared servers
- **Admin**: Full system access, user management
- **Moderator**: Manage organization servers/users

### 2. Permission Levels
- **Read**: View server details only
- **Execute**: Connect and run commands  
- **Admin**: Full server management (edit/delete/share)

### 3. Database Schema Changes

#### User Model Updates
```typescript
{
  // existing fields...
  roles: ['user', 'admin', 'moderator'],
  organizationId?: ObjectId
}
```

#### New Organization Collection
```typescript
{
  _id: ObjectId,
  name: string,
  ownerId: ObjectId,
  members: [{
    userId: ObjectId,
    role: 'user' | 'admin' | 'moderator'
  }]
}
```

#### Server Model Updates
```typescript
{
  // existing fields...
  organizationId?: ObjectId,
  permissions: [{
    userId: ObjectId,
    level: 'read' | 'execute' | 'admin'
  }]
}
```

### 4. Implementation Steps

1. **Database Migration**
   - Add roles field to users collection
   - Create organizations collection
   - Update servers with permissions array

2. **Core Functions**
   ```typescript
   hasRole(user: User, role: string): boolean
   hasPermission(user: User, server: Server, permission: string): boolean
   canAccessResource(user: User, resourceType: string, action: string): boolean
   ```

3. **Middleware Updates**
   - Add role checking to existing auth middleware
   - Create permission-based route protection

4. **UI Changes**
   - Conditional rendering based on user roles
   - Admin dashboard for user/organization management
   - Permission selection in server sharing

5. **API Endpoints**
   ```
   GET /api/admin/users - List all users (admin only)
   POST /api/organizations - Create organization
   PUT /api/servers/:id/permissions - Update server permissions
   ```

### 5. Migration Strategy

1. **Phase 1**: Add role field to existing users (default: 'user')
2. **Phase 2**: Implement organization structure
3. **Phase 3**: Migrate server permissions from guestIds to permissions array
4. **Phase 4**: Update UI and add admin features

### 6. Security Considerations

- Role validation on both client and server
- Audit logging for admin actions
- Organization isolation enforcement
- Permission inheritance rules

### 7. Benefits

- Granular access control
- Multi-tenant organization support
- Scalable permission management
- Administrative oversight capabilities