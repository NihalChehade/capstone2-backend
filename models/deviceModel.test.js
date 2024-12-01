"use strict";

const {
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
} = require("../expressError");
const db = require("../db.js");
const Device = require("./deviceModel.js");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

describe("Device Model Tests", () => {
  describe("create", () => {
    const newDevice = {
      serial_number: "152",
      name: "new device",
      type: "light",
      status: "off",
      username: "u1",
      room:""
    };
    test("creates a new light successfully", async () => {
      const light = await Device.create(newDevice);
      expect(light).toEqual({
        serial_number: "152",
        name: "new device",
        type: "light",
        status: "off",
        username: "u1",
        room: "",
        brightness: 0,
        color: "white",
      });
    });

    test("fails to create a light with an existing serial number", async () => {
      await expect(
        Device.create({
          serial_number: "123", // Already exists in commonBeforeAll setup
          name: "NewLight",
          room: "Office",
          type: "Light",
          status: "on",
          username: "u1",
          brightness: 80,
          color: "white",
        })
      ).rejects.toThrow("duplicate key value violates unique constraint");
    });
  });

  describe("updateDeviceName", () => {
    test("throws NotFoundError if the original device is not found", async () => {
      await expect(Device.updateDeviceName("nonExistentDeviceName", "newDeviceName", "u1"))
        .rejects
        .toThrowError(NotFoundError);
      await expect(Device.updateDeviceName("nonExistentDeviceName", "newDeviceName", "u1"))
        .rejects
        .toThrowError("No device found with the provided name.");
    });
  
    test("throws BadRequestError if the new name is already in use by another device", async () => {
      // Ensure 'BedroomLight' exists and 'KitchenLight' is used as the new name (assuming 'KitchenLight' also exists).
      await expect(Device.updateDeviceName("BedroomLight", "KitchenLight", "u1"))
        .rejects
        .toThrowError(BadRequestError);
      await expect(Device.updateDeviceName("BedroomLight", "KitchenLight", "u1"))
        .rejects
        .toThrowError("Another device with the same name already exists.");
    });
  
    test("successfully updates the device name when conditions are met", async () => {
      // Assuming initial setup ensures 'KitchenLight' and 'BedroomLight' exist and are unique.
      const updatedDevice = await Device.updateDeviceName("BedroomLight", "NewBedroomLight", "u1");
      expect(updatedDevice.name).toEqual("NewBedroomLight");
    });
  });
  

  describe("updateADevice", () => {
    test("updates light status and brightness successfully", async () => {
      const updatedLight = await Device.updateADevice(
        "KitchenLight",
        { status: "on", brightness: 90 },
        "u1"
      );
      expect(updatedLight.status).toEqual("on");
      expect(updatedLight.brightness).toEqual(90);
    });

    test("fails to update a non-existent light", async () => {
      await expect(
        Device.updateADevice("NonexistentLight", { status: "on" }, "u1")
      ).rejects.toThrow("No device found with the provided name.");
    });

    test("fails with no update fields provided", async () => {
      await expect(
        Device.updateADevice("KitchenLight", {}, "u1")
      ).rejects.toThrow("No data provided to update");
    });
  });

  describe("updateMany", () => {
    test("updates multiple lights in a specific room", async () => {
      const results = await Device.updateMany("u1", "Kitchen", {
        status: "on",
        brightness: 100,
      });
      expect(
        results.every((d) => d.status === "on" && d.brightness === 100)
      ).toBe(true);
    });

    test("updates fail when no lights match criteria", async () => {
      const results = await Device.updateMany("u1", "NonexistentRoom", {
        status: "on",
      });
      expect(results.length).toBe(0);
    });
  });

  describe("remove", () => {
    test("removes a light successfully", async () => {
      const deleted = await Device.remove("BedroomLight", "u1");
      expect(deleted.name).toEqual("BedroomLight");
    });
  });

  describe("findAllByUserName", () => {
    test("finds all devices by a specific user", async () => {
      const username = "u1";
      const devices = [
        {
          serial_number: "123",
          name: "KitchenLight",
          room: "Kitchen",
          type: "Light",
          status: "off",
          brightness: 50,
          color: "white",
          username: "u1",
        },
        {
          serial_number: "456",
          name: "BedroomLight",
          room: "Bedroom",
          type: "Light",
          status: "on",
          brightness: 75,
          color: "blue",
          username: "u1",
        },
      ];
  
      const result = await Device.findAllByUserName(username);
      expect(result).toEqual(expect.arrayContaining(devices));
    });
  });

  describe("findByDeviceName", () => {
    it("finds a device by name and username", async () => {
      const deviceName = "BedroomLight";
      const username = "u1";
      const device = {
        serial_number: "456",
        name: deviceName,
        type: "Light",
        status: "on",
        brightness: 75,
        color: "blue",
        room: "Bedroom",
        username,
      };

      const result = await Device.findByDeviceName(deviceName, username);
      expect(result).toEqual(device);
    });
  });
});
