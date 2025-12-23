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
  [filename: string]: string; // filename -> md5 hash
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

    if (!state[file] || state[file] !== hash) {
      filesToIndex.push(file);
    }
  }

  console.log(`Summary:`);
  console.log(`- To Index (New/Modified): ${filesToIndex.length}`);
  console.log(`- To Remove (Deleted): ${filesToRemove.length}`);

  if (filesToIndex.length === 0 && filesToRemove.length === 0) {
    console.log('Index is up to date.');
    return;
  }

  // 3. Process Removals
  for (const file of filesToRemove) {
    console.log(`Removing embeddings for deleted file: ${file}`);
    await deletePointsForSource(file);
    delete state[file];
    saveState(state);
  }

  // 4. Process Additions/Updates
  for (const file of filesToIndex) {
    console.log(`\nProcessing ${file}...`);
    const content = fs.readFileSync(path.join(DATA_DIR, file), 'utf-8');
    const hash = crypto.createHash('md5').update(content).digest('hex');
    
    // If it's an update, remove old points first
    if (state[file]) {
      console.log(`- Detected update. Removing old embeddings for ${file}...`);
      await deletePointsForSource(file);
    }

    // Indexing Logic (Same as before)
    // 4000 chars chunk size to minimize API calls and handle large tables
    const chunks = ChunkingService.split(content, 4000, 400); 
    console.log(`- Split into ${chunks.length} chunks.`);

    for (const chunk of chunks) {
      // Generate Title
      process.stdout.write('  - Generating title... ');
      const title = await TitleAssignerService.generateTitle(chunk);
      console.log(`"${title}"`);

      // Index Document Chunk
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

      // Generate & Index FAQs
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
            const vectors = await EmbeddingService.embedMany(allQuestions, 'RETRIEVAL_DOCUMENT');
            
            const points = allQuestions.map((q, i) => ({
                id: uuidv4(),
                vector: vectors[i],
                payload: {
                    question: q,
                    answer: chunk,
                    source: file,
                    title: title
                }
            }));

            await qdrant.upsert(COLLECTIONS.FAQS, { points });
            console.log('Done.');
        }
      }

      // Rate limit protection
      console.log('Sleeping for 60s to strictly respect rate limits...');
      await new Promise(resolve => setTimeout(resolve, 60000));
    }

    // Update state after successful processing
    state[file] = hash;
    saveState(state);
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
