# mysql-migrate

Helps automating plain SQL migration scripts for MySQL.

# usage

## library

```javascript
require('mysql-migrate').create({
  migrationsDir: 'db/migrations',
  dbConfig: {
    database: 'mysql_migrate',
    host: '127.0.0.1',
    port: 3306,
    user: 'travis',
    password: ''
  }
})
.migrate();
```

## cli

`sqlmigrate` script will attempt to read the json or node module from the
current working directory named `.sqlmigrate`.

```bash
npm install mysql-migrate

# create a new migration script
sqlmigrate create 'new-migration'

# perform the migrations
sqlmigrate

# perform the first 2 migrations
sqlmigrate 2
```

# license

MIT
