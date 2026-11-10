import { handleRequest } from "../worker.mjs";
import { database } from "../lib/database.mjs";
import directory from "../directory.json" with { type: "json" };

export default {
  fetch(request) {
    return handleRequest(request, { DB: database }, {}, directory);
  },
};
