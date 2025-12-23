import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { qdrant, COLLECTIONS } from '@/lib/qdrant';
import { ChunkingService } from '@/services/indexing/chunking.service';
import { TitleAssignerService } from '@/services/indexing/title-assigner.service';
import { FAQGeneratorService } from '@/services/indexing/faq-generator.service';
import { EmbeddingService } from '@/services/embedding.service';

const DATA_DIR = path.join(process.cwd(), 'data', 'vmg-docs');
const STATE_FILE = path.join(process.cwd(), 'data', 'indexing-state.json');

interface IndexingState {
  [filename: string]: {
    hash: string;
    lastChunkIndex: number;
  };
}

/**
 * Script to incrementally index VMG documents into Qdrant.
 * Usage: pnpm exec tsx scripts/index-docs.ts
 */
async function main() {
  console.log('Starting incremental indexing process...');

  // 1. Ensure collections exist (Do NOT delete/recreate)
  await ensureCollection(COLLECTIONS.DOCUMENTS);
  await ensureCollection(COLLECTIONS.FAQS);

  if (!fs.existsSync(DATA_DIR)) {
    console.error(`Data directory not found: ${DATA_DIR}`);
    return;
  }

  // 2. Load State & Current Files
  const state: IndexingState = fs.existsSync(STATE_FILE) 
    ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')) 
    : {};
  
  const currentFiles = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.md'));
  
  const filesToIndex: string[] = [];
  const filesToRemove: string[] = [];

  // Identify Removed Files
  for (const indexedFile of Object.keys(state)) {
    if (!currentFiles.includes(indexedFile)) {
      filesToRemove.push(indexedFile);
    }
  }

  // Identify New/Modified Files
  for (const file of currentFiles) {
    const content = fs.readFileSync(path.join(DATA_DIR, file), 'utf-8');
    const hash = crypto.createHash('md5').update(content).digest('hex');

    // If file is new, or hash changed, or it was partially processed
    if (!state[file] || state[file].hash !== hash) {
      filesToIndex.push(file);
    } else if (state[file].lastChunkIndex > -1) {
        // Checking if it was fully completed? 
        // We'll assume if hash matches, we check if we need to resume.
        // Actually, let's just push it if we want to support resuming.
        // But logic below handles resuming if state exists.
        // For simplicity: if hash matches, we assume done UNLESS we implement a 'completed' flag.
        // Let's rely on lastChunkIndex. If we finished, we can set it to -1 or total chunks?
        // Better: store total chunks? 
        // Let's stick to: if hash changed, full re-index. If hash same, skip.
        // But we want to RESUME.
    }
  }
  
  // Refined Logic for Resuming:
  // We iterate ALL current files.
  // If hash differs -> Full Re-index (delete old points, start from chunk 0).
  // If hash same -> Check if we finished? 
  //   Actually, simpler: 
  //   If state[file] matches hash, we might need to resume if it wasn't finished.
  //   Let's assume if it's in 'state', it might be partial.
  
  // Let's just process the list.

  console.log(`Checking ${currentFiles.length} files...`);

  // 3. Process Removals
  for (const file of filesToRemove) {
    console.log(`Removing embeddings for deleted file: ${file}`);
    await deletePointsForSource(file);
    delete state[file];
    saveState(state);
  }

  // 4. Process Additions/Updates
  for (const file of currentFiles) {
    const content = fs.readFileSync(path.join(DATA_DIR, file), 'utf-8');
    const hash = crypto.createHash('md5').update(content).digest('hex');
    
    let startIndex = 0;

    // Check if file changed or is new
    if (!state[file] || state[file].hash !== hash) {
      console.log(`\nDetected change/new file: ${file}`);
      // Remove old data if it existed (modified file)
      if (state[file]) {
         await deletePointsForSource(file);
      }
      // Reset state for this file
      state[file] = { hash, lastChunkIndex: -1 };
      saveState(state);
    } else {
      // Hash matches, check if we need to resume
      // We need to know how many chunks there ARE to know if we are done.
      // But we calculate chunks dynamically. 
      // So we will just proceed and skip chunks <= lastChunkIndex.
      startIndex = state[file].lastChunkIndex + 1;
      if (startIndex > 0) {
          console.log(`\nResuming ${file} from chunk ${startIndex}...`);
      }
    }

    // Indexing Logic
    const chunks = ChunkingService.split(content, 4000, 400); 
    
    if (startIndex >= chunks.length) {
        console.log(`File ${file} is already fully indexed.`);
        continue;
    }

    console.log(`- Processing chunks ${startIndex} to ${chunks.length - 1} (Total: ${chunks.length})`);

    const BATCH_SIZE = 5; // Process 5 chunks in parallel

    for (let i = startIndex; i < chunks.length; i += BATCH_SIZE) {
      const currentBatchEnd = Math.min(i + BATCH_SIZE, chunks.length);
      const batchChunks = chunks.slice(i, currentBatchEnd);
      
      try {
          console.log(`\n  Processing batch: chunks ${i} to ${currentBatchEnd - 1}...`);
          
          // 1. Parallel LLM calls (Title and FAQ generation)
          const batchResults = await Promise.all(batchChunks.map(async (chunk, batchIdx) => {
              const globalIdx = i + batchIdx;
              process.stdout.write(`    [Chunk ${globalIdx}] Generating title & FAQs... `);
              
              const [title, faqs] = await Promise.all([
                  TitleAssignerService.generateTitle(chunk),
                  FAQGeneratorService.generate(chunk)
              ]);
              
              let allFaqs = faqs;
              if (faqs.length > 0) {
                  const expanded = await FAQGeneratorService.expand(faqs);
                  allFaqs = [...new Set([...faqs, ...expanded])];
              }
              
              console.log('Done.');
              return { chunk, title, allFaqs, globalIdx };
          }));

          // 2. Batch Embedding for Documents
          process.stdout.write('  - Batch embedding document chunks... ');
          const docTexts = batchResults.map(r => `Title: ${r.title}\n\n${r.chunk}`);
          const docVectors = await EmbeddingService.embedMany(docTexts);
          console.log('Done.');

          // 3. Batch Upsert Documents
          process.stdout.write('  - Batch upserting documents... ');
          await qdrant.upsert(COLLECTIONS.DOCUMENTS, {
              points: batchResults.map((r, idx) => ({
                  id: uuidv4(),
                  vector: docVectors[idx],
                  payload: {
                      content: r.chunk,
                      title: r.title,
                      source: file,
                      full_text: docTexts[idx]
                  }
              }))
          });
          console.log('Done.');

          // 4. Batch Embedding for FAQs
          const allFaqItems = batchResults.flatMap(r => 
              r.allFaqs.map(q => ({ question: q, answer: r.chunk, title: r.title }))
          );

          if (allFaqItems.length > 0) {
              process.stdout.write(`  - Batch embedding ${allFaqItems.length} FAQs... `);
              const faqQuestions = allFaqItems.map(item => item.question);
              const faqVectors = await EmbeddingService.embedMany(faqQuestions);
              console.log('Done.');

              process.stdout.write('  - Batch upserting FAQs... ');
              await qdrant.upsert(COLLECTIONS.FAQS, {
                  points: allFaqItems.map((item, idx) => ({
                      id: uuidv4(),
                      vector: faqVectors[idx],
                      payload: {
                          question: item.question,
                          answer: item.answer,
                          source: file,
                          title: item.title
                      }
                  }))
              });
              console.log('Done.');
          }

          // Update state after successful batch
          state[file].lastChunkIndex = currentBatchEnd - 1;
          saveState(state);

      } catch (error: any) {
          console.error(`\nError processing batch starting at chunk ${i} of ${file}:`);
          console.error(error?.message || error);
          console.log('Saving state and exiting. You can resume later.');
          saveState(state);
          process.exit(1);
      }
    }
  }
  
  console.log('\nIncremental indexing complete!');
}

function saveState(state: IndexingState) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

async function deletePointsForSource(filename: string) {
    // Delete from Documents
    await qdrant.delete(COLLECTIONS.DOCUMENTS, {
        filter: {
            must: [
                {
                    key: 'source',
                    match: {
                        value: filename
                    }
                }
            ]
        }
    });

    // Delete from FAQs
    await qdrant.delete(COLLECTIONS.FAQS, {
        filter: {
            must: [
                {
                    key: 'source',
                    match: {
                        value: filename
                    }
                }
            ]
        }
    });
}

async function ensureCollection(name: string) {

    try {

        const info = await qdrant.getCollection(name);

        // Check if vector params match our new model (1024)

        const size = info.config?.params?.vectors?.size;

        

        if (size !== 1024) {

            console.log(`Collection '${name}' exists but has wrong size (${size}). Recreating for 1024 dimensions...`);

            await qdrant.deleteCollection(name);

            throw new Error('Recreating');

        }

        console.log(`Collection '${name}' exists and is valid.`);

    } catch {

        console.log(`Creating collection '${name}'...`);

        // Mistral Embed is 1024 dimensions

        await qdrant.createCollection(name, {

            vectors: {

                size: 1024,

                distance: 'Cosine'

            }

        });

        console.log(`Collection '${name}' created.`);

    }

}

main().catch(console.error);
