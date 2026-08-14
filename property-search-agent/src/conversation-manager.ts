import { parsePropertyQuery } from "./parse-property-query";

import {
  clearSession,
  getSession,
  updateSession,
  updateSessionFilters,
  type UserSession,
} from "./session-memory";

export interface ConversationResponse {
  status: "question" | "search" | "reset";
  message: string;
  session: UserSession;
}

export function handleConversation(
  userId: string,
  userMessage: string
): ConversationResponse {
  const normalizedMessage = userMessage.trim().toLowerCase();

  // 1. Reset conversation

  if (
    normalizedMessage === "reset" ||
    normalizedMessage === "start over" ||
    normalizedMessage === "clear"
  ) {
    clearSession(userId);

    const resetSession = getSession(userId);

    return {
      status: "reset",
      message:
        "Your previous search has been cleared. What city are you interested in?",
      session: resetSession,
    };
  }

  // 2. Get current session

  const currentSession = getSession(userId);

  // 3. Parse filters from the current message

  const parsedFilters = parsePropertyQuery(
    userMessage,
    currentSession.pendingField
  );

  // 4. Merge newly extracted filters into session


  let session = updateSessionFilters(
    userId,
    parsedFilters
  );

  // Increment conversation turn
  session = updateSession(userId, {
    pendingField: null,
    conversationStep:
      currentSession.conversationStep + 1,
  });

  const filters = session.filters;

  // 5. If the first search has already happened,
  //    treat new filter information as refinement

  if (session.hasSearched) {
    const hasNewFilter = Object.values(
      parsedFilters
    ).some((value) => value !== undefined);

    if (hasNewFilter) {
      return {
        status: "search",
        message:
          "Updating your active listing search with the new preference.",
        session,
      };
    }

    return {
      status: "question",
      message:
        "How would you like to refine your current property search?",
      session,
    };
  }

  // 6. CORE FIELDS
  //    These must be collected before the first search

  // City
  if (!filters.city) {
    session = updateSession(userId, {
      pendingField: "city",
    });

    return {
      status: "question",
      message:
        "What city would you like to search in?",
      session,
    };
  }

  // Price range
  const hasPricePreference =
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined;

  if (!hasPricePreference) {
    session = updateSession(userId, {
      pendingField: "price",
    });

    return {
      status: "question",
      message:
        "What price range are you looking for?",
      session,
    };
  }

  // Property type
  if (!filters.propertyType) {
    session = updateSession(userId, {
      pendingField: "propertyType",
    });

    return {
      status: "question",
      message:
        "What property type do you prefer—single family, condo, townhouse, or another type?",
      session,
    };
  }

  // 7. COMMON REFINEMENT FIELDS
  //    These are also collected before first search

  // Bedrooms
  const hasBedroomPreference =
    filters.minBeds !== undefined ||
    filters.maxBeds !== undefined;

  if (!hasBedroomPreference) {
    session = updateSession(userId, {
      pendingField: "beds",
    });

    return {
      status: "question",
      message:
        "How many bedrooms are you looking for?",
      session,
    };
  }

  // Bathrooms
  const hasBathroomPreference =
    filters.minBaths !== undefined ||
    filters.maxBaths !== undefined;

  if (!hasBathroomPreference) {
    session = updateSession(userId, {
      pendingField: "baths",
    });

    return {
      status: "question",
      message:
        "How many bathrooms are you looking for?",
      session,
    };
  }

  // 8. OPTIONAL FIELDS
  //
  // minSqft / maxSqft
  // minHOA / maxHOA
  // pool
  // hasView
  //
  // We intentionally do NOT ask about them.
  // If the user provides them, they are already stored
  // in session.filters and will automatically be used.

  // 9. Core + common fields complete
  //    Ready for first search

  return {
    status: "search",
    message:
      "Searching for matching active properties now.",
    session,
  };
}