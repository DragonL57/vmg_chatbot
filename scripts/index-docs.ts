import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { qdrant, COLLECTIONS } from '@/lib/qdrant';
import { ChunkingService } from '@/services/indexing/chunking.service';
import { TitleAssignerService } from '@/services/indexing/title-assigner.service';
import { FAQGeneratorService } from '@/services/indexing/faq-generator.service';
import { EmbeddingService } from '@/services/embedding.service';

/**
 * Script to index VMG documents into Qdrant.
 * Usage: pnpm exec tsx scripts/index-docs.ts
 */
async function main() {
  console.log('Starting indexing process...');

  // 1. Ensure collections exist
  await ensureCollection(COLLECTIONS.DOCUMENTS);
  await ensureCollection(COLLECTIONS.FAQS);

  // 2. Read files
  const dataDir = path.join(process.cwd(), 'data', 'vmg-docs');
  if (!fs.existsSync(dataDir)) {
    console.error(`Data directory not found: ${dataDir}`);
    return;
  }
  
  const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.md'));
  console.log(`Found ${files.length} documents.`);

  for (const file of files) {
    console.log(`\nProcessing ${file}...`);
    const content = fs.readFileSync(path.join(dataDir, file), 'utf-8');
    
    // 3. Chunk
    // 500 chars chunk size for more granular retrieval in MVP
    const chunks = ChunkingService.split(content, 500, 100); 
    console.log(`- Split into ${chunks.length} chunks.`);

    for (const chunk of chunks) {
      // 4. Generate Title
      process.stdout.write('  - Generating title... ');
      const title = await TitleAssignerService.generateTitle(chunk);
      console.log(`"${title}"`);

      // 5. Index Document Chunk
      const docText = `Title: ${title}\n\n${chunk}`;
      process.stdout.write('  - Embedding chunk... ');
      const docEmbedding = await EmbeddingService.embed(docText, 'RETRIEVAL_DOCUMENT');
      console.log('Done.');
      
      await qdrant.upsert(COLLECTIONS.DOCUMENTS, {
        points: [{
          id: uuidv4(),
          vector: docEmbedding,
          payload: {
            content: chunk,
            title: title,
            source: file,
            full_text: docText
          }
        }]
      });

      // 6. Generate & Index FAQs
      process.stdout.write('  - Generating FAQs... ');
      const faqs = await FAQGeneratorService.generate(chunk);
      console.log(`Found ${faqs.length}.`);

      if (faqs.length > 0) {
        process.stdout.write('  - Expanding FAQs... ');
        const expanded = await FAQGeneratorService.expand(faqs);
        console.log(`Expanded to ${expanded.length}.`);

        const allQuestions = [...new Set([...faqs, ...expanded])];
        
        if (allQuestions.length > 0) {
            process.stdout.write(`  - Indexing ${allQuestions.length} FAQs... `);
            // Embed all questions in batch
            const vectors = await EmbeddingService.embedMany(allQuestions, 'RETRIEVAL_DOCUMENT');
            
            const points = allQuestions.map((q, i) => ({
                id: uuidv4(),
                vector: vectors[i],
                payload: {
                    question: q,
                    answer: chunk, // The chunk acts as the answer context
                    source: file,
                    title: title
                }
            }));

            await qdrant.upsert(COLLECTIONS.FAQS, { points });
            console.log('Done.');
        }
      }
    }
  }
  
  console.log('\nIndexing complete!');
}

async function ensureCollection(name: string) {
    try {
        await qdrant.getCollection(name);
        console.log(`Collection '${name}' exists.`);
    } catch {
        console.log(`Creating collection '${name}'...`);
        // Gemini embedding-001 is 768 dimensions
        await qdrant.createCollection(name, {
            vectors: {
                size: 768,
                distance: 'Cosine'
            }
        });
        console.log(`Collection '${name}' created.`);
    }
}

main().catch(console.error);
