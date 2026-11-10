import { createClient } from "@libsql/client";

let client;
function connection() {
  client ??= createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  return client;
}

function prepare(sql) {
  return {
    bind(...args) {
      const statement = { sql, args };
      return {
        statement,
        async run() { await connection().execute(statement); },
      };
    },
  };
}

export const database = {
  prepare,
};
