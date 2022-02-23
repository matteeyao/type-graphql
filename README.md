# Type-GraphQL

## Quick-start

1. Clone and install dependencies

```zsh
git clone https://github.com/benawad/type-graphql-series.git
cd type-graphql-series
yarn
```

2. Make sure you have PostgreSQL running on your computer with a database called `typegraphql-example` and a user who has access to that database with the username `postgres` and password `postgres`

* Mac: https://www.codementor.io/engineerapart/getting-started-with-postgresql-on-mac-osx-are8jcopb

* Windows: https://www.guru99.com/download-install-postgresql.html

* Docker: https://www.youtube.com/watch?v=G3gnMSyX-XM

* Linux: you know what you're doing

* How to create a user: https://medium.com/coding-blocks/creating-user-database-and-adding-access-on-postgresql-8bfcd2f4a91e

3. Make sure you have Redis running on your computer

* Mac: https://medium.com/@petehouston/install-and-config-redis-on-mac-os-x-via-homebrew-eb8df9a4f298

* Windows: https://redislabs.com/blog/redis-on-windows-10/

* Linux: you know what you're doing

4. Start the server

```zsh
yarn start
```

To verified it worked, you can go to http://localhost:4000

## Table of contents

1. setup **type-graphql**

2. register users

3. validation of user input

4. login

5. authorization/middleware decorators

6. confirmation email

7. forgot/change password

8. logout

9. write a test

10. Higher order resolvers

## Setup type-graphql - installations

To initialize **yarn**:

```zsh
$ yarn init -y
```

Add dependencies:

```zsh
$ yarn add apollo-server-express express graphql@15.7.2 reflect-metadata type-graphql
```

Add dev dependencies:

```zsh
$ yarn add -D @types/express @types/graphql @types/node nodemon ts-node typescript
```

With TypeScript installed, you can initialize your TypeScript project by using the following command:

```zsh
$ npx tsc --init
```

## Register users - installations

Install **TypeORM**:

```zsh
yarn add pg typeorm bcryptjs
```

> [!NOTE]
> For a stronger hashing algorithm, install `Argon2` in place of `bcryptjs`

Install corresponding dev dependencies:

```zsh
yarn add -D @types/bcryptjs
```

The following mutation:

```ts
mutation {
  register(
    firstName: "test",
    lastName: "user",
    email: "test@bob.com",
    password: "password"
  ) {
    id
    firstName
    lastName
    email
  }
}
```

Should get back the following response:

```json
{
  "data": {
    "register": {
      "id": "8",
      "firstName": "test",
      "lastName": "user",
      "email": "test@bob.com"
    }
  }
}
```

## Validation - installations

Let's add a library called `ts-node-dev`, which will replace `nodemon` and is an upgrade for use w/ TypeScript

```zsh
yarn add ts-node-dev --dev
```

Install `class-validator`:

```zsh
yarn add class-validator
```

The following `register` mutation that uses an already exiting `email`:

```ts
mutation {
  register(
    data: {
    firstName: "Charles",
    lastName: "Kim",
    email: "bob2@bob.com",
    password: "password"
    }
  ) {
    id
    firstName
    lastName
    email
  }
}
```

Should get back the following response w/ an error:

```json
{
  "errors": [
    {
      "message": "Argument Validation Error",
      "locations": [
        {
          "line": 2,
          "column": 3
        }
      ],
      "path": [
        "register"
      ],
      "extensions": {
        "code": "INTERNAL_SERVER_ERROR",
        "exception": {
          "validationErrors": [
            {
              "target": {
                "firstName": "Charles",
                "lastName": "Kim",
                "email": "bob2@bob.com",
                "password": "password"
              },
              "value": "bob2@bob.com",
              "property": "email",
              "children": [],
              "constraints": {
                "IsEmailAlreadyExistConstraint": "Email already in use"
              }
            }
          ],
          "stacktrace": [
            "Error: Argument Validation Error",
            "    at Object.validateArg (/Users/mattyyao/Documents/CS312/typescript/type-graphql/node_modules/type-graphql/dist/resolvers/validate-arg.js:29:15)",
            "    at processTicksAndRejections (node:internal/process/task_queues:96:5)",
            "    at async Promise.all (index 0)"
          ]
        }
      }
    }
  ],
  "data": null
}
```

## Login - installations

We'll be creating a resolver to allow users to log into our API. To keep users logged in, we're going to be using sessions and we're going to be using the `express-session` library. We're also going to be storing these session data in Reduce using the `connect-redis` library.

```zsh
yarn add express-session connect-redis ioredis cors
```

Install the corresponding types:

```zsh
yarn add -D @types/express-session @types/connect-redis @types/ioredis @types/cors
```

W/ the completion of this step, when you perform a `login` mutation:

```ts
mutation {
  login(
    email: "bob2@bob.com",
    password: "password"
  ) {
    id
    firstName
    lastName
    email
  }
}
```

Should give back the `user`:

```json
{
  "data": {
    "login": {
      "id": "2",
      "firstName": "hey",
      "lastName": "bob",
      "email": "bob2@bob.com"
    }
  }
}
```

And, when logged in, the session `me` query:

```ts
{
  me {
    id
    firstName
    lastName
    email
  }
}
```

Should give back the following `user`:

```json
{
  "data": {
    "me": {
      "id": "2",
      "firstName": "hey",
      "lastName": "bob",
      "email": "bob2@bob.com"
    }
  }
}
```

## Authorization - installations

To logout and terminate your session open the Chrome Inspector Tool ▶ `Application` ▶ `Cookies` and remove `qid`

The following `hello` query:

```ts
{
  hello
}
```

Should return the following error:

```json
{
  "errors": [
    {
      "message": "not authenticated",
      "locations": [
        {
          "line": 2,
          "column": 3
        }
      ],
      "path": [
        "hello"
      ],
      "extensions": {
        "code": "INTERNAL_SERVER_ERROR",
        "exception": {
          "stacktrace": [
            "Error: not authenticated",
            "    at /Users/mattyyao/Documents/CS312/typescript/type-graphql/src/modules/middleware/isAuth.ts:7:11",
            "    at Generator.next (<anonymous>)",
            "    at /Users/mattyyao/Documents/CS312/typescript/type-graphql/src/modules/middleware/isAuth.ts:8:71",
            "    at new Promise (<anonymous>)",
            "    at __awaiter (/Users/mattyyao/Documents/CS312/typescript/type-graphql/src/modules/middleware/isAuth.ts:4:12)",
            "    at isAuth (/Users/mattyyao/Documents/CS312/typescript/type-graphql/src/modules/middleware/isAuth.ts:5:76)",
            "    at dispatchHandler (/Users/mattyyao/Documents/CS312/typescript/type-graphql/node_modules/type-graphql/dist/resolvers/helpers.js:82:30)",
            "    at Object.applyMiddlewares (/Users/mattyyao/Documents/CS312/typescript/type-graphql/node_modules/type-graphql/dist/resolvers/helpers.js:88:12)",
            "    at /Users/mattyyao/Documents/CS312/typescript/type-graphql/node_modules/type-graphql/dist/resolvers/create.js:27:26",
            "    at field.resolve (/Users/mattyyao/Documents/CS312/typescript/type-graphql/node_modules/apollo-server-core/src/utils/schemaInstrumentation.ts:106:18)"
          ]
        }
      }
    }
  ],
  "data": null
}
```

## Confirmation email - installations

Install `nodemailer` and `uuid`, which will allow us to create unique IDs:

```zsh
yarn add nodemailer uuid
```

Add the corresponding TypScript type dependencies:

```
yarn add -D @types/nodemailer @types/uuid
```

The following `confirmUser` mutation:

```ts
mutation {
  confirmUser(token: "0cc40394-b900-4002-b8a6-943922034781")
}
```

Should return:

```json
{
  "data": {
    "confirmUser": true
  }
}
```

And now we can actually login as the user:

```ts
mutation {
  login(
    email: "bobman@bob.com",
    password: "password"
  ) {
    id
    firstName
    lastName
    email
  }
}
```

Which sends us back:

```json
{
  "data": {
    "login": {
      "id": "16",
      "firstName": "Bob",
      "lastName": "Man",
      "email": "bobman@bob.com"
    }
  }
}
```

## Forgot/change password - installations

Similar to the last module, we are going to be sending a token to the user's email and they are going to click on a URL that has a token, which will be used to verify the user when they change their password.

The following mutation:

```ts
mutation {
  forgotPassword(email: "bobman@bob.com")
}
```
Should log the following to the console:

```zsh
Message sent: <541aeef4-1d48-8453-bcd8-ec2c5b51cef1@example.com>
Preview URL: https://ethereal.email/message/XDviCODfsg1dXMTmXDviCtUFLVSx.Z3cAAAAAegHFloequzBBxEd-9WaX4k
```

Clicking on the `preview url` should take you to an email w/ a link allowing you to change your URL and containing a token:

```txt
http://localhost:3000/user/change-password/a4798836-46c3-4b1d-bedb-310aecf6fc83
```

Continuing forward, our `changePassword` mutation:

```ts
mutation {
  changePassword(
    data: {
      token: "a4798836-46c3-4b1d-bedb-310aecf6fc83",
      password: "password2"
    }
  ) {
    id
    email
    firstName
    lastName
  }
}
```

should return the following:

```json
{
  "data": {
    "changePassword": {
      "id": "6",
      "email": "bobman@bob.com",
      "firstName": "bob",
      "lastName": "man"
    }
  }
}
```

And the following `login` mutation:

```ts
mutation {
  login(email: "bobman@bob.com", password: "password") {
    id
    firstName
    lastName
    email
    name
  }
}
```

should return failing login data:

```json
{
  "data": {
    "login": null
  }
}
```

W/ the correct changed password, however:

```ts
mutation {
  login(email: "bobman@bob.com", password: "password2") {
    id
    firstName
    lastName
    email
    name
  }
}
```

We get back the correct user:

```ts
{
  "data": {
    "login": {
      "id": "6",
      "firstName": "bob",
      "lastName": "man",
      "email": "bobman@bob.com",
      "name": "bob man"
    }
  }
}
```

## Logout - installations

When the following `logout` mutation is run:

```ts
mutation {
  logout
}
```

The response should be:

```json
{
  "data": {
    "logout": true
  }
}
```

And when running the `me` session query:

```ts
{
  me {
    id
    firstName
    lastName
    email
  }
}
```

The response should return:

```json
{
  "data": {
    "me": null
  }
}
```

# Setting up a test environment - installations

The following tests will be integration tests, each calling the GraphQL resolvers and allowing the resolvers to make requests and updates to the database and receive data from the db for both mutations and queries. And we can also check the database and the response from the resolvers to ensure we get the right data back that we expect.

Install the test-runner `ts-jest` and the corresponding types:

```zsh
yarn add --dev jest typescript ts-jest @types/jest
```

Run the following command to initialize the configuration file:

```zsh
yarn ts-jest config:init
```

To create the database used for testing, run the following command:

```zsh
createdb typegraphql-example-test
```

# Testing resolvers - installations

Install library `faker` as a dev dependency and the corresponding types:

```zsh
yarn add -D @faker-js/faker @types/faker
```

# Higher order resolvers - installations

After implementing the `Product` entity and accompanying resolver, the following mutation:

```ts
mutation {
  createProduct(data: {name:"Alexa"}) {
    id
    name
  }
}
```

should return:

```json
{
  "data": {
    "createProduct": {
      "id": "1",
      "name": "Alexa"
    }
  }
}
```
