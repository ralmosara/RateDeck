import { customType } from 'drizzle-orm/pg-core';

/** Postgres `ltree` for account hierarchy paths, e.g. `root.r_12.c_884`. */
export const ltree = customType<{ data: string }>({
  dataType: () => 'ltree',
});

/** Postgres `citext` (case-insensitive text) for emails. */
export const citext = customType<{ data: string }>({
  dataType: () => 'citext',
});

/** Postgres `tstzrange`, transported as its canonical text form `[from,to)`. */
export const tstzrange = customType<{ data: string }>({
  dataType: () => 'tstzrange',
});
