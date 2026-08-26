import { env } from "../env.js";
import { createMockProvider } from "./mock.js";
import { createPluggyProvider } from "./pluggy.js";
import type { BankDataProvider } from "./types.js";

export const provider: BankDataProvider =
  env.DATA_PROVIDER === "pluggy" ? createPluggyProvider() : createMockProvider();

export { MOCK_ITEM_IDS } from "./mock.js";
export type { BankDataProvider } from "./types.js";
