
import type { User } from "@/models/User";
import type { Server } from "./types";
import { getInvitationsForUser } from "./invitations";
import { ObjectId } from "mongodb";
import { verifyJwt } from "./jwt";
import clientPromise from "./mongodb";

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
export async function getUserPermission(server: Server, user: User): Promise<Permission> {
    if (isUserAdmin(user)) {
        return Permission.ADMIN;
    }
    if (server.ownerId === user._id) {
        return Permission.ADMIN;
    }

    const invitations = await getInvitationsForUser(user._id);
    const relevantInvitation = invitations.find(inv => inv.serverId.toString() === server.id && inv.status === 'accepted');

    return relevantInvitation?.permission || Permission.NONE;
}

/**
 * Checks if a user has at least a certain level of permission for a server.
 * @param server The server object.
 * @param requiredPermission The minimum permission level required.
 * @param user The user object (optional, defaults to current user).
 * @returns True if the user has the required permission.
 */
export async function canUser(server: Server, requiredPermission: Permission, user: User): Promise<boolean> {
    const userPermission = await getUserPermission(server, user);
    
    const userLevel = permissionHierarchy[userPermission];
    const requiredLevel = permissionHierarchy[requiredPermission];

    return userLevel >= requiredLevel;
}
