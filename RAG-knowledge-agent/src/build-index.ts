import { getEmbedding } from "./create_embedding";

export interface DocumentChunk {
  id: string;
  source: string;
  text: string;
}

export interface IndexedChunk {
  id: string;
  source: string;
  text: string;
  embedding: number[];
}

export async function buildIndex(
  chunks: DocumentChunk[]
): Promise<IndexedChunk[]> {
  const indexedChunks: IndexedChunk[] = [];

  for (const chunk of chunks) {
    const embedding = await getEmbedding(chunk.text);

    indexedChunks.push({
      id: chunk.id,
      source: chunk.source,
      text: chunk.text,
      embedding,
    });
  }

  return indexedChunks;
}