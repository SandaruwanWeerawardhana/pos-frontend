import { beforeEach, describe, expect, it } from "vitest";
import type { Product } from "@/lib/types";
import {
  addToCart,
  clearCart,
  createLocalOrder,
  db,
  getCartTotal,
  searchProducts,
  seedProducts,
} from "@/lib/db";

const espresso: Product = {
  id: "p_espresso",
  name: "Espresso",
  sku: "COF-ESP",
  barcode: "1111111111",
  price_cents: 300,
  tax_rate: 0.08,
  stock_quantity: 10,
};

const latte: Product = {
  id: "p_latte",
  name: "Latte",
  sku: "COF-LAT",
  barcode: "2222222222",
  price_cents: 450,
  tax_rate: 0.08,
  stock_quantity: 5,
};

const croissant: Product = {
  id: "p_croissant",
  name: "Croissant",
  sku: "BAK-CRO",
  barcode: "3333333333",
  price_cents: 999,
  tax_rate: 0.08,
  stock_quantity: 2,
};

beforeEach(async () => {
  await Promise.all([
    db.products.clear(),
    db.cartItems.clear(),
    db.pendingOrders.clear(),
    db.syncMeta.clear(),
  ]);
});

describe("searchProducts", () => {
  beforeEach(async () => {
    await seedProducts([espresso, latte, croissant]);
  });

  it("matches a partial name, case-insensitively", async () => {
    const results = await searchProducts("lat");
    expect(results.map((p) => p.id)).toEqual(["p_latte"]);

    const upper = await searchProducts("ESPRE");
    expect(upper.map((p) => p.id)).toEqual(["p_espresso"]);
  });

  it("matches an exact sku", async () => {
    const results = await searchProducts("COF-ESP");
    expect(results.map((p) => p.id)).toEqual(["p_espresso"]);
  });

  it("matches an exact barcode", async () => {
    const results = await searchProducts("2222222222");
    expect(results.map((p) => p.id)).toEqual(["p_latte"]);
  });

  it("returns an empty array when nothing matches", async () => {
    const results = await searchProducts("nonexistent");
    expect(results).toEqual([]);
  });

  it("returns all products for a blank query", async () => {
    const results = await searchProducts("   ");
    expect(results).toHaveLength(3);
  });
});

describe("cart math", () => {
  beforeEach(async () => {
    await seedProducts([espresso, latte, croissant]);
  });

  it("computes subtotal/tax/total in integer cents with per-line rounding", async () => {
    // 999 * 3 * 0.08 = 239.76 -> rounds to 240 for this line alone
    await addToCart(croissant, 3);
    // 450 * 1 * 0.08 = 36 exactly
    await addToCart(latte, 1);

    const total = await getCartTotal();
    expect(total.subtotal_cents).toBe(999 * 3 + 450);
    expect(total.tax_total_cents).toBe(240 + 36);
    expect(total.total_cents).toBe(total.subtotal_cents + total.tax_total_cents);
  });

  it("rounds tax per line rather than on the summed subtotal", async () => {
    // Two lines whose individual tax rounds .5 up to 1, but whose summed
    // pre-rounding tax (0.5 + 0.5 = 1.0) would round to 1 if done on the
    // total instead of per-line - per-line rounding must give 2, not 1.
    const half: Product = {
      id: "p_half",
      name: "Half",
      sku: "HALF",
      barcode: "999999",
      price_cents: 100,
      tax_rate: 0.005,
      stock_quantity: 10,
    };
    await seedProducts([half]);
    await addToCart(half, 1);
    await addToCart(half, 1); // second distinct line via separate add call would merge by product_id, so add a second product instead

    const totalAfterMerge = await getCartTotal();
    // addToCart merges same product_id into one line (qty 2): 100 * 2 * 0.005 = 1 exactly.
    expect(totalAfterMerge.tax_total_cents).toBe(1);

    await clearCart();

    const halfB: Product = { ...half, id: "p_half_b", barcode: "888888" };
    await seedProducts([half, halfB]);
    await addToCart(half, 1);
    await addToCart(halfB, 1);

    const totalTwoLines = await getCartTotal();
    // Two separate lines, each 100 * 1 * 0.005 = 0.5 -> rounds to 1 per line = 2 total.
    expect(totalTwoLines.tax_total_cents).toBe(2);
  });

  it("merges quantity when the same product is added twice", async () => {
    await addToCart(espresso, 1);
    await addToCart(espresso, 2);

    const items = await db.cartItems.toArray();
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(3);
  });
});

describe("createLocalOrder", () => {
  beforeEach(async () => {
    await seedProducts([espresso, latte, croissant]);
  });

  it("creates a pending order, clears the cart, and deducts stock", async () => {
    await addToCart(espresso, 3);

    const order = await createLocalOrder("cash");

    expect(order.sync_status).toBe("pending");
    expect(order.server_id).toBeNull();
    expect(order.client_generated_id).toMatch(
      /^[0-9a-f-]{36}$/i,
    );
    expect(order.total_cents).toBe(order.tax_total_cents + (espresso.price_cents * 3));

    const remainingCartItems = await db.cartItems.toArray();
    expect(remainingCartItems).toHaveLength(0);

    const updatedProduct = await db.products.get(espresso.id);
    expect(updatedProduct?.stock_quantity).toBe(espresso.stock_quantity - 3);

    const storedOrder = await db.pendingOrders.get(order.client_generated_id);
    expect(storedOrder).toBeDefined();
  });

  it("clamps stock at zero instead of going negative when over-ordering", async () => {
    // croissant only has 2 in stock; order 3
    await addToCart(croissant, 3);

    await createLocalOrder("card");

    const updatedProduct = await db.products.get(croissant.id);
    expect(updatedProduct?.stock_quantity).toBe(0);
  });
});
