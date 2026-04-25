/* eslint-disable ts/method-signature-style, ts/no-explicit-any */

declare global {
  interface Response {
    json(): Promise<any>;
  }
}

export {};
