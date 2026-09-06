export const createJsonResponse = (
  body: unknown,
  init?: ResponseInit,
): Response => Response.json(body, init);
