# GraphQL, Apollo Studio, and Cookies

## What we will cover

`Apollo GraphQL` is a great tool, but sometimes its documentation is lacking. A quick Google search will reveal that one of the things that people struggle w/ (often unsuccessfully) is enabling cookies between Apollo Studio and a NodeJS GraphQL server.

In this article we will:

1. Describe the problem (skim/skip this if you are in a rush — see the TL;DR at the bottom of the section)

2. Identify common pitfalls as we work through an implementation

3. Provide a working final solution

## The problem

So you have setup your GraphQL server using `apollo-server-express`, written a few queries, and decide its time to implement your application's authentication strategy. You opt for a cookie-based sessions approach and grab familiar tools like `express-session`, `redis`, and `connect-redis`. After setting-up session logic in your code, you head over to Apollo Studio to see what you have to do to get things rolling. You find the cog icon in the upper left-hand corner of the screen, open the dialog, toggle **Include Cookies** to **ON** and see something similar to **Figure 1**.

![**Figure 1**: Apollo Studio connection settings dialog](https://miro.medium.com/max/1400/1*eU3W7sv_geamQiOSjA20kw.png)

*No problem*, you think to yourself. You are an experienced software engineer - CORS, cookies, headers - all stuff you are familiar with, and you feel very confident that you will be passing cookies between Apollo Studio and your server in a matter of seconds. You add the specified URL to your CORS origin header, enable credentials, and save your project. Next, you head over to Apollo Studio to validate your genius. Sadly, you likely encounter one of two things:

1) Apollo Studio connects your server without issue, however, cookies are still not working, or;

2) Your browser's console is littered w/ CORS errors (**Figure 2**), and you see a popup in the bottom-right corner similar to what is shown in **Figure 3** (this little dialog is probably about to become the bane of your existence).

![**Figure 2**: CORS error message](https://miro.medium.com/max/1400/1*r9XGBBxpMJplxWIaDtKffQ.png)

![**Figure 3**: Apollo Studio connection error dialog](https://miro.medium.com/max/1400/1*tMk4cuPRjMGE8pGmO8LGPA.png)

**TL;DR**

**Scenario #1**: Apollo Studio connects to your NodeJS GraphQL server, but cookies are not passed.

**Scenario #2**: Apollo Studio refuses to connect to your server.

> [!NOTE]
> Despite the error dialog (**Figure 3**) and Apollo Studio displaying "Failed to fetch" as its error-response message, you may still observe that your server is receiving requests.

We will actually start w/ **Scenario #2** as fixing it will lead us to **Scenario #1**, at which point we can proceed to our final solution.

## Identifying potential causes

### Starting code

As stated above, we will start w/ an example that results in **Scenario #2** and work our way through to a full solution. It is quite possible that your code looks something like this:

### `server.ts`: GraphQL server w/ issues to fix 

```ts
import { ApolloServer } from 'apollo-server-express';
import {
    ApolloServerPluginDrainHttpServer
    ApolloServerPluginLandingPageLocalDefault,
} from 'apollo-server-core';
import { buildSchema } from 'type-graphql';

import cors from 'cors';
import Express from 'express';
import http from 'http';
import 'reflect-metadata';

import appSession from '<path to appSession>';
import AuthResolver from '<path to AuthResolver>';

(async () => {
    const isProduction = process.env.NODE_ENV === 'production'
    // other app initializations

    const schema = await buildSchema({
        resolvers: [AuthResolver],
        emitSchemaFile: true,
    });

    const app = Express();
    app.use(appSession);

    const httpServer = http.createServer(app);
    const plugins = [ApolloServerPluginDrainHttpServer({ httpServer })];

    !isProduction &&
        plugins.push(ApolloServerPluginLandingPageLocalDefault());

    const server = new ApolloServer({
        plugins,
        schema,
        introspection: !isProduction,
    });

    await server.start();

    app.use(cors({
        origin: ['https://studio.apollographql.com'],
        credentials: true,
    }));

    server.applyMiddleware({ app });

    app.get('/'. (_, res) => {
        res.send('Example Server');
    });

    await new Promise<void>(resolve =>
        httpServer.listen({ port: process.env.PORT }, resolve)
    );

    console.log(
        `Server ready at port: ${process.env.PORT} and path: ${server.graphqlPath}`
    );
})();
```

### `appSession.ts`: Session setup leveraging redis

```ts
import connectRedis from 'connect-redis';
import redis from 'redis';
import session from 'express-session';

const appSession = session({
    name: 'some_identifier',
    store: new RedisStore({
        client: redis.createClient(),
        // ...
    }),
    cookie: {
        httpOnly: false,
        sameSite: 'none',
        secure: true
        // ...
    },
    // ...
});

export default appSession;
```

Hopefully, it is not too difficult to follow the flow of these files. **server.ts** shows a pretty standard implementation of an `apollo-server-express` application, whereas **appSession.ts** shows an `express-session` implementation using `redis` as its session store. **appSession.ts** is already setup the way it needs to be - note the `sameSite` and `secure` cookie properties on lines 13 and 14 as these are necessary for the desired functionality.

*From here on out, whenever we refer to lines of code, we are specifically referring to the **server.ts** file.*

## Getting rid of the `cors` package

If you are experiencing **Scenario #2** but the application seems to integrate perfectly w/ Apollo Studio when cookies are toggled to **OFF**, then there is a good chance that you are tying to set your CORS headers using the `cors` package (as seen on lines 41-44).

Although I may be the only one that has ever done this, I felt that it is worth addressing b/c it took me forever to figure out that this was part of the problem when I was working through this issue for the first time.

To enforce CORS headers and rules, take the object as an input to `cors` and instead pass it to the cors property of the `server.applyMiddleware` input on line 46. It should look like this:

```ts
server.applyMiddleware({
    app,
    cors: {
        origin: ['https://studio.apollographql.com'],
        credentials: true,
    }
});
```

Delete `app.use(cors(//...))`, save the file, and head over to Apollo Studio - you should now see that, that pesky dialog has disappeared and Apollo Studio successfully connects to your server.

Great! The first major hurdle cleared, and we have not hit **Scenario #1**.

## What is in a Proxy, anyways?

The next line of code that we have to add to our server is:

```ts
app.set('trust proxy', 1);
```

I know that the title of this section alludes to some kind of explanation, but instead, I will just refer you to the [Express documentation](https://expressjs.com/en/guide/behind-proxies.html) and let you dig into it on your own.

You do not actually need to understand what this line of code is doing as we are not going to be using it in any other way (although I do encourage you to read up!). That said, if you do not know what a proxy is and the implications of setting this option, I would advise the following modification:

```ts
process.env.__dev__ && app.set('trust proxy', 1);
```

Basically, unless you are already working with a reverse proxy and know what you are doing, including this option in production leaves your server vulnerable. Including this one-liner sets you on your way to working with cookies on Apollo Studio to your heart’s content while in local development, but prevents you from exposing your server to harm once it is released to the world.

## Setting the `X-Forwarded-Proto` Apollo Studio header

If you look at **Figure 1**, you will see the **Default headers** section at the bottom of the dialog. The last thing we need to do is set a header called `x-forwarded-proto` and assign it a value of `https`. This is pretty straightforward, but I've included **Figure 4** just in case:

![**Figure 4**: The X-Forwarded-Proto header](https://miro.medium.com/max/1400/1*NBdkOdjN0pGuhbqoqaPzJA.png)

This header is directly related to the topic of proxies which we barely talked about, and so I will not go into detail here, however lookout for references to this header in your reading!

If all has gone well, this is the final step and your application should be able to exchange cookies with Apollo Studio!

## Final solution

As promised, here is a file snippet with all of the changes we have discussed:

```ts

import { ApolloServer } from 'apollo-server-express';
import {
    ApolloServerPluginDrainHttpServer,
    ApolloServerPluginLandingPageLocalDefault,
} from 'apollo-server-core';
import { buildSchema } from 'type-graphql';

import Express from 'express';
import http from 'http';
import 'reflect-metadata';

import appSession from '<path to appSession>'
import AuthResolver from '<path to AuthResolver>'

(async () => {
    const isProduction = process.env.NODE_ENV === 'production'
    // other app initializations

    const schema = await buildSchema({
        resolvers: [AuthResolver],
        emitSchemaFile: true,
    });

    const app = Express();
    app.use(appSession);
    !isProduction && app.set('trust proxy', 1);

    const httpServer = http.createServer(app);
    const plugins = [ApolloServerPluginDrainHttpServer({ httpServer })];

    process.env.__dev__ &&
        plugins.push(ApolloServerPluginLandingPageLocalDefault());

    const server = new ApolloServer({
        plugins,
        schema,
        introspection: !isProduction,
    });

    await server.start();

    server.applyMiddleware({ 
        app,
        cors: {
            origin: ['https://studio.apollographql.com'],
            credentials: true,
        }
    });

    app.get('/', (_, res) => {
        res.send('Example Server');
    });

    await new Promise<void>(resolve =>
        httpServer.listen({ port: process.env.PORT }, resolve)
    );
        
    console.log(
        `Server ready at port: ${process.env.PORT} and path: ${server.graphqlPath}`
    );
})();
```