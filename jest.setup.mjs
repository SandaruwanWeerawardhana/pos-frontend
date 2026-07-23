import { deserialize, serialize } from "node:v8";
import "fake-indexeddb/auto";
import "@testing-library/jest-dom";

// jsdom's test environment doesn't expose Node's structuredClone global.
if (typeof globalThis.structuredClone !== "function") {
  globalThis.structuredClone = (value) => deserialize(serialize(value));
}
