import fs from "fs";
import path from "path";
import { PDFParse } from "pdf-parse";

export interface SourceDocument {
  title: string;
  content: string;
}

async function extractPdfText(filePath: string): Promise<string> {
  const fileBuffer = fs.readFileSync(filePath);

  const parser = new PDFParse({
    data: fileBuffer,
  });

  const result = await parser.getText();

  return result.text;
}

export async function loadDocuments(): Promise<SourceDocument[]> {
  const documentsDir = path.join(process.cwd(), "doc");

  const documents: SourceDocument[] = [
    {
      title: "Real Estate Primer",
      content: await extractPdfText(
        path.join(documentsDir, "Real_Estate_Primer.pdf")
      ),
    },
    {
      title: "Trestle Metadata",
      content: await extractPdfText(
        path.join(documentsDir, "Trestle Property MetaData.pdf")
      ),
    },
    {
      title: "IDX Handbook",
      content: await extractPdfText(
        path.join(documentsDir, "Rets_property_terms.pdf")
      ),
    },
  ];

  return documents;
}