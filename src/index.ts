import "reflect-metadata";
import { ApolloServer } from "apollo-server-express";
import { ApolloServerPluginLandingPageGraphQLPlayground } from "apollo-server-core";
import Express from "express";
import { createConnection } from "typeorm";
import session from "express-session";
import connectRedis from "connect-redis";
import { graphqlUploadExpress } from "graphql-upload";

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
        plugins: [
            ApolloServerPluginLandingPageGraphQLPlayground({
                settings: {
                    "request.credentials": "include",
                },
            }),
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
