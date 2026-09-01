import request from "supertest";

import serverModule from "../server.js";

import {
  describe,
  expect,
  it,
} from "vitest";

const {
  app,
} = serverModule;

describe(
  "CORS security",
  () => {
    it(
      "allows the local frontend origin",
      async () => {
        const response =
          await request(app)
            .options(
              "/api/chat"
            )
            .set(
              "Origin",
              "http://localhost:5173"
            )
            .set(
              "Access-Control-Request-Method",
              "POST"
            );

        expect(
          response.headers[
            "access-control-allow-origin"
          ]
        ).toBe(
          "http://localhost:5173"
        );
      }
    );

    it(
      "does not allow an external website origin",
      async () => {
        const response =
          await request(app)
            .options(
              "/api/chat"
            )
            .set(
              "Origin",
              "https://evil-example.com"
            )
            .set(
              "Access-Control-Request-Method",
              "POST"
            );

        expect(
          response.headers[
            "access-control-allow-origin"
          ]
        ).toBeUndefined();
      }
    );
  }
);