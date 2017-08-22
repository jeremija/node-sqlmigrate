# sqlmigrate

Helps automating MySQL migrations written in plain `.sql` scripts.

# usage

## as a library

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

## as a cli utility

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

```bash
$ npm install sqlmigrate
$ export PATH="$(PWD)/node_modules/.bin:$(PATH)"

# help
$ sqlmigrate --help

Usage: sqlmigrate [command]

Migration will be performed when no command is specified.

The default command accepts the following optional args:

  --max=n      max number of migrations to perform
  --any-order  do not fail if there are new migrations
               created before the last executed migration

Commands:
  create       creates a migration
  help         prints this help

# create a new migration script
$ sqlmigrate create 'new-migration'

# perform the migrations
$ sqlmigrate

# perform the first 2 migrations
$ sqlmigrate --max=2

# perform the migrations, ignoring the order of currently executed migrations
# in the datababase

$ sqlmigrate --any-order
```

# license

MIT
