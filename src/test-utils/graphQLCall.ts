import { graphql, GraphQLSchema } from "graphql";

import { createSchema } from "../utils/createSchema";

type Maybe<T> = null | undefined | T;

interface Options {
  source: string;
  variableValues?: Maybe<{
    [key: string]: any;
  }>;
}

let schema: GraphQLSchema;

export const graphQLCall = async ({ source, variableValues }: Options) => {
  if (!schema) {
    schema = await createSchema();
  }
  return graphql({
    schema,
    source,
    variableValues
  });
};
