/**
 * Service for splitting text into semantic chunks.
 * Implements a specific Markdown-aware strategy + Recursive Character Text Splitter.
 */
export class ChunkingService {
  /**
   * Splits text into chunks, prioritizing Markdown structure.
   * 
   * @param text - The text to split.
   * @param chunkSize - Target size of each chunk (in characters).
   * @param chunkOverlap - Number of characters to overlap between chunks.
   * @returns Array of chunk strings.
   */
  static split(
    text: string,
    chunkSize: number = 1000,
    chunkOverlap: number = 200
  ): string[] {
    // 1. First pass: Semantic Split by Markdown Headers (H1-H3)
    // We identify boundaries but DO NOT split if the resulting section is too small, 
    // to avoid creating tiny chunks for every sub-header.
    // However, for strict semantic separation, splitting by header is usually good.
    
    // Regex to find headers: Newline followed by 1-3 hashes and a space.
    // We iterate to find split indices.
    const headerRegex = /(^|\n)(#{1,3}\s)/g;
    const indices: number[] = [0];
    let match;
    
    while ((match = headerRegex.exec(text)) !== null) {
      // Split at the start of the match (which includes the newline)
      // This keeps the newline and header with the NEXT chunk.
      if (match.index > 0) {
        indices.push(match.index);
      }
    }
    if (indices[indices.length - 1] !== text.length) {
      indices.push(text.length);
    }

    // 2. Extract Sections
    const sections: string[] = [];
    for (let i = 0; i < indices.length - 1; i++) {
      const section = text.substring(indices[i], indices[i + 1]);
      if (section.trim()) {
        sections.push(section);
      }
    }

    // 3. Process each section
    const finalChunks: string[] = [];
    
    for (const section of sections) {
      // If section fits in chunk size, keep it whole (simplest semantic unit)
      if (section.length <= chunkSize) {
        finalChunks.push(section.trim());
      } else {
        // If too big, use Recursive Splitter on this section
        const subChunks = this.recursiveSplit(section, ['\n\n', '\n', '. ', ' ', ''], chunkSize, chunkOverlap);
        finalChunks.push(...subChunks);
      }
    }

    // 4. Merge small adjacent chunks if they are under-filled (Optional optimization)
    // For now, we return the semantically split chunks directly to ensure header context is preserved.
    
    return finalChunks;
  }

  private static recursiveSplit(
    text: string,
    separators: string[],
    chunkSize: number,
    chunkOverlap: number
  ): string[] {
    const finalChunks: string[] = [];
    let separator = separators[separators.length - 1];
    let newSeparators: string[] = [];

    // Find the first separator that exists in the text
    for (let i = 0; i < separators.length; i++) {
      const s = separators[i];
      if (s === '' || text.includes(s)) {
        separator = s;
        newSeparators = separators.slice(i + 1);
        break;
      }
    }

    // Split text
    const splits = separator ? text.split(separator) : [text];
    let goodSplits: string[] = [];

    // Merge splits to form chunks of appropriate size
    for (const s of splits) {
      if (s.length < chunkSize) {
        goodSplits.push(s);
      } else {
        if (goodSplits.length > 0) {
          this.mergeSplits(goodSplits, separator, chunkSize, chunkOverlap).forEach(c => finalChunks.push(c));
          goodSplits = [];
        }
        if (newSeparators.length > 0) {
          this.recursiveSplit(s, newSeparators, chunkSize, chunkOverlap).forEach(c => finalChunks.push(c));
        } else {
          finalChunks.push(s);
        }
      }
    }

    if (goodSplits.length > 0) {
      this.mergeSplits(goodSplits, separator, chunkSize, chunkOverlap).forEach(c => finalChunks.push(c));
    }

    return finalChunks;
  }

  private static mergeSplits(
    splits: string[],
    separator: string,
    chunkSize: number,
    chunkOverlap: number
  ): string[] {
    const docs: string[] = [];
    const currentDoc: string[] = [];
    let total = 0;

    for (const d of splits) {
      const len = d.length;
      if (total + len + (currentDoc.length > 0 ? separator.length : 0) > chunkSize) {
        if (currentDoc.length > 0) {
          const doc = currentDoc.join(separator);
          if (doc) docs.push(doc);
          
          while (total > chunkOverlap || (total + len > chunkSize && total > 0)) {
            total -= (currentDoc[0].length + (currentDoc.length > 1 ? separator.length : 0));
            currentDoc.shift();
          }
        }
      }
      currentDoc.push(d);
      total += len + (currentDoc.length > 1 ? separator.length : 0);
    }

    const doc = currentDoc.join(separator);
    if (doc) docs.push(doc);

    return docs;
  }
}
