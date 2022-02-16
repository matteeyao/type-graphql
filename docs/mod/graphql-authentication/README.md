# How to easily implement Authentication w/ GraphQL and Redis

Nearly every webapp today has authentication. While it's becoming more popular to verify a user with a phone code, it's still rare to see. You will be pressed to find a popular website without classic email and password login, which is what we will be implementing today.

We will be using:

* `GraphQL`

* `TypeScript`

* `TypeORM`

* `Type-GraphQL`

* `Redis` for storing cookies

* `Express-sessions` for the cookie-sessions

As usual, we start from Ben Awad's command `npx create-graphql-api graphql-auth-example` or clone this [starter GitHub repo](https://github.com/lastnameswayne/startergraphqlserver/tree/main).

But this will naturally still work if you have your own project already initialized, we just avoid a lot of boilerplate code using the command.

To begin, create your User entity using TypeORM definitions, possibly in a `User.ts` in your entity folder:

```ts
@ObjectType()
@Entity()
export class User extends BaseEntity {
    @Field()
    @PrimaryGeneratedColumn()
    id!: number;

    @Field()
    @Column({ type: "text", unique: true })
    username!: string;

    @Field(() => String)
    @Column()
    password!: string;

    @Field(() => String)
    @CreateDateColumn()
    createdAt: Date;

    @Field(() => String)
    @CreateDateColumn()
    updatedAt: Date;
}
```

This will guide us in making our mutations. Next, run migrations with the TypeORM CLI:

```zsh
npx typeorm migration:create -n migrationfirst
```

Migrations look at your entities, and create corresponding SQL to create the tables. It will still work without running this command, but it's a good practice.

Next, create a new `UserResolver`. In our `UserResolver` we will handle our `registration()` and `login()` methods:

```ts
@InputType()
class UsernamePasswordInput {
    @Field()
    username: string;
    @Field()
    password: string;
}

@Mutation(() => User)
    async register(
        @Args("options") options: UsernamePasswordInput
    ) {
        const hashedPassword = await argon2.hash(options.password);
        const user = User.create({
            username: options.username,
            password: hashedPassword,
        }).save();

        return user;
    }
```

The mutation returns a `User` and takes in an `InputType()`. `InputTypes()` are a way to simplify our code, so the arguments don't become too cluttered. As you can see, you just make a class w/ the fields and the corresponding types, which you can then pass into the mutation as an argument. In our example it's a username and password.

We make sure to hash the password using `argon2` before storing it.

We can now call `User.create()` from TypeORM to store a user into our database. We make sure to pass in the hashed password, not the user-inputted one.

Let's try it out in the GraphQL playground. Start the server, go to http://localhost:4000/playground and in the window run the following mutation:

```ts
mutation {
  register(options: { username: "swayne1", password: "swayne1" }) {
    errors {
      field
      message
    }
    user {
      id
      username
      createdAt
      updatedAt
    }
  }
}
```

Congrats, you just created a user in your database! 🎉

Before we continue, I would like to define some more `InputType()`-classes.

```ts
@ObjectType()
class FieldError {
  @Field()
  field: string;
  @Field()
  message: string;
}

@ObjectType()
class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => User, { nullable: true })
  user?: User;
}
```

The `Fielderror` class simply shows a `field` and `message`. This is useful to show the correct error message for the correct field.

We also have a `UserResponse` `InputType`, which is a function return type. We either show a list of errors, using the `FieldError` class we defined earlier, or returns the `User`.

We are now ready to implement the `login()`-mutation:

```ts
@Mutation(() => UserResponse)
    async login(
        @Arg("options") options: UsernamePasswordInput
    ): Promise<UserResponse> {
        //1    
        const user = await User.findOne({ username: options.username });
        //2   
        if (!user) {
            return {
                errors: [{ field: "username", message: "username doesn't exist" }],
            };
        }
        const valid = await argon2.verify(user.password, options.password);
        //3    
        if (!valid) {
            return {
                errors: [
                    {
                        field: "password",
                        message: "that password doesn't exist",
                    },
                ],
            };
        }
        //4
        return {user};
    }
```

1. We look for a user with the corresponding username. Note: that this implementation isn't case-sensitive. If you want case-sensitive username validation, where eg. "Swayne" and "swayne" are two different usernames, just call `.toLowerCase` on `options.username`.

2. If we can't find a user with the username inputted, the user doesn't exist so we return error.

3. Next we verify the password using `argon2`. `verify()` takes the hashed password and compares it to the user-inputted one, and returns true if they match. If not, we return an error.

4. Lastly we just return the `User`-object if it passes all of the previous check. Note that we are only returning either Errors or a User, just like we defined `UserResponse`-inputtype.

Test it out on http://localhost:4000/graphql by

```ts
mutation {
  login(options: { username: "swayne", password: "swayne" }) {
    errors {
      field
      message
    }
    user {
      id
      username
    }
  }
}
```

Cookies are sometimes a little inconsistent. Don't hesitate to leave a comment if you are having issues.

Let's implement similar valididation for `registration()`:

```ts
@Resolver()
export class UserResolver {
    @Mutation(() => UserResponse)
    async register(
        @Arg("options") options: UsernamePasswordInput,
        @Ctx() {req} : any
    ): Promise<UserResponse> {

    //username validation
    if (options.username.length <= 2) {
      return {
        errors: [
          {
            field: "username",
            message: "length must be greater than 2",
          },
        ],
      };
    }
    //password validation
    if (options.password.length <= 2) {
      return {
        errors: [
          {
            field: "password",
            message: "password must be greater than 2",
          },
        ],
      };
    }
    const hashedPassword = await argon2.hash(options.password);
    let user: User | undefined = undefined;
    try {
    user = await User.create({
      username: options.username,
      password: hashedPassword,
    }).save();
    } catch(err) {        
        if (err.errno === 19) {
            return {
              errors: [
                {
                  field: "username",
                  message: "username already taken",
                },
              ],
            };
        }
    }
    return { user };
  }
```

A few extra lines, but they are pretty similar, so don't feel overwhelmed.

First we check if the user-inputted passwords and usernames are of a length greater than `2`. Note, you may want a longer password in non-testing purposes.

After hashing the password, we use a `try` `catch` block. We try to create and save a user to the database. If it fails, we return an error. In SQL-lite, the `err.errno=19` is the "username already exists"-error, so we return a fitting error message. You can find the error code by `console.log(err)` and then triggering an error in the GraphQL playground. Look in the console logs for the error code.

To make sure the user doesn't need to login every time, we will store a cookie with the user's information on it. We will use a `Redis-server` for this purpose, which you can install on the website.

## Sessions and cookies 🍪

Let's go through the setup and at the end, let's discuss how cookies and sessions work.

We will have to add Redis and express-session plus their types.

```zsh
yarn add redis connect-redis express-session
yarn add -D @types/redis
yarn add -D @types/express-session @types/connect-redis
```

We will just use the sample redis setup from the Docs, and configure a few cookie-related things:

```ts
const RedisStore = connectRedis(session)
const redisClient = redis.createClient()

  app.use(
    session({
      name: 'qid',
      store: new RedisStore({
        client: redisClient,
        disableTouch: true,
      }),
      cookie: {
        maxAge: 10000000000, //long time
        httpOnly: true,
        secure: false,  //cookie only works in https (we are developing)
        sameSite: 'lax'
      },
      saveUninitialized: false,
      secret: 'qiwroasdjlasddde', //you would want to hide this in production
      resave: false
    })
  )
```

we set the `name` to 'qid', the maxAge is how long before the cookie expires in ms. `localhost` isn't "https", so you should set `secure` to false, but definitely set it to true during production.

`sameSite` is a setting which controls who can set a cookie. We could also set it to 'strict' which means that a cookie can only be set if a user is directly on the site. If someone was following an email to your site, the cookie can't be set. The cookie only works in a first-party context. 'lax' allows users not directly on your site set a cookie, which is to be preferred right now.

`saveUninitialized:false` prevents a lot of empty session objects being saved at the store. When 'true', we save a session object at the end of the request, but in some cases we won't have anything useful to store.

The `secret` is a string, which redis uses to decrypt the cookie. More on that at the end.

`resave:false` tells redis that a particular session is still active, but we won't need this as we save the cookie with a (near) infinite age

Let's change our resolvers to use sessions:

```ts
async login(
    @Arg("options") options: UsernamePasswordInput,
    @Ctx() {req}: MyContext 
  ): Promise<UserResponse> {
    const user = await User.findOne({ username: options.username });
    if (!user) {
      return {
        errors: [{ field: "username", message: "username doesn't exist" }],
      };
    }
    const valid = await argon2.verify(user.password, options.password);
    if (!valid) {
      return {
        errors: [
          {
            field: "password",
            message: "that password doesn't exist",
          },
        ],
      };
    }
    req.session.userId = user.id;
    return { user };
  }
```

I make sure to get the request, `req`, from the `Ctx()`-decorator. The type, `MyContext` is an imported file:

```ts
export type MyContext = {
  req: Request & { session: Session & Partial<SessionData> & { userId?: number } }
  res: Response
  redis: Redis 
}
```

This it to avoid code-duplication and simplifies our code a lot.

Lastly, we store the current users `[user.id](http://user.id)` in the session, `req.session.userId`. In the real world, this means that auto-login is enabled.

To test it out, remember to set "request.credentials": "include", in graphql playground settings. You access the settings by clicking the top-right gear icon. After running this query:

```ts
mutation {
  login(options: { username: "swayne", password: "swayne" }) {
    errors {
      field
      message
    }
    user {
      id
      username
    }
  }
}
```

You can check that a cookie was set by opening chrome developer tools, opening the application tab and checking under the "cookies" tab:

![Chrome Inspector Application Cookies](https://res.cloudinary.com/practicaldev/image/fetch/s--aWX6R-XY--/c_limit%2Cf_auto%2Cfl_progressive%2Cq_auto%2Cw_880/https://dev-to-uploads.s3.amazonaws.com/uploads/articles/r8xgocki0932vvnk4xw2.png)

The code is exactly the same in register:

```ts
@Ctx() {req}: MyContext 
    //...
    //...
    //store user id session, auto-logs in after registration🤩
req.session.userId = user?.id
return { user };
```

I prefer when other sites auto log me in after registration, so I implement the same in my projects⚡️

## How do cookies and sessions work?

![Session process](https://res.cloudinary.com/practicaldev/image/fetch/s--IbkNVe83--/c_limit%2Cf_auto%2Cfl_progressive%2Cq_auto%2Cw_880/https://dev-to-uploads.s3.amazonaws.com/uploads/articles/8sigzrmq53o2q415hyzu.png)

First, we need to know what Redis is. Redis is a big key,value map, and if you know your data-structures, you know that given a key, we can get the corresponding value. If the user log-in is successful, we store their `user.id` into the session with the line:

```ts
req.session.userId = user.id;
```

Which then sends the data to Redis, eg. `{userId: 1}`

In Redis, we save that to a key (remember that Redis is a K,V-map):

`qwoaowkdaw`: `{userId:1}`

Express-session will then set a cookie, for example `wiqeoi4390i490` on the browser for the given `userId` just saved in the Key,Value-pair! If the user then makes a request, we send the cookie `wiqeoi4390i4901)` to the server. Our secret (the one set in `index.ts`) then decrypts the cookie and turns it into the key saved in redis, `wiqeoi4390i4901` → `qwoaowkdaw`

Finally, the server makes a request to Redis with the key that we just "decrypted" in the prior step, and gets the value `{userId: 1}`, and then stores it on `req.session` for the user to use

## Conclusion

Check out the code on [GitHub](https://github.com/lastnameswayne/blogpostsGraphQL/tree/auth) on the `auth` branch.
