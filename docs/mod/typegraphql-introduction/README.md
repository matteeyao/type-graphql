# TypeGraphQL

We all love GraphQL! It's really great and solves many problems that we have w/ REST APIs, such as overfetching and underfetching. But developing a GraphQL API in Node.js w/ TypeScript is sometimes a bit of a pain.

## What?

**TypeGraphQL** is a library that makes this process enjoyable by defining the schema using only classes and a bit of decorator magic. Example object type:

```ts
@ObjectType()
class Recipe {
    @Field()
    title: string;

    @Field(type => [Rate])
    ratings: Rate[];

    @Field({nullable: true })
    averageRating?: number;
}
```

It also has a set of useful features, like validation, authorization and dependency injection, which helps develop GraphQL APIs quickly and easily

## Why?

As mentioned, developing a GraphQL API in Node.js w/ TypeScript is sometimes a bit of a pain. Why? Let's take a look at the steps we usually have to take.

First, we create all the schema types in SDL. We also create our data models using `ORM classes`, which represent our database entities. Then we start to write resolvers for our queries, mutations and fields. This forces us, however, to begin w/ creating TypeScript interfaces for all arguments and inputs and/or object types. After that, we can actually implement the resolvers, using generic signatures, e.g.:

```ts
export const getRecipesResolver: GraphQLFieldResolver<void, Context, GetRecipesArgs> = async (
    _,
    args,
    ctx,
) => {
    // common tasks repeatable for almost every resolver
    const auth = Container.get(AuthService);
    if (!auth.check(ctx.user)) {
        throw new NotAuthorizedError();
    }
    await joi.validate(getRecipesSchema, args);
    const repository = TypeORM.getRepository(Recipe);

    // our business logic, e.g.:
    return repository.find({ skip: args.offset, take: args.limit });
};
```

The biggest problem is code redundancy which makes it difficult to keep things in sync. To add a new field to our entity, we have to jump through all the files: modify the entity class, then modify the schema, and finally update the interface. The same goes w/ inputs or arguments: it's easy to forget to update one of them or make a mistake w/ a type. Also, what if we've made a type in a field name? The rename feature (F2) won't work correctly.

**TypeGraphQL** comes to address these issues, based on experience from a few years of developing GraphQL APIs in TypeScript. The main idea is to have one source of truth by defining the schema using classes and a bit of decorator help. Additional features like dependency injection, validation and auth guards help w/ common tasks that would normally have to be handled by ourselves

## Installation

Before getting started w/ TypeGraphQL we need to install some additional dependencies and properly configure the TypeScript configuration for our project.

> [!Prerequisites]
> Before we begin, we must make sure our development environment includes Node.js and npm.

## Packages installation

First, we have to install the main package, as well as `graphql-js` and `class-validator` which are peer dependencies of **TypeGraphQL**:

```zsh
npm i graphql class-validator type-graphql
```

Also, the `reflect-metadata` shim is required to make the type reflection work:

```zsh
npm i reflect-metadata
```

We must ensure that it is imported at the top of our entry file (before we use/import `type-graphql` or our resolvers):

```ts
import "reflect-metadata";
```

## TypeScript configuration

It's important to set these options in the `tsconfig.json` file of our project:

```json
{
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true
}
```

`TypeGraphQL` is designed to work w/ Node.js LTS (10.3+, 12+) and the latest stable releases. It uses features from ES2018 so we should set out `tsconfig.json` file appropriately:

```json
{
  "target": "es2018" // or newer if your node.js version supports this
}
```

Due to using the `graphql-subscription` dependency that relies on `AsyncIterator`, we may also have to proved the `esnext.asynciterable` to the `lib` option:

```json
{
  "lib": ["es2018", "esnext.asynciterable"]
}
```

All in all, the minimal `tsconfig.json` file example looks like this:

```json
{
  "compilerOptions": {
    "target": "es2018",
    "module": "commonjs",
    "lib": ["es2018", "esnext.asynciterable"],
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

## Getting started

> [!NOTE]
> Make sure you've completed all the steps described in the [installation instructions](https://typegraphql.com/docs/installation.html)

To explore all of the powerful capabilities of TypeGraphQL, we will create a sample GraphQL API for cooking recipes.

Let's start w/ the `Recipe` type, which is the foundation of our API.

## Types

Our goal is to get the equivalent of this type described in SDL:

```ts
type Recipe {
  id: ID!
  title: String!
  description: String
  creationDate: Date!
  ingredients: [String!]
}
```

So we create the `Recipe` class w/ all its properties and types:

```ts
class Recipe {
  id: string;
  title: string;
  description?: string;
  creationDate: Date;
  ingredients: string[];
}
```

Then we decorate the class and its properties w/ decorators:

```ts
@ObjectType()
class Recipe {
  @Field(type => ID)
  id: string;

  @Field()
  title: string;

  @Field({ nullable: true })
  description?: string;

  @Field()
  creationDate: Date;

  @Field(type => [String])
  ingredients: string[];
}
```

The detailed rules of when to use `nullable`, `array` and other are described in the [types and fields docs](https://typegraphql.com/docs/types-and-fields.html).

## Resolvers

After that we want to create typical CRUD queries and mutations. To do so, we create the resolver (controller) class that will have injected the `RecipeService` in the constructor:

```ts
@Resolver(Recipe)
class RecipeResolver {
  constructor(private recipeService: RecipeService) {}

  @Query(returns => Recipe)
  async recipe(@Arg("id") id: string) {
    const recipe = await this.recipeService.findById(id);
    if (recipe === undefined) {
      throw new RecipeNotFoundError(id);
    }
    return recipe;
  }

  @Query(returns => [Recipe])
  recipes(@Args() { skip, take }: RecipesArgs) {
    return this.recipeService.findAll({ skip, take });
  }

  @Mutation(returns => Recipe)
  @Authorized()
  addRecipe(
    @Arg("newRecipeData") newRecipeData: NewRecipeInput,
    @Ctx("user") user: User,
  ): Promise<Recipe> {
    return this.recipeService.addNew({ data: newRecipeData, user });
  }

  @Mutation(returns => Boolean)
  @Authorized(Roles.Admin)
  async removeRecipe(@Arg("id") id: string) {
    try {
      await this.recipeService.removeById(id);
      return true;
    } catch {
      return false;
    }
  }
}
```

We use the `@Authorized` decorator to restrict access to authorized users only or the users that fulfill the roles requirements. The detailed rules for when and why we declare `returns => Recipe` functions and others are described in [resolvers docs](https://typegraphql.com/docs/resolvers.html).

## Inputs and Arguments

Ok, but what are `NewRecipeInput` and `RecipesArgs`? They are of course classes:

```ts
@InputType()
class NewRecipeInput {
  @Field()
  @MaxLength(30)
  title: string;

  @Field({ nullable: true })
  @Length(30, 255)
  description?: string

  @Field(type => [String])
  @ArrayMaxSize(30)
  ingredients: string[];
}

@ArgsType()
class RecipesArgs {
  @Field(type => Int)
  @Min(0)
  skip: number = 0;

  @Field(type => Iny)
  @Min(1)
  @Max(50)
  take: number = 25;
}
```

`@Length`, `@Min` and `@ArrayMaxSize` are decorators from `class-validator` that automatically perform field validation in TypeGraphQL.

## Building schema

The last step that needs to be done is to actually build the schema from the TypeGraphQL definition. We use the `buildSchema` function for this:

```ts
const schema = await buildSchema({
  resolvers: [RecipeResolver],
});

// ...creating express server or stb
```

Et voilà! Now we have a fully functional GraphQL schema! If we print it, this is how it would look:

```ts
type Recipe {
  id: ID!
  title: String!
  description: String
  creationDate: Date!
  ingredients: [String!]!
}
input NewRecipeInput {
  title: String!
  description: String
  ingredients: [String!]!
}
type Query {
  recipe(id: ID!): Recipe
  recipes(skip: Int = 0, take: Int = 25): [Recipe!]
}
type Mutation {
  addRecipe(newRecipeData: NewRecipeInput!): Recipe!
  removeRecipe(id: ID!): Boolean!
}
```

## Want more?

For more complicated cases, go to the [Examples section](https://typegraphql.com/docs/examples.html) where you can discover e.g. how well TypeGraphQL integrates with TypeORM.
