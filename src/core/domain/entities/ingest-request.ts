export interface IngestRequest {
  storagePath: string;
  filename: string;
  mode: string;
  folder?: string;
  fileId?: string;
}
