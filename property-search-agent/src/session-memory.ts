import type { ListingRow } from "./parse-structure";
import type { PropertyFilters } from "./parse-structure";

export type PendingField =
  | "city"
  | "price"
  | "propertyType"
  | "beds"
  | "baths";

export interface UserSession {
  // Retrieve information from users' first-time query
  filters: PropertyFilters;

  pendingField: PendingField | null;

  // Remember the last answer results
  lastResults?: ListingRow[];

  // Number of conversation turns in this session
  conversationStep: number;
  // Check whether the agent has already completed the first search
  hasSearched: boolean;
}

const sessions = new Map<string, UserSession>();

export function getSession(userId: string): UserSession {
  if (!sessions.has(userId)) {
    sessions.set(userId, {
      filters: {},
      pendingField: null,
      conversationStep: 0,
      hasSearched: false,
    });
  }

  return sessions.get(userId)!;
}

export function updateSession(
  userId: string,
  updates: Partial<UserSession>
): UserSession {
  const currentSession = getSession(userId);

  const updatedSession: UserSession = {
    ...currentSession,
    ...updates,
  };

  sessions.set(userId, updatedSession);

  return updatedSession;
}

export function updateSessionFilters(
  userId: string,
  newFilters: Partial<PropertyFilters>
): UserSession {
  const currentSession = getSession(userId);

  const definedFilters = Object.fromEntries(
    Object.entries(newFilters).filter(
      ([, value]) => value !== undefined
    )
  ) as Partial<PropertyFilters>;

  return updateSession(userId, {
    filters: {
      ...currentSession.filters,
      ...definedFilters,
    },
  });
}

export function clearSession(userId: string): void {
  sessions.delete(userId);
}