import { handleConversation } from "./conversation-manager";
import { searchActiveListings } from "./search-active-listings";
import { formatActiveListings } from "./property-cards";
import { updateSession } from "./session-memory";

export type ActiveListingInput = {
  query: string;
  userId: string;
};

export type ActiveListingResult = {
  status: "question" | "search" | "reset";
  response: string;
};

/**
 * Main orchestration layer for the multi-turn
 * active-listing conversation.
 *
 * A stable userId must be provided for every message
 * from the same user so session memory can be preserved.
 */
export async function handleActiveListingConversation(
  input: ActiveListingInput
): Promise<ActiveListingResult> {
  const query = input.query?.trim();
  const userId = input.userId?.trim();

  // 1. Validate input

  if (!query) {
    return {
      status: "question",
      response: "Please enter a property search request.",
    };
  }

  if (!userId) {
    throw new Error(
      "handleActiveListingConversation requires a stable userId."
    );
  }

  try {

    // 2. Run the conversation manager


    const conversation = await handleConversation(
      userId,
      query
    );

    // 3. If more information is needed, return the
    //    follow-up question without searching yet

    if (
      conversation.status === "question" ||
      conversation.status === "reset"
    ) {
      return {
        status: conversation.status,
        response: conversation.message,
      };
    }

    // 4. Core information is complete
    //    Use the accumulated session filters directly

    const filters = conversation.session.filters;

    // 5. Search active listings

    const listings = await searchActiveListings(
      filters,
      1,
      10
    );

    updateSession(userId, {
      hasSearched: true,
      lastResults: listings,
    });

    // 6. Handle no matching listings

    if (listings.length === 0) {
      return {
        status: "search",
        response:
          "I could not find any active listings that match those preferences. " +
          "Try adjusting your price range, property type, or other search preferences.",
      };
    }

    // 7. Format and return the property cards

    const response = formatActiveListings(listings);

    return {
      status: "search",
      response,
    };
  } catch (error) {
    console.error(
      "Active listing conversation failed:",
      error
    );

    return {
      status: "question",
      response:
        "I had trouble processing your active listing search. Please try again.",
    };
  }
}