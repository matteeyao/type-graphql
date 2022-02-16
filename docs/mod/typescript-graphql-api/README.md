# Easiest way to create GraphQL API for a TypeScript module

GraphQL is a popular API query language that offers more structured, performant and secure ways of accessing data from other services than REST. It requires the server to define a schema that lists all types of data available for clients of the API.

When building a GraphQL server to allow access to a TypeScript module, one needs to make sure that the types in GraphQL schema reflect accurately what data is expected. Let's take a look at the following example of a simple bookstore module

## Defining bookstore module

### `bookstore.ts` (part 1/3)

```ts
type int = number;

export interface Book {
    id: int;
    title: string;
    authorId: int;
};

export interface Author {
    id: int;
    name: string;
}
```

We use a custom type alias `int` here to indicate that the given properties are integers rather than using the generic JavaScript `number`

### `bookstore` (part 2/3)

Here is a simple database for our bookstore:

```ts
const booksDB : book[] = [
    {
        id: 0,
        title: 'Romeo and Juliet',
        authorId: 0,
    },
    {
        id: 1,
        title: 'The Mysterious Affair at Styles',
        authorId: 1,
    },
    {
        id: 2,
        title: 'Endless Night',
        authorId: 1,
    },
];

const authorsDB: Author[] = [
    {
        id: 0,
        name: 'William Shakespeare',
    },
    {
        id: 1,
        name: 'Agatha Christie',
    },
];
```

### `bookstore.ts` (part 3/3)

The functions below allow reading data from the bookstore:

```ts
// get all books
export function getBooks() {
    return booksDB;
}

// get all authors
export function getAuthors() {
    return authorsDB;
}

// get the author of the given book(book: Book) {
export function author(book: Book) {
    return authorsDB.find((author) => author.id === book.authorId);
}

// get all books of the given author
export function books(author: Author) {
    return booksDB.filter((book) => book.authorId === author.id);
}
```

In order to make these functions available in GraphQL, we need to define a GraphQL schema. Let's compare a few ways of doing this.

## The native way (~60 lines of code)

The GraphQL implementation in JavaScript comes w/ the `GraphQLSchema` class which can be used as follows to define the schema:

### `schema.ts` (the native way)

```ts
import {
    GraphQLInt,
    GraphQLList,
    GraphQLObjectType,
    GraphQLSchema,
    GraphQLString,
} from 'graphql';

import { author, books, getAuthors, getBooks } from './bookstore';

const bookType = new GraphQLObjectType({
    name: 'Book',
    fields: () => ({
        id: {
            type: GraphQLInt,
        },
        title: {
            type: GraphQLString,
        },
        authorId: {
            type: GraphQLInt,
        },
        author: {
            type: authorType,
            resolve: author,
        },
    }),
});

const authorType = new GraphQLObjectType({
    name: 'Author',
    fields: () => ({
        id: {
            type: GraphQLInst,
        },
        name: {
            type: GraphQLString,
        },
        books: {
            type: new GraphQLList(bookType),
            resolve: books,
        },
    }),
});

export const schema = new GraphQLSchema({
    query: new GraphQLObjectType({
        name: 'Query',
        fields: {
            getBooks: {
                type: new GraphQLList(bookType),
                resolve: getBooks,
            },
            getAuthors: {
                type: new GraphQLList(authorType),
                resolve: getAuthors,
            },
        },
    }),
});
```

## The TypeGraphQL way (~70 lines of code)

`TypeGraphQL` is a quite popular solution for creating GraphQL schemas integrated w/ TypeScript. It depends on decorators, so make sure you have `experimentalDecorators` turned on in your config file if you wish to use it. Here is how it works in our case:

### `schema.ts` (TypeGraphQL way)

```ts
import 'reflect-metadata';
import {
    buildSchemaSync,
    Field,
    FieldResolver,
    Int,
    ObjectType,
    Query,
    Resolver,
    Root
} from 'type-graphql';

import * as bookstore from './bookstore';

@ObjectType()
class Book implements bookstore.Book {
    @Field((type) => Int)
    id!: number;

    @Field((type) => String)
    title!: string;

    @Field((type) => Int)
    authorId!: number;
}

@ObjectType()
class Author implements bookstore.Author {
    @Field((type) => Int)
    id!: number;

    @Field((type) => String)
    name!: string;
}

@Resolver()
class BookstoreResolver {
    @Query((returns) => [Book])
    getBooks() {
        return bookstore.getBooks();
    }

    @Query((returns) => [Author])
    getAuthors() {
        return bookstore.getAuthors();
    }
}

@Resolver((of) => Book)
class BookResolver {
    @FieldResolver((type) => Author)
    author(@Root() book: Book) {
        return bookstore.author(book);
    }
}

@Resolver((of) => Author)
class AuthorResolver {
    @FieldResolver((type) => [Book])
    books(@Root() author: Author) {
        return bookstore.books(author);
    }
}

export const schema = buildSchemaSync({
    resolvers: [BookstoreResolver, BookResolver, AuthorResolver],
});
```

## Previewing GraphQL schema

Having the `schema` object defined we can use the GraphQL tool included in `express-graphql` package to preview the server:

### `server.ts`

```ts
import express from 'express';
import { graphqlHTTP } from 'express-graphql';

import { schema } from './schema';

const port = 4000;

express()
    .use(
        '/graphql',
        graphqlHTTP({
            schema,
            graphiql: true,
        })
    )
    .listen(port);
```

Here's the result:

![GraphiQL Interface](https://images.ctfassets.net/nt6zqfocbrur/ef80Jh6LAl0lMS96ddqDS/27c4381673ffb62192a9362f8f2594fa/1_h4hlQ9EaRSvbZWKufLDl6w.png?w=700&r=7)

As you can see, to define GraphQL schema that accurately reflects the bookstore module **we had to repeat all the type and resolver information** in a way that GraphQL could understand. This form of code repetition b/c it is tedious and error prone. For example, TypeScript won't be able to check if the GraphQL types you provided are correct.

## The easy way (~20 lines of code)

If your module is already written in TypeScript it's possible to look into its definitions and derive from them what GraphQL types need to be used. We have created `typescript-graphql` package that does that automatically.

When using the package, you first need to export `Query` object that includes top level resolvers for read-only access or `Mutation` object for mutating resolvers (if you have any). You may also export additional objects that include field resolvers for your object types. Any additional values exported from the module are ignored.

### `bookstore.ts` (additional exports)

```ts
export const Query = {
    getAuthors,
    getBooks,
};

export const Author = {
    books,
};

export const Book = {
    author,
}
```

Secondly, you need to provide the absolute path to the module you wish to expose in GraphQL

Also, if your build phase includes compilation of TypeScript into JavaScript w/ `tsc`, you also need to run `npx tgsc` on any modules that you wish to expose w/ GraphQL:

```zsh
npx tgsc bookstore.ts
```

This will create `bookstore.graphql.json` file in your `outDir` that includes type information necessary to generate schema at runtime. That's it. **You just saved yourself writing and maintaining a lot of GraphQL code**.
