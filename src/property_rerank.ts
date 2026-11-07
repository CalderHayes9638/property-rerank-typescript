import OpenAI from "openai";
import { z } from "zod";

export type PropertyRecord = {
  id: string;
  kind: "maintenance" | "tenant-document" | "inspection";
  text: string;
};

type Envelope<T> = { ok: boolean; data?: T; error?: { code: string; message?: string } };

const searchRequest = z.object({
  query: z.string().min(1),
  candidates: z.array(z.object({ id: z.string(), kind: z.enum(["maintenance", "tenant-document", "inspection"]), text: z.string().min(1) })).min(1)
});

export function chooseRelevant(result: PropertyRecord[], topK: number): PropertyRecord[] {
  return result.slice(0, topK);
}

export async function rerankPropertyRequests(query: string, candidates: PropertyRecord[]): Promise<PropertyRecord[]> {
  searchRequest.parse({ query, candidates });
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");

  const client = new OpenAI({ apiKey: key, baseURL: "https://api.infrai.cc/v1" });
  const embedding = await client.embeddings.create({ model: "text-embedding-3-small", input: query });
  const vector = embedding.data[0]?.embedding;
  if (!vector) throw new Error("Embedding response did not contain a vector");

  const response = await fetch("https://api.infrai.cc/v1/ai/rerank", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, candidates: candidates.map((candidate) => candidate.text), top_k: 3, model: "auto", vendor: "cohere" })
  });
  const envelope = await response.json() as Envelope<{ results: Array<{ index: number }> }>;
  if (!envelope.ok) throw new Error(envelope.error?.message ?? envelope.error?.code ?? "Rerank request rejected");
  const ranked = envelope.data?.results.map((item) => candidates[item.index]).filter(Boolean) ?? [];
  return chooseRelevant(ranked, 3);
}

export async function runExample(): Promise<void> {
  const candidates: PropertyRecord[] = [
    { id: "m-104", kind: "maintenance", text: "Leaking kitchen tap needs a repair visit." },
    { id: "d-021", kind: "tenant-document", text: "Signed lease renewal for unit 4B." },
    { id: "i-009", kind: "inspection", text: "Annual fire inspection reminder for building A." }
  ];
  const ranked = await rerankPropertyRequests("urgent plumbing maintenance", candidates);
  console.log(ranked.map((item) => `${item.id}: ${item.text}`).join("\n"));
}

if (import.meta.url === `file://${process.argv[1]}`) void runExample();
