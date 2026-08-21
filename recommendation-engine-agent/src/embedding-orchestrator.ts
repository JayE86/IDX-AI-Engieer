import { semanticSearch } from "./retrieve-listingID";
import { getListingsByIds } from "./get-listing-by-ID";

import type {
  SemanticListingResult
} from "./shared-types";

export async function searchListings(
  query: string,
  topK = 5
): Promise<SemanticListingResult[]> {
  const semanticResults =
    await semanticSearch(query, topK);

  const listingIds = semanticResults.map(
    (result) => result.listingId
  );

  const listings =
    await getListingsByIds(listingIds);

  const listingMap = new Map(
    listings.map((listing) => [
      listing.listingId,
      listing,
    ])
  );

  const finalResults: SemanticListingResult[] =
    [];

  for (const result of semanticResults) {
    const listing =
      listingMap.get(result.listingId);

    if (!listing) {
      continue;
    }

    finalResults.push({
      ...listing,
      similarityScore: result.score,
    });
  }

  return finalResults;
}