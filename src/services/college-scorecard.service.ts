import { env } from '@/env';

export interface CollegeScorecardResult {
  id: number;
  'school.name': string;
  'school.city': string;
  'school.state': string;
  'latest.student.size'?: number;
  'latest.cost.tuition.out_of_state'?: number;
  'latest.admissions.admission_rate.overall'?: number;
  [key: string]: unknown;
}

export class CollegeScorecardService {
  private static readonly BASE_URL = 'https://api.data.gov/ed/collegescorecard/v1/schools';

  /**
   * Searches for schools based on various parameters.
   * @param params - API query parameters (e.g., school.name, school.state)
   * @param fields - Comma-separated list of fields to return
   */
  static async searchSchools(params: Record<string, string | null | undefined>, fields: string[] = [
    'id', 
    'school.name', 
    'school.city', 
    'school.state', 
    'latest.student.size',
    'latest.cost.tuition.out_of_state',
    'latest.admissions.admission_rate.overall'
  ]): Promise<CollegeScorecardResult[]> {
    try {
      // Filter out null/undefined parameters
      const cleanParams: Record<string, string> = {};
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          cleanParams[key] = String(value);
        }
      });

      const queryParams = new URLSearchParams({
        api_key: env.COLLEGE_SCORECARD_API_KEY,
        ...cleanParams,
        fields: fields.join(','),
        keys_nested: 'true', // Return nested JSON objects
      });

      const url = `${this.BASE_URL}?${queryParams.toString()}`;
      console.log(`--- Requesting College Scorecard: ${url.replace(env.COLLEGE_SCORECARD_API_KEY, 'REDACTED')} ---`);

      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('College Scorecard API Error:', errorData);
        return [];
      }

      const data = await response.json();
      const results = (data.results || []).slice(0, 10);
      console.log(`--- College Scorecard: Found ${results.length} schools ---`);
      if (results.length > 0) {
        console.log('API Sample Result:', JSON.stringify(results[0], null, 2));
      }
      return results;
    } catch (error) {
      console.error('Failed to fetch from College Scorecard:', error);
      return [];
    }
  }

  /**
   * Convenience method to search for a school by name.
   */
  static async findByName(name: string): Promise<CollegeScorecardResult[]> {
    return this.searchSchools({ 'school.name': name }, [
      'id', 
      'school.name', 
      'school.city', 
      'school.state', 
      'latest.cost.tuition.out_of_state',
      'latest.admissions.admission_rate.overall',
      'latest.student.size'
    ]);
  }
}
