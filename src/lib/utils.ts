
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Permission, PermissionLevel } from "./auth";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getPermissionBadgeVariant(permission: PermissionLevel): 'default' | 'secondary' | 'destructive' {
    switch (permission) {
        case Permission.ADMIN:
            return 'destructive';
        case Permission.EXECUTE:
            return 'default';
        case Permission.READ:
            return 'secondary';
        default:
            return 'secondary';
    }
}
