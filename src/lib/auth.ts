
import type { User } from "@/models/User";
import type { Server } from "./types";

export enum Role {
    USER = 'user',
    ADMIN = 'admin',
    MODERATOR = 'moderator',
}

export enum Permission {
    NONE = 'none',
    READ = 'read',
    EXECUTE = 'execute',
    ADMIN = 'admin',
}

export type PermissionLevel = Permission.READ | Permission.EXECUTE | Permission.ADMIN;

const permissionHierarchy: Record<Permission, number> = {
    [Permission.NONE]: 0,
    [Permission.READ]: 1,
    [Permission.EXECUTE]: 2,
    [Permission.ADMIN]: 3,
};

/**
 * Checks if a user is a system admin.
 * @param user The user object.
 * @returns True if the user has the ADMIN role.
 */
export function isUserAdmin(user: User): boolean {
    return user.roles?.includes(Role.ADMIN) ?? false;
}

/**
 * Gets the permission level of a user for a specific server.
 * @param server The server object.
 * @param user The user object.
 * @returns The user's permission level.
 */
export function getUserPermission(server: Server, user: User): Permission {
    if (isUserAdmin(user)) {
        return Permission.ADMIN;
    }
    if (server.ownerId === user._id) {
        return Permission.ADMIN;
    }
    const userPermission = server.permissions?.find(p => p.userId === user._id);
    return userPermission?.level || Permission.NONE;
}

/**
 * Checks if a user has at least a certain level of permission for a server.
 * @param server The server object.
 * @param requiredPermission The minimum permission level required.
 * @param user The user object (optional, defaults to current user).
 * @returns True if the user has the required permission.
 */
export function canUser(server: Server, requiredPermission: Permission, user?: User): boolean {
    // If a user object is passed, use it, otherwise use the permission embedded in the server object.
    const userPermission = user ? getUserPermission(server, user) : server.userPermission;

    if (!userPermission) {
        return false;
    }
    
    const userLevel = permissionHierarchy[userPermission];
    const requiredLevel = permissionHierarchy[requiredPermission];

    return userLevel >= requiredLevel;
}
