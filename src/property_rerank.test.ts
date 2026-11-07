import assert from "node:assert/strict";
import { chooseRelevant, type PropertyRecord } from "./property_rerank.ts";

const records: PropertyRecord[] = [
  { id: "m-1", kind: "maintenance", text: "Pipe repair" },
  { id: "d-1", kind: "tenant-document", text: "Lease" },
  { id: "i-1", kind: "inspection", text: "Inspection" }
];

assert.deepEqual(chooseRelevant(records, 2).map((item) => item.id), ["m-1", "d-1"]);
console.log("property decision test passed");
