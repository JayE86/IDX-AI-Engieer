import { loadDocuments } from "./convert-file-text";
import { chunkText } from "./chunk-text";
import { buildIndex, DocumentChunk, IndexedChunk } from "./build-index";
import { retrieve } from "./retrieval";
import { generateAnswer } from "./generate-answer";

export async function buildKnowledgeIndex(): Promise<IndexedChunk[]> {
  const documents = await loadDocuments();

  const chunks: DocumentChunk[] = [];

  for (const doc of documents) {
    const textChunks = chunkText(doc.content);

    textChunks.forEach((text, index) => {
      chunks.push({
        id: `${doc.title}-${index}`,
        source: doc.title,
        text,
      });
    });
  }

  return buildIndex(chunks);
}

export async function answerKnowledgeQuestion(
  query: string,
  index: IndexedChunk[]
): Promise<string> {
  const retrievedChunks = await retrieve(query, index);

  return generateAnswer(query, retrievedChunks);
}