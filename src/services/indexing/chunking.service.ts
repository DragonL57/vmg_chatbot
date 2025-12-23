/**
 * Service for splitting text into semantic chunks.
 * Implements a Recursive Character Text Splitter strategy.
 */
export class ChunkingService {
  /**
   * Splits text into chunks based on recursive separators.
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
    const separators = ['\n\n', '\n', '. ', ' ', ''];
    return this.recursiveSplit(text, separators, chunkSize, chunkOverlap);
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
        // If a single split is too large, recurse with the next separator
        if (goodSplits.length > 0) {
          this.mergeSplits(goodSplits, separator, chunkSize, chunkOverlap).forEach(c => finalChunks.push(c));
          goodSplits = [];
        }
        if (newSeparators.length > 0) {
          this.recursiveSplit(s, newSeparators, chunkSize, chunkOverlap).forEach(c => finalChunks.push(c));
        } else {
          // No more separators, forced split (should rarely happen with empty string separator)
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
          
          // Handle overlap: keep last few items that fit within overlap budget
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
