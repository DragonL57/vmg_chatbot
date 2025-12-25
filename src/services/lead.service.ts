/**
 * Service to handle Lead Generation data (saving to CRM/Sheets).
 * Currently mocks the behavior by logging to console.
 */
export class LeadService {
  /**
   * Saves or updates lead information.
   * In the future, this will call a CRM API or Google Sheets API.
   */
  static async saveLead(data: {
    name?: string | null;
    phone?: string | null;
    childName?: string | null;
    childDob?: string | null;
    address?: string | null;
    notes?: string | null;
    studyAbroadIntent?: string | null;
    targetCountries?: string[] | null;
    educationLevel?: string[] | null;
    admissionTime?: string | null;
    majorOfInterest?: string[] | null;
    sponsor?: string | null;
    budget?: string | null;
  }) {
    // Only proceed if at least one piece of info is present
    const hasData = Object.values(data).some(v => v !== null && v !== undefined);
    if (!hasData) return;

    console.log('--- [MOCK CRM CALL] Saving Lead Info ---');
    console.log('Data:', JSON.stringify(data, null, 2));
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('--- [MOCK CRM CALL] Success ---');
    
    return { success: true };
  }
}
