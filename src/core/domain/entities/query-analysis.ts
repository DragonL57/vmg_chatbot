export interface QueryAnalysis {
  readonly is_clear: boolean;
  readonly questions: ReadonlyArray<string>;
  readonly clarification_needed?: string;
}
