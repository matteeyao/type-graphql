import { Connection } from "typeorm";
import { faker } from '@faker-js/faker';

import { testConn } from "../../../test-utils/testConn";
import { graphQLCall } from "../../../test-utils/graphQLCall";
import { User } from "../../../entity/User";
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
    const user = {
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName(),
      email: faker.internet.email(),
      password: faker.internet.password(),
    }

    
    const response = await graphQLCall({
      source: registerMutation,
      variableValues: {
        data: user
      }
    });
    
    expect(response).toMatchObject({
      data: {
        register: {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email
        }
      }
    })

    const dbUser = await User.findOne({ where: { email: user.email } });
    expect(dbUser).toBeDefined();
    expect(dbUser!.confirmed).toBeFalsy();
    expect(dbUser!.firstName).toBe(user.firstName);
  });
});
