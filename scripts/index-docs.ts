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
  
  // 2b. Sync with Qdrant to find "ghost" embeddings (files deleted but not in state)
  process.stdout.write('Syncing with Qdrant to detect ghost embeddings... ');
  const ghostSources = new Set<string>();
  for (const collection of [COLLECTIONS.DOCUMENTS, COLLECTIONS.FAQS]) {
      const response = await qdrant.scroll(collection, { limit: 500, with_payload: true });
      response.points.forEach(p => {
          const src = p.payload?.source as string;
          if (src && !currentFiles.includes(src)) {
              ghostSources.add(src);
          }
      });
  }
  console.log(ghostSources.size > 0 ? `Found ${ghostSources.size} ghost sources.` : 'Clean.');

  const filesToRemove = new Set<string>(ghostSources);

  // Identify Removed Files from State
  for (const indexedFile of Object.keys(state)) {
    if (!currentFiles.includes(indexedFile)) {
      filesToRemove.add(indexedFile);
    }
  }

  console.log(`Checking ${currentFiles.length} local files...`);

  // 3. Process Removals
  if (filesToRemove.size > 0) {
    console.log(`\nDetected ${filesToRemove.size} source(s) to remove. Cleaning up...`);
    for (const file of filesToRemove) {
      process.stdout.write(`- Removing embeddings for: ${file}... `);
      await deletePointsForSource(file);
      if (state[file]) delete state[file];
      saveState(state);
      console.log('Done.');
    }
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
              process.stdout.write(`    [Chunk ${globalIdx}] Generating title & Q&A pairs... `);
              
              const [title, pairs] = await Promise.all([
                  TitleAssignerService.generateTitle(chunk),
                  FAQGeneratorService.generate(chunk)
              ]);
              
              const allQAPairs = [...pairs];
              
              // Still expand questions for better vector coverage
              if (pairs.length > 0) {
                  const questions = pairs.map(p => p.question);
                  const expanded = await FAQGeneratorService.expand(questions);
                  expanded.forEach(v => {
                      // Map variation to the same answer as the original
                      // For simplicity, we just pick the first answer in the batch or match index?
                      // Actually, better to just push variations with the chunk as answer.
                      allQAPairs.push({ question: v, answer: chunk });
                  });
              }
              
              console.log('Done.');
              return { chunk, title, allQAPairs, globalIdx };
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
              r.allQAPairs.map(p => ({ question: p.question, answer: p.answer, title: r.title }))
          );

          if (allFaqItems.length > 0) {
              process.stdout.write(`  - Batch embedding ${allFaqItems.length} Q&A pairs... `);
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

      } catch (error: unknown) {
          const err = error as Error;
          console.error(`\nError processing batch starting at chunk ${i} of ${file}:`);
          console.error(err?.message || err);
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
        const size = info.config?.params?.vectors?.size;

        if (size !== 1024) {
            console.log(`Collection '${name}' exists but has wrong size (${size}). Recreating for 1024 dimensions...`);
            await qdrant.deleteCollection(name);
            throw new Error('Recreating');
        }

        console.log(`Collection '${name}' exists and is valid.`);
        
        // Ensure index exists for 'source' field
        const indexes = await qdrant.getCollection(name).then(res => res.payload_schema || {});
        if (!indexes['source']) {
            console.log(`Creating missing payload index for 'source' in '${name}'...`);
            await qdrant.createPayloadIndex(name, {
                field_name: 'source',
                field_schema: 'keyword'
            });
        }

    } catch (err: unknown) {
        const error = err as { message?: string; status?: number };
        if (error.message === 'Recreating' || error.status === 404) {
            console.log(`Creating collection '${name}'...`);
            await qdrant.createCollection(name, {
                vectors: { size: 1024, distance: 'Cosine' }
            });
            console.log(`Collection '${name}' created.`);
            
            console.log(`Creating payload index for 'source' in '${name}'...`);
            await qdrant.createPayloadIndex(name, {
                field_name: 'source',
                field_schema: 'keyword'
            });
        } else {
            throw err;
        }
    }
}

main().catch(console.error);
