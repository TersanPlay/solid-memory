// @vitest-environment node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";

const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "folio-spa-"));
const distDir = path.join(rootDir, "dist");
let app;

beforeAll(() => {
  fs.mkdirSync(distDir, { recursive: true });
  fs.writeFileSync(
    path.join(distDir, "index.html"),
    "<!doctype html><html><body><div id=\"root\">MemoryDoc SPA</div></body></html>",
    "utf8",
  );
  app = createApp({
    prisma: {},
    config: {
      ...loadConfig({ nodeEnv: "production", port: 3002 }),
      rootDir,
    },
  });
});

afterAll(() => {
  fs.rmSync(rootDir, { recursive: true, force: true });
});

describe("fallback de produção da SPA", () => {
  it("entrega o frontend para uma URL profunda de documento", async () => {
    const response = await request(app)
      .get("/documentos/document-1")
      .expect(200)
      .expect("Content-Type", /html/);

    expect(response.text).toContain("MemoryDoc SPA");
  });
});
