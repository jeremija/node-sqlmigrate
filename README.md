# sqlmigrate

Helps automating MySQL migrations written in plain `.sql` scripts.

# usage

## library

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

## Example Javascript file for .sqlmigrate

```javascript
function start() {
  return {
    migrationsDir: 'src/db/migrations',
    dbConfig: {
      database: 'dbName',
      host: '127.0.0.1',
      port: '3306',
      user: 'user',
      password: 'password'
    }
  };
}

module.exports = start();
```

## cli

`sqlmigrate` script will attempt to read the json or node module from the
current working directory named `.sqlmigrate`.

```bash
npm install sqlmigrate

# create a new migration script
sqlmigrate create 'new-migration'

# perform the migrations
sqlmigrate

# perform the first 2 migrations
sqlmigrate 2
```

# license

MIT
