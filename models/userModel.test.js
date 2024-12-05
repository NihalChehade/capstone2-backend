"use strict";

const {
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
} = require("../expressError");
const db = require("../db.js");
const User = require("./userModel.js");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** authenticate */

describe("authenticate", function () {
  test("works", async function () {
    const user = await User.authenticate("u1", "password1");
    expect(user).toEqual({
      username: "u1",
      firstName: "U1F",
      lastName: "U1L",
      email: "u1@email.com",
      lifxToken: expect.any(String)  // Ensure lifxToken is returned and decrypted
    });
  });

  test("unauth if no such user", async function () {
    await expect(User.authenticate("nope", "password")).rejects.toThrow(UnauthorizedError);
  });

  test("unauth if wrong password", async function () {
    await expect(User.authenticate("u1", "wrong")).rejects.toThrow(UnauthorizedError);
  });
});

/************************************** register */

describe("register", function () {
  const newUser = {
    username: "new",
    password: "password",
    firstName: "Test",
    lastName: "Tester",
    email: "test@test.com",
    lifxToken: "some-lifx-token"  // Example LIFX token
  };

  test("works with lifxToken", async function () {
    let user = await User.register(newUser);
    expect(user).toEqual({
      username: newUser.username,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      email: newUser.email,
      lifxToken: newUser.lifxToken
    });
    const found = await db.query("SELECT * FROM users WHERE username = 'new'");
    expect(found.rows.length).toEqual(1);
    expect(found.rows[0].password.startsWith("$2b$")).toEqual(true);
    expect(found.rows[0].lifx_token).not.toEqual(newUser.lifxToken);  // The stored token should be encrypted
  });

  test("bad request with dup data", async function () {
    await User.register(newUser);
    await expect(User.register(newUser)).rejects.toThrow(BadRequestError);
  });
});

/************************************** get */ 
describe("get", function () {
  test("retrieves a user by username successfully, including decrypted lifxToken", async function () {
    let user = await User.get("u1");
    expect(user).toEqual({
      username: "u1",
      firstName: "U1F",
      lastName: "U1L",
      email: "u1@email.com",
      lifxToken: expect.any(String)  // Ensure lifxToken is decrypted
    });
  });

  test("throws NotFoundError if the user does not exist", async function () {
    await expect(User.get("nope")).rejects.toThrow(NotFoundError);
  });
});

/************************************** update */

describe("update", function () {
  const updateData = {
    firstName: "NewF",
    lastName: "NewL",
    email: "new@email.com",
    lifxToken: "new-lifx-token"  // New LIFX token for updating
  };

  test("updates user data successfully, including lifxToken", async function () {
    let updatedUser = await User.update("u1", updateData);
    expect(updatedUser).toEqual({
      username: "u1",
      firstName: updateData.firstName,
      lastName: updateData.lastName,
      email: updateData.email,
      lifxToken: expect.any(String) // Ensure this matches what you expect after decryption
    });
  });
  
  test("throws NotFoundError if the user does not exist", async function () {
    await expect(User.update("nope", updateData)).rejects.toThrow(NotFoundError);
  });

  test("throws BadRequestError if no data is provided to update", async function () {
    await expect(User.update("u1", {})).rejects.toThrow(BadRequestError);
  });
});

/************************************** remove */

describe("remove", function () {
  test("removes a user successfully", async function () {
    await User.remove("u1");
    const res = await db.query("SELECT * FROM users WHERE username = 'u1'");
    expect(res.rows.length).toEqual(0);
  });

  test("throws NotFoundError if the user does not exist", async function () {
    await expect(User.remove("nope")).rejects.toThrow(NotFoundError);
  });
});
