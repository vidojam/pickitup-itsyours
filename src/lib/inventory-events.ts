import { EventEmitter } from "node:events";

const globalForInventory = globalThis as unknown as {
  inventoryEmitter?: EventEmitter;
};

export const inventoryEmitter =
  globalForInventory.inventoryEmitter ?? new EventEmitter();

if (!globalForInventory.inventoryEmitter) {
  globalForInventory.inventoryEmitter = inventoryEmitter;
}

export function emitInventoryChange() {
  inventoryEmitter.emit("inventory-change", { at: Date.now() });
}
