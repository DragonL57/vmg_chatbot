import { qdrant, COLLECTIONS } from '@/lib/qdrant';

async function checkSources() {
  console.log('Checking unique sources in Qdrant...');

  for (const collection of [COLLECTIONS.DOCUMENTS, COLLECTIONS.FAQS]) {
    console.log(`
Collection: ${collection}`);
    
    // Scroll to get all points (simplified for small collections)
    const response = await qdrant.scroll(collection, {
      limit: 1000,
      with_payload: true,
      with_vector: false,
    });

    const sources = new Set();
    response.points.forEach(p => {
      if (p.payload && p.payload.source) {
        sources.add(p.payload.source);
      } else {
        sources.add('UNKNOWN');
      }
    });

    if (sources.size === 0) {
      console.log(' - No points found.');
    } else {
      console.log(' - Found sources:', Array.from(sources));
    }
  }
}

checkSources().catch(console.error);
