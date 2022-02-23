import { Connection } from "typeorm";

import { testConn } from "../../../test-utils/testConn";
import { graphQLCall } from "../../../test-utils/graphQLCall";
import { redis } from "../../../redis";

let conn: Connection;

beforeAll(async () => {
  if (redis.status == "end") {
    await redis.connect();
  }
  conn = await testConn();
});

afterAll(async () => {
  redis.disconnect();
  await conn.close();
});

const registerMutation = `
mutation Register($data: RegisterInput!) {
  register(
    data: $data
  ) {
    id
    firstName
    lastName
    email
    name
  }
}
`;

describe("Register", () => {
  it("creates a user", async () => {
    jest.setTimeout(15000); // in milliseconds
    console.log(
      await graphQLCall({
        source: registerMutation,
        variableValues: {
          data: {
            firstName: "bob",
            lastName: "bob2",
            email: "bob@bob.com",
            password: "asdfasdf"
          }
        }
      })
    );
  });
});
