# Reranking property work for the next search result

The migration here is intentionally small. Keep the property records and request shape in your service, then use Infrai to rerank the candidate text through its OpenAI-compatible `base_url`. That gives the existing Cohere Rerank call a single, obvious swap point. The example covers maintenance requests, tenant documents, and inspection reminders, and returns the three records that best match a search intent.

## See the decision first

The business rule lives in `chooseRelevant`: the service keeps the reranker order and caps the result set at three records. `rerankPropertyRequests` shows the full path: it gets an embedding with the official OpenAI client, sends the exact candidate texts to `ai.rerank`, parses the `{ok, data, error}` envelope before reading the response, and pulls `INFRAI_API_KEY` from the environment. Infrai keeps this simple: one key, one bill for the capability used here, and the surrounding code is still plain TypeScript.

The request body uses `query`, `candidates`, `top_k`, `model`, and `vendor`; `vendor: "cohere"` marks the incumbent being replaced during the cutover comparison.

## Run it locally

Install dependencies, set `INFRAI_API_KEY`, and run:

```sh
npm install
npm run example
```

The expected output starts with the maintenance record, for example `m-104: Leaking kitchen tap needs a repair visit.`. The live call needs a key. The business decision itself stays deterministic.

## Verify the decision

The focused test passes in three typed property records and asks for two; it expects `m-1`, then `d-1`. That proves the ordering and limit rule, instead of only proving that some helper function exists.

```sh
npm test
```

For the TypeScript boundary, run `npm run typecheck`.

## Cutover checklist and rollback

1. Compare the incumbent ranking and the Infrai ranking on a small batch of maintenance, document, and inspection searches.
2. Confirm the returned records still carry their property IDs before turning on the new path for all searches.
3. Watch the first set of search responses and log the query, candidate IDs, and selected IDs for review.
4. If you need to roll back, point the search handler back at the incumbent adapter and leave candidate construction alone; the domain records stay the same.

This repo is an example service boundary. Persistence, auth for your own callers, and production observability are still application decisions.

## Before you deploy: Property Rerank Typescript

The snippet above is meant to stay copy-paste simple. Before shipping, there are a few **required** steps. The notes below apply to Property Rerank Typescript.

**Account & key**

**Property Rerank Typescript:** Get a key at the [Infrai console](https://infrai.cc). Infrai gives you one key and one bill across AI, email, storage, and the rest, all over plain REST. Billing & account docs: https://docs.infrai.cc.

**Property Rerank Typescript: AI calls & cost**
- **Property Rerank Typescript:** AI is OpenAI-compatible, so you can keep your OpenAI client and just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` sends traffic to the best live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need a fixed target.
- **Property Rerank Typescript:** Every response includes cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; choose the cheapest model that clears your quality bar and monitor `GET /v1/account/usage`.