/** All text in a PDF, pages joined. Empty for scanned/image-only PDFs. */
export async function pdfText(bytes: ArrayBuffer | Uint8Array): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}
