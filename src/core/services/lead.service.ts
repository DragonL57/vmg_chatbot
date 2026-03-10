/**
 * Service to handle Lead Generation data (saving to CRM/Sheets).
 * Currently mocks the behavior by logging to console.
 */
export class LeadService {
  /**
   * Saves or updates lead information.
   * In the future, this will call a CRM API or Google Sheets API.
   */
  static async saveLead(data: Record<string, unknown>) {
    // Filter out null, undefined, or empty values for logging
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([, v]) => 
        v !== null && v !== undefined && v !== '' && (!Array.isArray(v) || v.length > 0)
      )
    );

    if (Object.keys(cleanData).length === 0) return;

    console.log('--- [MOCK CRM CALL] Saving Lead Info ---');
    console.log('Data:', JSON.stringify(cleanData, null, 2));
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('--- [MOCK CRM CALL] Success ---');
    
    return { success: true };
  }
}
