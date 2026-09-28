import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../server.js";

describe("Storage API", () => {
  it("GET /api/storage/conversations returns projects and chats", async () => {
    const res = await request(app).get("/api/storage/conversations");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.projects)).toBe(true);
    expect(Array.isArray(res.body.chats)).toBe(true);
    expect(res.body.projects.length).toBeGreaterThanOrEqual(1);
  });

  it("POST /api/storage/sync saves projects and chats and returns count", async () => {
    const getRes = await request(app).get("/api/storage/conversations");
    const initialProjects = getRes.body.projects;
    const initialChats = getRes.body.chats;

    const res = await request(app)
      .post("/api/storage/sync")
      .send({
        projects: initialProjects,
        chats: initialChats,
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.count.projects).toBe(initialProjects.length);
    expect(res.body.count.chats).toBe(initialChats.length);
  });

  it("POST /api/storage/sync rejects invalid payloads", async () => {
    const res = await request(app)
      .post("/api/storage/sync")
      .send({
        projects: "not an array",
      });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });
});
