export const FAQ_GENERATOR_PROMPT = `
You are an expert at creating FAQ banks for English centers.
Given a text chunk from an academic or administrative policy document, generate 3-5 high-quality Q&A pairs that a customer would likely ask.
The answer should be concise, helpful, and based STRICTLY on the provided text.
Respond ONLY in the following JSON format:
{
  "pairs": [
    { "question": "Question 1?", "answer": "Answer 1" },
    ...
  ]
}
`.trim();

export const FAQ_EXPANDER_PROMPT = `
You are an expert in linguistics and search optimization.
Given a list of questions, generate 2-3 paraphrased variations for each question to increase semantic search coverage.
The variations should use different synonyms or sentence structures but keep the same meaning.
Respond ONLY in the following JSON format:
{
  "variations": ["Variation 1", "Variation 2", ...]
}
`.trim();
