#!/usr/bin/env node
'use strict';
/*eslint no-process-exit: 0*/
var Promise = require('bluebird');
var config = require('config');
var debug = require('debug')('mysql-migrate');
var fs = require('fs');
var mysql = require('mysql');
var path = require('path');
var sha1 = require('sha1');



var CRATE_MIGRATIONS_TABLE = [
  'create table if not exists migrations (',
  '  id           bigint(20)   not null primary key auto_increment',
  '  name         varchar(255) not null,',
  '  date         datetime     not null,',
  '  sha1sum      varchar(40)  not null,',
  '  executedAt   timestamp    not null default current_timestamp',
  ');'
].join('');

var LOCK_FOR_MIGRATION = [
  'insert into migrations(id, name, date, sha1sum) values ',
  "(1, '>> migration in progress <<', current_timestamp, '')"
].join('');
var UNLOCK_AFTER_MIGRATION = 'delete from migrations where id = 1';
var INSERT_MIGRATION =
'insert into migrations(name, date, sha1sum) values (?, ?, ?)';
var FIND_EXISTING_MIGRATIONS =
  'select id, name, date, sha1sum from migrations where id > 1 order by name';

function lpad(str, padChar, totalLength) {
  str = str.toString();
  var neededPadding = totalLength - str.length;
  for (var i = 0; i < neededPadding; i++) {
    str = padChar + str;
  }
  return str;
}

function formatDate(date) {
  return [
    date.getUTCFullYear(),
    lpad(date.getUTCMonth() + 1, '0', 2),
    lpad(date.getUTCDate(), '0', 2),
    lpad(date.getUTCHours(), '0', 2),
    lpad(date.getUTCMinutes(), '0', 2),
    lpad(date.getUTCSeconds(), '0', 2)
  ].join('');
}

function parseDate(name) {
  var date = new Date();
  var match = name
  .match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})-[^\.]+/);
  date.setUTCFullYear(match[1]);
  date.setUTCDate(match[3]);
  date.setUTCMonth(match[2] - 1);
  date.setUTCHours(match[4]);
  date.setUTCMinutes(match[5]);
  date.setUTCSeconds(match[6]);
  return date;
}

/**
 * Creates a new migration instance.
 * @param {Object} options                    configuration parameters
 * @param {String} [migrationsDir=migrations] directory to look for and store
 *                                            migration SQL scripts
 * @param {Object} options.dbConfig           parameters for node-mysql's
 *                                            `createConnection` function
 */
function create(options) {
  options = options || {};
  var migrationsDir = options.migrationsDir || path.join('migrations');
  var dbConfig = options.dbConfig;
  dbConfig.multipleStatements = true;

  function create(name) {
    name = name || 'unnamed';
    var date = formatDate(new Date());
    var file = path.join(migrationsDir, date + '-' + name + '.sql');
    fs.writeFileSync(file, '-- migration script --');
    debug('created migration file:', file);
  }

  function _readFile(filename) {
    try {
      var date = parseDate(filename);
    } catch (err) {
      throw new Error('Error parsing date from filename', err);
    }
    var content = fs.readFileSync(path.join(migrationsDir, filename), 'utf-8');
    var sha1sum = sha1(content);

    return {
      name: filename,
      date: date,
      content: content,
      sha1sum: sha1sum
    };
  }

  function _findMigrations() {
    debug('searching: %s', migrationsDir);
    return fs.readdirSync(migrationsDir)
    .filter(function(file) {
      return file.endsWith('.sql');
    })
    .sort()
    .map(function(file) {
      return _readFile(file);
    });
  }

  function _filterMigrations(allExecuted, allFiles) {
    if (allExecuted.length > allFiles.length) {
      throw new Error('more migration records in database than there is files');
    }

    allExecuted.forEach(function(executed, i) {
      var file = allFiles[i];
      if (!file) throw new Error('file ' + executed.name + ' not found');

      if (executed.name !== file.name) {
        throw new Error(
          'migration names do not match - ' + executed.name + ' vs ' + file.name
        );
      }

      if (executed.sha1sum !== file.sha1sum) {
        throw new Error('sha1sum mismatch for file: ' + file.name);
      }
    });

    return allFiles.slice(allExecuted.length);
  }

  function migrate(max) {
    var conn = Promise.promisifyAll(mysql.createConnection(dbConfig));

    var migrationStarted = false;
    return conn.connectAsync()
    .then(function() { return conn.queryAsync(CRATE_MIGRATIONS_TABLE); })
    .then(function() { return conn.queryAsync(LOCK_FOR_MIGRATION); })
    .catch(function(err) {
      if (err.code === 'ER_DUP_ENTRY') {
        err = new Error('another migration in progress');
        err.code = 'MIGRATION_IN_PROGRESS';
      }
      throw err;
    })
    .then(function() {
      migrationStarted = true;
      return conn.queryAsync(FIND_EXISTING_MIGRATIONS);
    })
    .then(function(allExecuted) {
      var allFiles = _findMigrations();
      debug('found:     %s', allFiles.length);
      return _filterMigrations(allExecuted, allFiles).slice(0, max);
    })
    .then(function(filesToBeExecuted) {
      debug('will exec: %s', filesToBeExecuted.length);
      if (filesToBeExecuted.length === 0) return;
      return filesToBeExecuted.reduce(function(promise, file) {
        return promise.then(function() {
          debug('migrating: %s', file.name);
          return conn.queryAsync(file.content);
        })
        .then(function() {
          return conn.queryAsync(INSERT_MIGRATION, [
            file.name, file.date, file.sha1sum
          ]);
        });
      }, Promise.resolve());
    })
    .catch(function(err) {
      console.error('error:    ', err.message);
    })
    .finally(function() {
      if (migrationStarted) return conn.queryAsync(UNLOCK_AFTER_MIGRATION);
    })
    .finally(function() {
      return conn.endAsync();
    });
  }

  return {
    create: create,
    migrate: migrate
  };
}

module.exports.create = create;
