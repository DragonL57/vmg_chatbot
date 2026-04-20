
import { hybridDocumentSearch } from './src/core/services/qdrant.service';
import { config } from 'dotenv';
import path from 'path';

// Load .env.local
config({ path: path.resolve(process.cwd(), '.env.local') });

async function testQuery() {
  const queries = ["KPI và Thưởng", "chính sách thưởng du học hè", "chỉ tiêu du học hè 2026"];
  const collection = "vmg_docs_du_hoc";

  for (const q of queries) {
    console.log(`\n--- Testing Query: "${q}" ---`);
    try {
      const results = await hybridDocumentSearch(q, collection, 5);
      if (results.length === 0) {
        console.log("No results found.");
      } else {
        results.forEach((r, i) => {
          console.log(`[${i + 1}] Score: ${r.score.toFixed(4)} | Title: ${r.payload.title}`);
          console.log(`    Content Snippet: ${String(r.payload.content).slice(0, 100)}...`);
        });
      }
    } catch (err) {
      console.error("Error during query:", err);
    }
  }
}

testQuery();
