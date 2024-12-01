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

describe("authenticate", function () {
  test("works", async function () {
    const user = await User.authenticate("u1", "password1");
    expect(user).toEqual({
      username: "u1",
      firstName: "U1F",
      lastName: "U1L",
      email: "u1@email.com"
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
    firstName: "Test",
    lastName: "Tester",
    email: "test@test.com"
  };

  test("works", async function () {
    let user = await User.register({
      ...newUser,
      password: "password",
    });
    expect(user).toEqual(newUser);
    const found = await db.query("SELECT * FROM users WHERE username = 'new'");
    expect(found.rows.length).toEqual(1);
    expect(found.rows[0].password.startsWith("$2b$")).toEqual(true);
  });

  test("bad request with dup data", async function () {
    await User.register({
      ...newUser,
      password: "password",
    });
    await expect(User.register({
      ...newUser,
      password: "password",
    })).rejects.toThrow(BadRequestError);
  });
});


/************************************** get */ 
describe("get", function () {
  test("retrieves a user by username successfully", async function () {
    let user = await User.get("u1");
    expect(user).toEqual({
      username: "u1",
      firstName: "U1F",
      lastName: "U1L",
      email: "u1@email.com"
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
    email: "new@email.com"
  };

  test("updates user data successfully", async function () {
    let updatedUser = await User.update("u1", updateData);
    expect(updatedUser).toEqual({
      username: "u1",
      ...updateData,
    });
  });

  test("throws NotFoundError if the user does not exist", async function () {
    await expect(User.update("nope", { firstName: "test" })).rejects.toThrow(NotFoundError);
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
