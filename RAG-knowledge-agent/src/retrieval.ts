import { getEmbedding } from "./create_embedding";
import { cosineSimilarity } from "./cosine-similarity";
import { IndexedChunk } from "./build-index";

export interface RetrievedChunk extends IndexedChunk {
  score: number;
}

export async function retrieve(
  query: string,
  index: IndexedChunk[],
  topK = 4
): Promise<RetrievedChunk[]> {
  const queryEmbedding = await getEmbedding(query);

  const scoredChunks: RetrievedChunk[] = index.map((chunk) => ({
    ...chunk,
    score: cosineSimilarity(
      queryEmbedding,
      chunk.embedding
    ),
  }));

  scoredChunks.sort((a, b) => b.score - a.score);

  return scoredChunks.slice(0, topK);
}