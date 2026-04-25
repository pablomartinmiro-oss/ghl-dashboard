"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Instructor {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  languages: string[];
  specialties: string[];
  level: "td1" | "td2" | "td3" | null;
  bio: string | null;
  photoUrl: string | null;
  hourlyRate: number | null;
  commissionPct: number | null;
  status: "active" | "inactive" | "on_leave";
  certifications?: Array<{ id: string; type: string; name: string }>;
  _count?: { lessons: number };
  createdAt: string;
  updatedAt: string;
}

export interface LessonStudent {
  id: string;
  lessonId: string;
  customerName: string;
  customerEmail: string | null;
  age: number | null;
  level: string | null;
}

export interface Lesson {
  id: string;
  tenantId: string;
  instructorId: string | null;
  instructor?: { id: string; firstName: string; lastName: string; level: string | null } | null;
  destinationId: string | null;
  destination?: { id: string; name: string; slug: string } | null;
  type: "group" | "private" | "adaptive" | "children_group";
  date: string;
  startTime: string;
  endTime: string;
  maxStudents: number;
  currentStudents: number;
  studentLevel: string | null;
  language: string;
  priceCents: number;
  status: "scheduled" | "confirmed" | "in_progress" | "completed" | "cancelled";
  notes: string | null;
  students: LessonStudent[];
  createdAt: string;
  updatedAt: string;
}

export interface StudentProgress {
  id: string;
  tenantId: string;
  customerEmail: string;
  customerName: string;
  currentLevel: "beginner" | "intermediate" | "advanced" | "expert";
  totalLessons: number;
  totalHours: number;
  achievements: string[];
  lastLessonDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SchoolDashboard {
  activeInstructors: number;
  lessonsToday: number;
  studentsToday: number;
  monthRevenueCents: number;
}

export interface LessonFilters {
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  instructorId?: string;
  type?: string;
  status?: string;
}

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || `Fetch failed: ${res.status}`);
  }
  return res.json();
}

function qs(filters?: Record<string, string | undefined>): string {
  if (!filters) return "";
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function useSchoolDashboard() {
  return useQuery({
    queryKey: ["school-dashboard"],
    queryFn: () => fetchJSON<SchoolDashboard>("/api/school/dashboard"),
  });
}

export function useInstructors(filters?: { status?: string; search?: string }) {
  return useQuery({
    queryKey: ["instructors", filters],
    queryFn: () => fetchJSON<{ instructors: Instructor[] }>(`/api/school/instructors${qs(filters)}`),
    select: (d) => d.instructors,
  });
}

export function useCreateInstructor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<Instructor>) =>
      fetchJSON<{ instructor: Instructor }>("/api/school/instructors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["instructors"] }),
  });
}

export function useUpdateInstructor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: Partial<Instructor> & { id: string }) =>
      fetchJSON<{ instructor: Instructor }>(`/api/school/instructors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["instructors"] }),
  });
}

export function useLessons(filters?: LessonFilters) {
  return useQuery({
    queryKey: ["lessons", filters],
    queryFn: () => fetchJSON<{ lessons: Lesson[] }>(`/api/school/lessons${qs(filters)}`),
    select: (d) => d.lessons,
  });
}

export function useCreateLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<Lesson>) =>
      fetchJSON<{ lesson: Lesson }>("/api/school/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lessons"] });
      qc.invalidateQueries({ queryKey: ["school-dashboard"] });
    },
  });
}

export function useUpdateLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: Partial<Lesson> & { id: string }) =>
      fetchJSON<{ lesson: Lesson }>(`/api/school/lessons/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lessons"] });
      qc.invalidateQueries({ queryKey: ["school-dashboard"] });
    },
  });
}

export function useAutoAssign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { lessonId: string }) =>
      fetchJSON<{ lesson: Lesson; instructorId: string | null }>("/api/school/auto-assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lessons"] }),
  });
}

export function useStudentProgress(email: string | null) {
  return useQuery({
    queryKey: ["student-progress", email],
    queryFn: () =>
      fetchJSON<{ progress: StudentProgress | null }>(
        `/api/school/progress?email=${encodeURIComponent(email || "")}`
      ),
    select: (d) => d.progress,
    enabled: !!email,
  });
}
