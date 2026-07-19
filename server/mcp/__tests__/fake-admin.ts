/**
 * Minimal in-memory fake of the Supabase query builder surface used by the
 * MCP canonical tools. Supports select/eq/neq/in/order/limit and both
 * `.maybeSingle()` / `.single()` terminals and awaiting the chain directly
 * (which real supabase-js query builders also support).
 */
type Row = Record<string, unknown>;
type Filter = { col: string; op: "eq" | "neq" | "in"; value: unknown };

function matches(row: Row, filters: Filter[]): boolean {
  return filters.every((f) => {
    if (f.op === "eq") return row[f.col] === f.value;
    if (f.op === "neq") return row[f.col] !== f.value;
    if (f.op === "in") return Array.isArray(f.value) && (f.value as unknown[]).includes(row[f.col]);
    return true;
  });
}

class FakeQuery implements PromiseLike<{ data: Row[] | null; error: { message: string } | null }> {
  private filters: Filter[] = [];
  private orderCol?: string;
  private ascending = true;
  private limitN?: number;
  private errorToReturn: { message: string } | null = null;

  constructor(private rows: Row[]) {}

  select() {
    return this;
  }
  eq(col: string, value: unknown) {
    this.filters.push({ col, op: "eq", value });
    return this;
  }
  neq(col: string, value: unknown) {
    this.filters.push({ col, op: "neq", value });
    return this;
  }
  in(col: string, value: unknown[]) {
    this.filters.push({ col, op: "in", value });
    return this;
  }
  is(col: string, value: unknown) {
    this.filters.push({ col, op: "eq", value: value === null ? null : value });
    return this;
  }
  order(col: string, opts?: { ascending?: boolean }) {
    this.orderCol = col;
    this.ascending = opts?.ascending ?? true;
    return this;
  }
  limit(n: number) {
    this.limitN = n;
    return this;
  }

  private resolveRows(): Row[] {
    let result = this.rows.filter((r) => matches(r, this.filters));
    if (this.orderCol) {
      const col = this.orderCol;
      result = [...result].sort((a, b) => {
        const av = a[col] as string | number;
        const bv = b[col] as string | number;
        if (av < bv) return this.ascending ? -1 : 1;
        if (av > bv) return this.ascending ? 1 : -1;
        return 0;
      });
    }
    if (this.limitN != null) result = result.slice(0, this.limitN);
    return result;
  }

  async maybeSingle() {
    if (this.errorToReturn) return { data: null, error: this.errorToReturn };
    const rows = this.resolveRows();
    return { data: rows[0] ?? null, error: null };
  }

  async single() {
    if (this.errorToReturn) return { data: null, error: this.errorToReturn };
    const rows = this.resolveRows();
    return { data: rows[0] ?? null, error: rows[0] ? null : { message: "not found" } };
  }

  then<TResult1 = { data: Row[] | null; error: { message: string } | null }, TResult2 = never>(
    onfulfilled?:
      | ((value: { data: Row[] | null; error: { message: string } | null }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    const payload = this.errorToReturn
      ? { data: null, error: this.errorToReturn }
      : { data: this.resolveRows(), error: null };
    return Promise.resolve(payload).then(onfulfilled, onrejected);
  }
}

export type FakeTables = Record<string, Row[]>;

export function createFakeAdmin(tables: FakeTables) {
  return {
    from(table: string) {
      return new FakeQuery(tables[table] ?? []);
    },
  };
}
