const mongoose = require("mongoose");
const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");
process.env.JWT_SECRET = "test-only-secret-that-is-long-enough-to-use";
const app = require("../app");
const Task = require("../models/Task");
const User = require("../models/User");

let mongo;
let token;
let userId;

function auth(method, path) {
  return request(app)[method](path).set("Authorization", `Bearer ${token}`);
}

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterEach(async () => {
  await Task.deleteMany({});
  await User.deleteMany({});
});

beforeEach(async () => {
  const { body } = await request(app).post("/api/auth/signup").send({
    name: "Test User",
    email: "test@example.com",
    password: "password123",
  }).expect(201);
  token = body.data.token;
  userId = body.data.user.id;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

const validTask = {
  title: "Finish wireframe",
  description: "Polish the task dashboard",
  scheduledDate: "2026-11-06",
  scheduledTime: "14:30",
  priority: "High",
};

describe("Task API", () => {
  it("creates a task and rejects missing required fields", async () => {
    const created = await auth("post", "/api/tasks").send(validTask).expect(201);
    expect(created.body.data.title).toBe(validTask.title);
    expect(created.body.data.scheduledDate).toContain("2026-11-06");
    const invalid = await auth("post", "/api/tasks").send({ ...validTask, title: "" }).expect(400);
    expect(invalid.body.success).toBe(false);
    await auth("post", "/api/tasks").send({ ...validTask, priority: "Urgent" }).expect(400);
  });

  it("lists, reads, updates, changes status, searches, and deletes tasks", async () => {
    const { body: created } = await auth("post", "/api/tasks").send(validTask).expect(201);
    const id = created.data._id;
    await auth("get", "/api/tasks").expect(200).expect((res) => expect(res.body.data.tasks).toHaveLength(1));
    await auth("get", `/api/tasks/${id}`).expect(200);
    await auth("put", `/api/tasks/${id}`).send({ title: "Updated wireframe" }).expect(200);
    await auth("patch", `/api/tasks/${id}/status`).send({ status: "Completed" }).expect(200);
    await auth("get", "/api/tasks/search?q=updated").expect(200).expect((res) => expect(res.body.data.tasks).toHaveLength(1));
    await auth("delete", `/api/tasks/${id}`).expect(200);
    await auth("get", `/api/tasks/${id}`).expect(404);
  });

  it("rejects malformed identifiers and reports weekly and dashboard counts", async () => {
    await auth("get", "/api/tasks/not-an-id").expect(400);
    await auth("post", "/api/tasks").send(validTask).expect(201);
    await auth("post", "/api/tasks").send({ ...validTask, title: "Another task", status: "Completed" }).expect(201);
    const weekly = await auth("get", "/api/tasks/weekly").expect(200);
    expect(weekly.body.data[0].totalTasks).toBe(2);
    expect(weekly.body.data[0].openTasks).toBe(1);
    expect(weekly.body.data[0].completedTasks).toBe(1);
    const stats = await auth("get", "/api/tasks/stats").expect(200);
    expect(stats.body.data).toMatchObject({ totalTasks: 2, openTasks: 1, completedTasks: 1 });
  });

  it("counts overdue open tasks but not completed tasks", async () => {
    const yesterday = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await auth("post", "/api/tasks").send({ ...validTask, scheduledDate: yesterday, scheduledTime: "00:00" }).expect(201);
    await auth("post", "/api/tasks").send({
      ...validTask,
      title: "Already completed",
      scheduledDate: yesterday,
      scheduledTime: "00:00",
      status: "Completed",
    }).expect(201);
    const stats = await auth("get", "/api/tasks/stats").expect(200);
    expect(stats.body.data).toMatchObject({ totalTasks: 2, openTasks: 1, completedTasks: 1, overdueTasks: 1 });
  });

  it("supports sign-in and profile retrieval without exposing the password", async () => {
    const storedUser = await User.findById(userId).select("+passwordHash");
    expect(storedUser.passwordHash).not.toBe("password123");
    const login = await request(app).post("/api/auth/login").send({
      email: "TEST@example.com",
      password: "password123",
    }).expect(200);
    expect(login.body.data.user).toMatchObject({ id: userId, email: "test@example.com" });
    expect(login.body.data.user.passwordHash).toBeUndefined();
    await request(app).get("/api/auth/me")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .expect(200)
      .expect((res) => expect(res.body.data.user.name).toBe("Test User"));
    await request(app).post("/api/auth/login").send({
      email: "test@example.com",
      password: "wrong-password",
    }).expect(401);
  });

  it("requires authentication and keeps task records private between accounts", async () => {
    await request(app).get("/api/tasks").expect(401);
    const { body: task } = await auth("post", "/api/tasks").send(validTask).expect(201);
    const { body: otherAccount } = await request(app).post("/api/auth/signup").send({
      name: "Another User",
      email: "another@example.com",
      password: "password123",
    }).expect(201);
    await request(app).get("/api/tasks")
      .set("Authorization", `Bearer ${otherAccount.data.token}`)
      .expect(200)
      .expect((res) => expect(res.body.data.tasks).toHaveLength(0));
    await request(app).get(`/api/tasks/${task.data._id}`)
      .set("Authorization", `Bearer ${otherAccount.data.token}`)
      .expect(404);
  });

  it("does not allow task updates to change ownership", async () => {
    const { body: task } = await auth("post", "/api/tasks").send(validTask).expect(201);
    const { body: anotherAccount } = await request(app).post("/api/auth/signup").send({
      name: "Another User",
      email: "another@example.com",
      password: "password123",
    }).expect(201);
    await auth("put", `/api/tasks/${task.data._id}`).send({ owner: anotherAccount.data.user.id }).expect(200);
    await request(app).get(`/api/tasks/${task.data._id}`)
      .set("Authorization", `Bearer ${anotherAccount.data.token}`)
      .expect(404);
  });
});
