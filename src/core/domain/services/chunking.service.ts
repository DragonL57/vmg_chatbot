export interface ChunkResult {
  child: string;
  parent: string;
  header: string;
}

interface ParentSection {
  text: string;
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
  const processedParents = buildParentSections(rawSections, MIN_PARENT_SIZE);

  const results: ChunkResult[] = [];
  for (const parent of processedParents) {
    let start = 0;
    while (start < parent.text.length) {
      const end = findChildEnd(parent.text, start, CHILD_SIZE);
      const childRaw = parent.text.slice(start, end).trim();

      if (childRaw.length > 50) {
        results.push({ 
          child: `[${parent.header}] ${childRaw}`, 
          parent: parent.text, 
          header: parent.header 
        });
      }

      start = end - CHILD_OVERLAP;
      if (start >= parent.text.length - CHILD_OVERLAP) break;
    }
  }
  return results;
}

function buildParentSections(sections: string[], minSize: number): ParentSection[] {
  const parents: ParentSection[] = [];
  let buffer = "";
  let currentHeader = "General";

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;

    const headerMatch = trimmed.match(/^#{1,3}\s*(.*)/m);
    const sectionHeader = headerMatch ? headerMatch[1].trim() : currentHeader;
    
    if (trimmed.length >= minSize) {
      if (buffer) parents.push({ text: buffer, header: currentHeader });
      parents.push({ text: trimmed, header: sectionHeader });
      buffer = "";
      currentHeader = sectionHeader;
    } else if (buffer.length + trimmed.length < minSize) {
      buffer += (buffer ? "\n\n" : "") + trimmed;
    } else {
      if (buffer) parents.push({ text: buffer, header: currentHeader });
      buffer = trimmed;
      currentHeader = sectionHeader;
    }
  }
  if (buffer) parents.push({ text: buffer, header: currentHeader });
  return parents;
}

function findChildEnd(text: string, start: number, size: number): number {
  let end = start + size;
  if (end < text.length) {
    const nextBreak = text.slice(end, end + 50).search(/[\n.]/);
    if (nextBreak !== -1) end += nextBreak + 1;
  }
  return end;
}
