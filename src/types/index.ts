export type Role = "citizen" | "officer" | "admin";
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  locality: string;
  createdAt: string;
  enabled: boolean;
  notify: boolean;
  departmentId: string;
  phone?: string;
  district?: string;
  passwordHash?: string;
}
export interface Department {
  id: string;
  name: string;
  description: string;
  active: boolean;
}
export interface StatusHistory {
  id: string;
  complaintId: string;
  previousStatus: string;
  newStatus: string;
  note: string;
  updatedBy: string;
  timestamp: string;
}
export interface Complaint {
  id: string;
  reportId: string;
  userId: string;
  title: string;
  description: string;
  categoryId: string;
  departmentId: string;
  district: string;
  locality: string;
  street: string;
  landmark: string;
  city: string;
  pin: string;
  latitude: number | null;
  longitude: number | null;
  priority: string;
  status: string;
  mediaIds: string[];
  resolutionMedia: string[];
  confirmations: string[];
  createdAt: string;
  updatedAt: string;
  resolvedAt: string;
  history: StatusHistory[];
}
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}
export interface Feedback {
  id: string;
  complaintId: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt: string;
}
export interface Alert {
  id: string;
  title: string;
  description: string;
  category: string;
  locality: string;
  severity: string;
  createdAt: string;
  expiresAt: string;
  authority: string;
  readBy: string[];
}
