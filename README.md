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

## Setup type-graphql

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
