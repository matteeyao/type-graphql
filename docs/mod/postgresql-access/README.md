# Creating user, database and adding access on PostgreSQL

> [!NOTE]
> Right off the bat — this is valid as on March 2017, running on Ubuntu 16.04.2, with PostgreSQL 9.6

TL;DR version:

```zsh
sudo -u postgres psql
postgres=# create database mydb;
postgres=# create user myuser with encrypted password 'mypass';
postgres=# grant all privileges on database mydb to myuser;
```

One nice thing about PGSQL is it comes w/ some utility binaries like **createuser** and **createdb**. So we will be making use of that.

As the default configuration of Postgres is, a user called **postgres** is made on and the user **postgres** has full superadmin access to entire PostgreSQL instance running on your OS.

```zsh
$ sudo -u postgres psql
```

The above command gets you the psql command line interface in full admin mode.

In the following commands, keep in mind the `< angular brackets >` are to denote variables you have to set yourself. In the actual command, omit the `< >`

## Creating user

```zsh
$ sudo -u postgres createuser <username>
```

## Creating database

```zsh
$ sudo -u <username> createdb <dbname>
```

## Giving the user a password

```zsh
$ sudo -u postgres psql
psql=# alter user <username> with encrypted password '<password>';
```

## Granting privileges on database

```zsh
psql=# grant all privileges on database "<dbname>" to <username> ;
```
