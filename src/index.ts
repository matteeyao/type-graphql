import "reflect-metadata";
import { ApolloServer } from "apollo-server-express";
import { ApolloServerPluginLandingPageGraphQLPlayground } from "apollo-server-core";
import Express from "express";
import { createConnection } from "typeorm";
import session from "express-session";
import connectRedis from "connect-redis";
import { graphqlUploadExpress } from "graphql-upload";
import { 
    getComplexity,
    simpleEstimator,
    fieldExtensionsEstimator
} from "graphql-query-complexity";

import { redis } from "./redis";
import { createSchema } from "./utils/createSchema";

declare module 'express-session' {
    interface SessionData {
        userId: any;
    }
}

(async () => {
    const isProduction = process.env.NODE_ENV === "production";

    await createConnection();

    const schema = await createSchema();

    const apolloServer = new ApolloServer({
        schema,
        context: ({ req, res }: any) => ({ req, res }),
        introspection: !isProduction,
        plugins: [
            ApolloServerPluginLandingPageGraphQLPlayground({
                settings: {
                    "request.credentials": "include",
                },
            }),
            {
                async requestDidStart() {
                    return {
                        async didResolveOperation({ request, document }) {
                            /**
                             * This provides GraphQL query analysis to be able to react on complex queries to your GraphQL server.
                             * This can be used to protect your GraphQL servers against resource exhaustion and DoS attacks.
                             * More documentation can be found at https://github.com/ivome/graphql-query-complexity.
                             */
                            const complexity = getComplexity({
                                // Our built schema
                                schema,
                                // To calculate query complexity properly,
                                // we have to check only the requested operation
                                // not the whole document that may contains multiple operations
                                operationName: request.operationName,
                                // The GraphQL query document
                                query: document,
                                // The variables for our GraphQL query
                                variables: request.variables,
                                // Add any number of estimators. The estimators are invoked in order, the first
                                // numeric value that is being returned by an estimator is used as the field complexity.
                                // If no estimator returns a value, an exception is raised.
                                estimators: [
                                    // Using fieldExtensionsEstimator is mandatory to make it work with type-graphql.
                                    fieldExtensionsEstimator(),
                                    // Add more estimators here...
                                    // This will assign each field a complexity of 1
                                    // if no other estimator returned a value.
                                    simpleEstimator({ defaultComplexity: 1 }),
                                ],
                            });
                            // The maximum allowed query complexity, queries above this threshold will be rejected
                            let maximumComplexity: number = 20;
                            // Here we can react to the calculated complexity,
                            // like compare it with max and throw error when the threshold is reached.
                            if (complexity > maximumComplexity) {
                                throw new Error(
                                    `Sorry, too complicated query! ${complexity} is over 20 that is the max allowed complexity.`,
                                );
                            }
                            // And here we can e.g. subtract the complexity point from hourly API calls limit.
                            console.log("Used query complexity points:", complexity);
                        }
                    }
                },
            },
        ],
    });

    const app = Express();
    !isProduction && app.set("trust proxy", 1);

    const RedisStore = connectRedis(session);

    app.use(
        session({
            store: new RedisStore({
                client: redis as any
            }),
            name: "qid",
            secret: "aslkdfjoiq12312",
            resave: false,
            saveUninitialized: false,
            cookie: {
                httpOnly: true,
                sameSite: "none",
                secure: !isProduction,
                maxAge: 1000 * 60 * 60 * 24 * 7 * 365 // 7 years
            }
        })
    );

    app.use(graphqlUploadExpress());

    await apolloServer.start();

    apolloServer.applyMiddleware({ 
        app,
        cors: {
            credentials: true,
            origin: ['https://studio.apollographql.com'],
        },
     });

    app.listen(4000, () => {
        console.log("Server is running!\r\nListening on port 4000\r\nExplore at https://studio.apollographql.com/sandbox\r\n");
    });
})();
