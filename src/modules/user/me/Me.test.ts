import { Connection } from "typeorm";
import faker from "@faker-js/faker";

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

const meQuery = `
{
    me {
        id
        firstName
        lastName
        email
        name
    }
}
`;

describe("Me", () => {
    it("get user", async () => {
        const user = await User.create({
            firstName: faker.name.firstName(),
            lastName: faker.name.lastName(),
            email: faker.internet.email(),
            password: faker.internet.password()
        }).save();

        const response = await graphQLCall({
            source: meQuery,
            userId: user.id
        });

        expect(response).toMatchObject({
            data: {
                me: {
                    id: `${user.id}`,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email
                }
            }
        });
    });

    it("return null", async () => {
        const response = await graphQLCall({
            source: meQuery
        });

        expect(response).toMatchObject({
            data: {
                me: null
            }
        });
    });
});
