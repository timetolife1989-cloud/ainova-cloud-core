import { z } from 'zod';
import { PASSWORD_MIN_LENGTH, USERNAME_MIN_LENGTH } from '@/lib/constants';

export const ROLES = ['admin', 'manager', 'user'] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  admin:   'Admin',
  manager: 'Manager',
  user:    'Felhasználó',
};

export const ROLE_COLORS: Record<Role, string> = {
  admin:   'bg-purple-900 text-purple-200',
  manager: 'bg-blue-900 text-blue-200',
  user:    'bg-gray-700 text-gray-300',
};

export const CreateUserSchema = z.object({
  username: z.string().min(USERNAME_MIN_LENGTH).max(100).trim(),
  fullName: z.string().min(1).max(200).trim().optional(),
  email:    z.string().email().max(255).optional().or(z.literal('')),
  role:     z.enum(ROLES),
  password: z.string().min(PASSWORD_MIN_LENGTH).max(100),
});

export const UpdateUserSchema = z.object({
  fullName: z.string().min(1).max(200).trim().optional(),
  email:    z.string().email().max(255).optional().or(z.literal('')),
  role:     z.enum(ROLES).optional(),
  isActive: z.boolean().optional(),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
