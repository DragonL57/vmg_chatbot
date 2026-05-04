export interface IngestRequest {
  readonly storagePath: string;
  readonly filename: string;
  readonly mode: string;
  readonly folder?: string;
  readonly fileId?: string;
}
