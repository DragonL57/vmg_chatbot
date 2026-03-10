export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
}
