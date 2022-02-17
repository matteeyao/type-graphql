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
