/** An error the user should see, with the HTTP status to send. */
export class StoreError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export const notFound = (what: string) => new StoreError(404, `${what} not found`);
