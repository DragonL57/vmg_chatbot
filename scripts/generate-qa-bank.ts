import fs from 'fs';
import path from 'path';
import { ChunkingService } from '@/services/indexing/chunking.service';
import { FAQGeneratorService } from '@/services/indexing/faq-generator.service';

const DATA_DIR = path.join(process.cwd(), 'data', 'vmg-docs');
const OUTPUT_FILE = path.join(process.cwd(), 'data', 'vmg-qa-bank.json');

/**
 * Script to transform raw markdown documents into a clean Q&A bank.
 * This is the "Ask-and-Augment" strategy to improve RAG performance.
 */
async function main() {
  console.log('Starting Q&A Bank Generation...');

  const currentFiles = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.md'));
  let allPairs: { question: string; answer: string; source: string }[] = [];

  // Load existing bank if it exists to avoid duplication or allow resume
  if (fs.existsSync(OUTPUT_FILE)) {
      allPairs = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
      console.log(`Loaded ${allPairs.length} existing pairs.`);
  }

  for (const file of currentFiles) {
    // Skip if we already have pairs for this file (optional: can be more granular)
    if (allPairs.some(p => p.source === file)) {
        console.log(`Skipping ${file} (already processed).`);
        continue;
    }

    console.log(`
Processing file: ${file}`);
    const content = fs.readFileSync(path.join(DATA_DIR, file), 'utf-8');
    
    // Use larger chunks for Q&A generation to provide more context
    const chunks = ChunkingService.split(content, 4000, 400); 
    console.log(`- Split into ${chunks.length} chunks.`);

    for (let i = 0; i < chunks.length; i++) {
        process.stdout.write(`  [Chunk ${i}] Generating Q&A pairs... `);
        try {
            const pairs = await FAQGeneratorService.generate(chunks[i]);
            const pairsWithSource = pairs.map(p => ({ ...p, source: file }));
            allPairs.push(...pairsWithSource);
            console.log(`Added ${pairs.length} pairs.`);

            // Save after each chunk to prevent data loss
            fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allPairs, null, 2));
            
            // Respect rate limits
            // await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
            console.error(`
Error in chunk ${i}:`, error);
        }
    }
  }

  console.log(`
Q&A Bank Generation Complete! Total pairs: ${allPairs.length}`);
  console.log(`Saved to: ${OUTPUT_FILE}`);
}

main().catch(console.error);
