/* eslint-disable no-console */
/**
 * PageIndex Experiment — Ingest Script (CLI dev tool)
 * Usage: npx tsx --tsconfig tsconfig.json src/core/pageindex/scripts/ingest.ts <markdown-file>
 */
import 'dotenv/config';
import { readFileSync, writeFileSync } from 'fs';
import { buildTree, serializeTree } from '../build-tree';
import type { ILLMProvider } from '../../../core/application/ports/llm-provider.port';

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('Usage: npx tsx scripts/ingest.ts <markdown-file>');
    process.exit(1);
  }

  const inputPath = args[0];
  const filename = inputPath.split('/').pop() || inputPath;

  console.log(`[ingest] Reading: ${inputPath}`);
  const markdown = readFileSync(inputPath, 'utf-8');
  console.log(`[ingest] Size: ${markdown.length} chars`);

  const apiKey = process.env.INCEPTION_API_KEY;
  if (!apiKey) {
    console.error('INCEPTION_API_KEY not set');
    process.exit(1);
  }

  const model = process.env.INCEPTION_MODEL || 'mercury-2';

  // Inline Inception LLM adapter
  const OpenAI = (await import('openai')).default;
  const client = new OpenAI({ apiKey, baseURL: 'https://api.inceptionlabs.ai/v1' });
  const llm: ILLMProvider = {
    completion: async (params) => {
      const res = await client.chat.completions.create({
        model,
        messages: params.messages.map(m => ({ role: m.role as 'system' | 'user' | 'assistant', content: m.content })),
        temperature: 0,
        response_format: params.jsonMode ? { type: 'json_object' } : undefined,
      });
      return {
        content: res.choices[0]?.message?.content || '',
        usage: {
          prompt_tokens: res.usage?.prompt_tokens || 0,
          completion_tokens: res.usage?.completion_tokens || 0,
          total_tokens: res.usage?.total_tokens || 0,
        },
        model: res.model,
      };
    },
  };

  console.log('[ingest] Building tree...');
  const tree = await buildTree(markdown, filename, llm, { enableSummaries: true });

  console.log(`[ingest] Done: ${tree.totalNodes} nodes, depth ${tree.depth}`);

  const outPath = inputPath.replace(/\.[^.]+$/, '.tree.json');
  const json = serializeTree(tree);
  writeFileSync(outPath, json, 'utf-8');
  console.log(`[ingest] Tree written to: ${outPath} (${json.length} chars)`);

  console.log('\n[ingest] Document title:', tree.documentTitle);
}

main().catch((err) => {
  console.error('[ingest] Fatal:', err);
  process.exit(1);
});
