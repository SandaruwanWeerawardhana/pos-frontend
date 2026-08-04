import {
  IMPORT_EXAMPLE_ROWS,
  normalizeHeader,
  prepareImport,
} from "@/lib/products/import";
import {
  columnIndexFromRef,
  parseCsv,
  parseSharedStrings,
  parseSheetXml,
} from "@/lib/products/workbook";

const OPTIONS = {
  productType: "standard" as const,
  allowedUnits: ["pc", "kg", "unit"],
  existingCodes: new Set<string>(),
};

function gridFromExample(): string[][] {
  return IMPORT_EXAMPLE_ROWS.map((row) => [...row]);
}

describe("workbook parsing", () => {
  it("reads quoted CSV cells, embedded quotes and blank lines", () => {
    const csv = 'name,code\r\n"Blue, large","T-1"\r\n"He said ""hi""",T-2\r\n\r\n';
    expect(parseCsv(csv)).toEqual([
      ["name", "code"],
      ["Blue, large", "T-1"],
      ['He said "hi"', "T-2"],
    ]);
  });

  it("maps spreadsheet references to column indexes", () => {
    expect(columnIndexFromRef("A1")).toBe(0);
    expect(columnIndexFromRef("Z9")).toBe(25);
    expect(columnIndexFromRef("AA1")).toBe(26);
    expect(columnIndexFromRef("BC12")).toBe(54);
  });

  it("resolves shared strings, inline strings and gaps in a sheet", () => {
    const shared = parseSharedStrings(
      "<sst><si><t>Blue T-Shirt</t></si><si><t>Caf&#233; &amp; Co</t></si></sst>",
    );
    expect(shared).toEqual(["Blue T-Shirt", "Café & Co"]);

    const sheet = `<worksheet><sheetData>
      <row r="1"><c r="A1" t="s"><v>0</v></c><c r="C1" t="inlineStr"><is><t>pc</t></is></c></row>
      <row r="2"><c r="A2" t="s"><v>1</v></c><c r="B2"><v>19.9</v></c></row>
    </sheetData></worksheet>`;

    expect(parseSheetXml(sheet, shared)).toEqual([
      ["Blue T-Shirt", "", "pc"],
      ["Café & Co", "19.9"],
    ]);
  });
});

describe("import mapping", () => {
  it("normalises header spellings", () => {
    expect(normalizeHeader(" Retail Price ")).toBe("retail_price");
    expect(normalizeHeader("sub-category")).toBe("sub_category");
  });

  it("builds products from the example sheet", () => {
    const { products, errors } = prepareImport(gridFromExample(), OPTIONS);

    expect(errors).toEqual([]);
    expect(products).toHaveLength(2);

    const [shirt] = products;
    expect(shirt.name).toBe("Blue T-Shirt");
    expect(shirt.sku).toBe("TSHIRT-BLUE");
    expect(shirt.barcode).toBe("TSHIRT-BLUE");
    expect(shirt.price_cents).toBe(1990);
    expect(shirt.cost_cents).toBe(800);
    expect(shirt.wholesale_price_cents).toBe(1700);
    expect(shirt.min_price_cents).toBe(1500);
    expect(shirt.category).toBe("Apparel");
    expect(shirt.subcategory).toBe("T-Shirts");
    expect(shirt.reorder_level).toBe(5);
    expect(shirt.stock_quantity).toBe(0);
    expect(shirt.product_type).toBe("standard");
  });

  it("carries the chosen product type onto every row", () => {
    const { products } = prepareImport(gridFromExample(), {
      ...OPTIONS,
      productType: "service",
    });
    expect(products.every((product) => product.product_type === "service")).toBe(
      true,
    );
  });

  it("rejects the whole file when a required column is absent", () => {
    const grid = gridFromExample();
    grid[0][6] = "notes";

    const { products, errors } = prepareImport(grid, OPTIONS);
    expect(products).toEqual([]);
    expect(errors[0].message).toContain("Retail price");
  });

  it("rejects a row with an unknown unit and keeps the rest", () => {
    const grid = gridFromExample();
    grid[1][5] = "crate";

    const { products, errors } = prepareImport(grid, OPTIONS);
    expect(products).toHaveLength(1);
    expect(products[0].name).toBe("Coffee Mug");
    expect(errors).toEqual([
      { row: 2, message: 'unit "crate" does not exist yet' },
    ]);
  });

  it("rejects duplicate codes inside the file and against the catalogue", () => {
    const grid = gridFromExample();
    grid[2][1] = "TSHIRT-BLUE";

    const inFile = prepareImport(grid, OPTIONS);
    expect(inFile.products).toHaveLength(1);
    expect(inFile.errors[0].message).toContain("appears twice");

    const existing = prepareImport(gridFromExample(), {
      ...OPTIONS,
      existingCodes: new Set(["tshirt-blue"]),
    });
    expect(existing.products).toHaveLength(1);
    expect(existing.errors[0].message).toContain("already exists");
  });

  it("reports columns it does not understand instead of failing", () => {
    const grid = gridFromExample();
    grid[0].push("colour");
    grid[1].push("blue");

    const { products, unknownColumns } = prepareImport(grid, OPTIONS);
    expect(unknownColumns).toEqual(["colour"]);
    expect(products).toHaveLength(2);
  });
});
