import fs from 'fs';
import path from 'path';
import { indexKnowledgeFile } from '../src/core/services/indexing.service';
import { upsertKnowledgeFile } from '../src/core/services/supabase.service';

async function syncDirectory(dir: string, collectionName: string) {
  if (!fs.existsSync(dir)) return;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      await syncDirectory(fullPath, collectionName);
      continue;
    }

    if (entry.name.endsWith('.md')) {
      console.log(`\n🔄 Syncing: ${entry.name} into ${collectionName}`);
      const content = fs.readFileSync(fullPath, 'utf8');

      try {
        // 1. Create/Update record in Supabase
        const record = await upsertKnowledgeFile({
          filename: entry.name,
          mode: collectionName,
          status: 'indexing'
        });

        // 2. Run the pipeline
        await indexKnowledgeFile(content, entry.name, collectionName, record.id);

        // 3. Mark as completed
        await upsertKnowledgeFile({
          id: record.id,
          filename: entry.name,
          mode: collectionName,
          status: 'completed'
        });
        
        console.log(`✅ Successfully synced ${entry.name}`);
      } catch (err) {
        console.error(`❌ Failed to sync ${entry.name}:`, err instanceof Error ? err.message : err);
      }
    }
  }
}

async function main() {
  console.log('🚀 Starting Knowledge Base Migration/Sync...');
  
  // Define your local folders and their intended collection IDs
  const paths = [
    { dir: 'data/knowledge/esl', mode: 'vmg_docs_wiki' },
    { dir: 'data/knowledge/study-abroad', mode: 'vmg_docs_wiki' },
  ];

  for (const p of paths) {
    console.log(`\n--- Scanning ${p.dir} ---`);
    await syncDirectory(path.resolve(process.cwd(), p.dir), p.mode);
  }

  console.log('\n✨ Migration finished.');
}

main().catch(console.error);
