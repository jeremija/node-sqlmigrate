# sqlmigrate

[![Build Status](https://travis-ci.org/jeremija/node-sqlmigrate.svg?branch=master)](https://travis-ci.org/jeremija/node-sqlmigrate)

Helps automating MySQL migrations written in plain `.sql` scripts.

**Note:** The CLI utility API has changed in v2.

# Usage

## Library

```javascript
require('sqlmigrate').create({
  migrationsDir: 'db/migrations',
  dbConfig: {
    database: 'sqlmigrate_test',
    host: '127.0.0.1',
    port: 3306,
    user: 'travis',
    password: ''
  }
})
.migrate();
```

## CLI

`sqlmigrate` script will attempt to read the config file from the current
working directory named `.sqlmigrate`:

```javascript
// .sqlmigrate example
module.exports = {
  migrationsDir: 'src/db/migrations',
  dbConfig: {
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS
  }
};
```

### Installation

```bash
$ npm install sqlmigrate
$ export PATH="$(PWD)/node_modules/.bin:$(PATH)"

# or

$ npm install -g sqlmigrate
```

### CLI help

```bash
$ sqlmigrate --help

Usage: sqlmigrate [command] [args...]

Migration will be performed when no command is specified.

The default command accepts the following optional args:

  --config=file  config file to use, default is .sqlmigrate
  --max=n        max number of migrations to perform
  --any-order    do not fail if there are new migrations
                 created before the last executed migration

Commands:
  create [--name=string]  creates a migration
  help                    prints this help
  init                    initialize config file
```

### Initize config

```bash
$ sqlmigrate init [--config=/path/to/file]
```

### Creating a migration script

```bash
$ sqlmigrate create --name='new-migration' [--config=/path/to/file]
```

### Execute migrations

```bash
$ sqlmigrate [--config=/path/to/file]
```

### Execute first two migrations

```bash
$ sqlmigrate --max=2
```

### Perform the migrations, ignoring the order of currently executed migrations

```bash
$ sqlmigrate --any-order
```

# License

[MIT](LICENSE)
