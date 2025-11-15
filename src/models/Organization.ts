
import { z } from 'zod';
import { ObjectId } from 'mongodb';

export const EmployeeCountRanges = [
    '1-10', 
    '11-50', 
    '51-200', 
    '201-1000', 
    '1001+'
] as const;

export const UserRolesInOrg = [
    'Founder / C-level',
    'VP / Director',
    'Manager',
    'Engineer / Developer',
    'IT / SysAdmin',
    'Student / Hobbyist',
    'Other'
] as const;

export const OrganizationSchema = z.object({
  name: z.string().min(1, 'Organization name is required.'),
  employeeCount: z.enum(EmployeeCountRanges),
  userRole: z.enum(UserRolesInOrg),
  ownerId: z.instanceof(ObjectId),
  createdAt: z.date(),
});

export type OrganizationModel = z.infer<typeof OrganizationSchema>;

export type Organization = OrganizationModel & {
    _id: string;
}
