import type { Product } from "@/lib/types";
import {
  UPDATE_IMPORT_EXAMPLE_ROWS,
  indexProductsByCode,
  prepareUpdateImport,
} from "@/lib/products/import-update";

function product(overrides: Partial<Product> & { id: string }): Product {
  return {
    name: "Product",
    sku: "SKU",
    barcode: "SKU",
    price_cents: 1000,
    tax_rate: 0,
    stock_quantity: 0,
    ...overrides,
  } as Product;
}

const CATALOGUE: Product[] = [
  product({ id: "1", name: "One", sku: "PROD-001", barcode: "PROD-001" }),
  product({ id: "2", name: "Two", sku: "PROD-002", barcode: "8710000000029" }),
];

function gridFrom(rows: string[][]): string[][] {
  return rows.map((row) => [...row]);
}

describe("prepareUpdateImport", () => {
  it("matches the example sheet against the catalogue", () => {
    const prepared = prepareUpdateImport(gridFrom(UPDATE_IMPORT_EXAMPLE_ROWS), {
      products: CATALOGUE,
    });

    expect(prepared.errors).toEqual([]);
    expect(prepared.unknownColumns).toEqual([]);
    expect(prepared.updates).toEqual([
      {
        row: 2,
        productId: "1",
        productName: "One",
        code: "PROD-001",
        costCents: 1050,
        priceCents: 1999,
      },
      {
        row: 3,
        productId: "2",
        productName: "Two",
        code: "PROD-002",
        costCents: 525,
        priceCents: 1250,
      },
    ]);
    /* PROD-003 is not in the catalogue — skipped, not rejected. */
    expect(prepared.skipped).toEqual([{ row: 4, code: "PROD-003" }]);
  });

  it("matches a barcode as well as a SKU, case-insensitively", () => {
    const prepared = prepareUpdateImport(
      gridFrom([
        ["code", "cost", "retail_price"],
        ["8710000000029", "1.00", "2.00"],
        ["prod-001", "3.00", "4.00"],
      ]),
      { products: CATALOGUE },
    );

    expect(prepared.updates.map((update) => update.productId)).toEqual([
      "2",
      "1",
    ]);
    expect(prepared.skipped).toEqual([]);
  });

  it("accepts header spellings and reports unknown columns", () => {
    const prepared = prepareUpdateImport(
      gridFrom([
        ["SKU", "Cost Price", "Selling Price", "notes"],
        ["PROD-001", "$1.50", "2.50", "ignored"],
      ]),
      { products: CATALOGUE },
    );

    expect(prepared.unknownColumns).toEqual(["notes"]);
    expect(prepared.updates[0]).toMatchObject({
      productId: "1",
      costCents: 150,
      priceCents: 250,
    });
  });

  it("rejects the row when a column is missing entirely", () => {
    const prepared = prepareUpdateImport(
      gridFrom([
        ["code", "cost"],
        ["PROD-001", "1.00"],
      ]),
      { products: CATALOGUE },
    );

    expect(prepared.updates).toEqual([]);
    expect(prepared.errors).toEqual([
      { row: 1, message: "Missing required column(s): retail_price" },
    ]);
  });

  it("rejects unreadable, negative and duplicated rows", () => {
    const prepared = prepareUpdateImport(
      gridFrom([
        ["code", "cost", "retail_price"],
        ["PROD-001", "abc", "2.00"],
        ["PROD-002", "1.00", "-2.00"],
        ["", "1.00", "2.00"],
        ["PROD-002", "1.00", "2.00"],
        ["PROD-002", "1.00", "3.00"],
      ]),
      { products: CATALOGUE },
    );

    expect(prepared.errors.map((error) => error.row)).toEqual([2, 3, 4, 6]);
    expect(prepared.errors[0].message).toBe("cost is not a number");
    expect(prepared.errors[1].message).toBe("retail_price cannot be negative");
    expect(prepared.errors[3].message).toContain("appears twice");
    /* Only the first PROD-002 row that parsed cleanly survives. */
    expect(prepared.updates).toHaveLength(1);
    expect(prepared.updates[0].priceCents).toBe(200);
  });

  it("ignores blank rows and reports an empty file", () => {
    const prepared = prepareUpdateImport(
      gridFrom([
        ["code", "cost", "retail_price"],
        ["", "", ""],
      ]),
      { products: CATALOGUE },
    );
    expect(prepared.updates).toEqual([]);
    expect(prepared.errors).toEqual([]);

    expect(prepareUpdateImport([], { products: CATALOGUE }).errors).toEqual([
      { row: 1, message: "The file is empty" },
    ]);
  });
});

describe("indexProductsByCode", () => {
  it("keeps the first product for a code shared by two rows", () => {
    const byCode = indexProductsByCode([
      product({ id: "1", sku: "DUP", barcode: "DUP" }),
      product({ id: "2", sku: "dup", barcode: "OTHER" }),
    ]);

    expect(byCode.get("dup")?.id).toBe("1");
    expect(byCode.get("other")?.id).toBe("2");
  });
});
