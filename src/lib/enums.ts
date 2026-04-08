// Plain string constants matching Prisma enums.
// Import from here instead of @prisma/client in any file
// that could be analyzed by the client bundler (server actions, shared libs).

export const Role = {
  ADMIN:        "ADMIN",
  COMPANY:      "COMPANY",
  PROFESSIONAL: "PROFESSIONAL",
} as const;
export type Role = typeof Role[keyof typeof Role];

export const TaskStatus = {
  PENDING:     "PENDING",
  APPROVED:    "APPROVED",
  IN_PROGRESS: "IN_PROGRESS",
  REVIEW:      "REVIEW",
  COMPLETED:   "COMPLETED",
} as const;
export type TaskStatus = typeof TaskStatus[keyof typeof TaskStatus];

export const TaskPriority = {
  LOW:    "LOW",
  MEDIUM: "MEDIUM",
  HIGH:   "HIGH",
  URGENT: "URGENT",
} as const;
export type TaskPriority = typeof TaskPriority[keyof typeof TaskPriority];

export const MemberStatus = {
  INVITED:   "INVITED",
  ACTIVE:    "ACTIVE",
  SUSPENDED: "SUSPENDED",
} as const;
export type MemberStatus = typeof MemberStatus[keyof typeof MemberStatus];
