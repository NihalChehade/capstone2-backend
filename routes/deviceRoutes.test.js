const request = require("supertest");
const app = require("../app"); 
const db = require("../db");
const Device = require("../models/deviceModel");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  u2Token
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

describe("POST /devices", function () {
  test("Can create a new device if logged in with serial_number", async function () {
    const resp = await request(app)
      .post("/devices")
      .set("authorization", `Bearer ${u1Token}`)
      .send({
        serial_number: "SN123456",
        name: "NewLight",
        room: "Office",
        type: "Light",
        status: "off"
      });
      

    expect(resp.statusCode).toBe(201);
    expect(resp.body).toEqual({
      device: {
        serial_number: "SN123456",
        name: "NewLight",
        room: "Office",
        type: "Light",
        status: "off",
        brightness: 0,
        color: "white",
        username: "u1"
      }
    });
  });

  test("Unauthenticated users cannot create devices", async function () {
    const resp = await request(app)
      .post("/devices")
      .send({
        serial_number: "SN123456",
        name: "NewLight",
        room: "Office",
        type: "Light",
        status: "off",
        brightness: 50,
        color: "white"
      });
    expect(resp.statusCode).toBe(401);
  });
});


describe("GET /devices/:name", function () {
  test("Can retrieve a device by name if logged in", async function () {
    const resp = await request(app)
      .get("/devices/KitchenLight")
      .set("authorization", `Bearer ${u1Token}`);
     

    expect(resp.statusCode).toBe(200);
    expect(resp.body.device).toEqual({
      serial_number:"123",
      name: "KitchenLight",
      room: "Kitchen",
      type: "Light",
      status: "off",
      brightness: 50,
      color: "white",
      username: "u1"
    });
  });

  test("Unauthenticated users cannot fetch devices", async function () {
    const resp = await request(app)
      .get("/devices/KitchenLight");
    expect(resp.statusCode).toBe(401);
  });
});

describe("PATCH /devices/:name/rename", function () {
  test("Can update a device's name if logged in", async function () {
    const resp = await request(app)
      .patch("/devices/KitchenLight/rename")
      .send({
        name: "UpdatedLight"
      })
      .set("authorization", `Bearer ${u1Token}`);

    expect(resp.statusCode).toBe(200);
    expect(resp.body.device).toEqual(
       {
        serial_number:"123",
        name: "UpdatedLight",
        room: "Kitchen",
        type: "Light",
        status: "off",
        brightness: 50,
        color: "white",
        username: "u1"
      }
    );
  });

  test("Unauthenticated users cannot update device names", async function () {
    const resp = await request(app)
      .patch("/devices/KitchenLight/rename")
      .send({
        name: "UpdatedLight"
      });
    expect(resp.statusCode).toBe(401);
  });
});

describe("GET /devices", function () {
  test("Can retrieve all devices for a logged-in user", async function () {
    const resp = await request(app)
      .get("/devices")
      .set("authorization", `Bearer ${u1Token}`);

    expect(resp.statusCode).toBe(200);
    expect(resp.body.devices).toEqual(
       [
        {
          serial_number:"123",
          name: "KitchenLight",
          room: "Kitchen",
          type: "Light",
          status: "off",
          brightness: 50,
          color: "white",
          username: "u1"
        },
        {
          serial_number:"456",
          name: "BedroomLight",
          room: "Bedroom",
          type: "Light",
          status: "on",
          brightness: 75,
          color: "blue",
          username: "u1"
        }
      ]);
  });

  test("Unauthenticated users cannot list devices", async function () {
    const resp = await request(app)
      .get("/devices");
    expect(resp.statusCode).toBe(401);
  });
});
