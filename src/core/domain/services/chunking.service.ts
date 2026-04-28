export interface ChunkResult {
  child: string;
  parent: string;
  header: string;
}

/**
 * Pure Domain Service for Hierarchical Chunking of Markdown.
 */
export function hierarchicalChunk(markdown: string): ChunkResult[] {
  const MIN_PARENT_SIZE = 1200; 
  const CHILD_SIZE = 500;       
  const CHILD_OVERLAP = 150;    

  const rawSections = markdown.split(/\n(?=#{1,3}\s)/);
  const processedParents: Array<{ text: string; header: string }> = [];
  let buffer = "";
  let currentHeader = "General";

  for (const section of rawSections) {
    const trimmed = section.trim();
    if (!trimmed) continue;

    const headerMatch = trimmed.match(/^#{1,3}\s*(.*)/m);
    const sectionHeader = headerMatch ? headerMatch[1].trim() : currentHeader;
    
    if (trimmed.length >= MIN_PARENT_SIZE) {
      if (buffer) processedParents.push({ text: buffer, header: currentHeader });
      processedParents.push({ text: trimmed, header: sectionHeader });
      buffer = "";
      currentHeader = sectionHeader;
      continue;
    }

    if (buffer.length + trimmed.length < MIN_PARENT_SIZE) {
      buffer += (buffer ? "\n\n" : "") + trimmed;
    } else {
      if (buffer) processedParents.push({ text: buffer, header: currentHeader });
      buffer = trimmed;
      currentHeader = sectionHeader;
    }
  }
  if (buffer) processedParents.push({ text: buffer, header: currentHeader });

  const results: ChunkResult[] = [];
  for (const parent of processedParents) {
    let start = 0;
    while (start < parent.text.length) {
      let end = start + CHILD_SIZE;

      if (end < parent.text.length) {
        const nextBreak = parent.text.slice(end, end + 50).search(/[\n.]/);
        if (nextBreak !== -1) end += nextBreak + 1;
      }

      const childRaw = parent.text.slice(start, end).trim();
      if (childRaw.length > 50) {
        const childWithHeader = `[${parent.header}] ${childRaw}`;
        results.push({ child: childWithHeader, parent: parent.text, header: parent.header });
      }

      start = end - CHILD_OVERLAP;
      if (start >= parent.text.length - CHILD_OVERLAP) break;
    }
  }
  return results;
}
