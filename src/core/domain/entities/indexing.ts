/** PageIndex-retrieved content passage — a section extracted from a document tree */
export interface DocumentPassage {
  readonly id: string;
  readonly parentId?: string;
  readonly title: string;
  readonly content: string;
  readonly source: string;
  readonly parentContent?: string;
  readonly metadata?: Record<string, unknown>;
  readonly score?: number;
  readonly collection?: string;
}
