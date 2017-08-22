'use strict';
var Bluebird = require('bluebird');
var expect = require('chai').expect;
var fs = require('fs');
var lib = require('../lib.js');
var mysql = require('mysql');
var path = require('path');

var dbConfig = {
  database: 'sqlmigrate_test',
  host: '127.0.0.1',
  port: 3306,
  user: 'travis',
  password: ''
};

function createConnection() {
  return Bluebird.promisifyAll(mysql.createConnection(dbConfig));
}

describe('lib', () => {
  describe('create()', () => {
    it('should be a function', () => {
      expect(lib.create).to.be.a('function');
    });
    it('should return a new migrator instance', () => {
      var migrator = lib.create({
        dbConfig: dbConfig,
        migrationsDir: path.join(__dirname, 'migrations')
      });
      expect(migrator.createMigration).to.be.a('function');
      expect(migrator.migrate).to.be.a('function');
    });
  });

  describe('createMigration()', () => {

    var migrator, migrationsDir = path.join(__dirname, '_migrations_');

    beforeEach(() => {
      migrator = lib.create({
        dbConfig: dbConfig,
        migrationsDir: migrationsDir
      });
    });

    afterEach(() => {
      fs.readdirSync(migrationsDir).forEach(file => {
        fs.unlinkSync(path.join(migrationsDir, file));
      });
      fs.rmdirSync(migrationsDir);
    });

    it('should create a new migration script', () => {
      migrator.createMigration('my-migration');

      var files = fs.readdirSync(migrationsDir);
      expect(files.length).to.equal(1);
      expect(files[0]).to.match(/^[0-9]{14}-my-migration.sql$/);

      var content = fs
      .readFileSync(path.join(migrationsDir, files[0]), 'utf-8');
      expect(content).to.equal('-- migration script --');
    });

    it('should create a new "unnamed" migration script', () => {
      migrator.createMigration();

      var files = fs.readdirSync(migrationsDir);
      expect(files.length).to.equal(1);
      expect(files[0]).to.match(/^[0-9]{14}-unnamed.sql$/);

      var content = fs
      .readFileSync(path.join(migrationsDir, files[0]), 'utf-8');
      expect(content).to.equal('-- migration script --');
    });

  });

  describe('migrate()', () => {

    var migrator;
    var migrationsDir = path.join(__dirname, 'migrations');
    var conn;

    beforeEach(() => {
      conn = createConnection();
      migrator = lib.create({
        dbConfig: dbConfig,
        migrationsDir: migrationsDir
      });
      return conn.connectAsync();
    });

    afterEach(() => {
      return conn.queryAsync('drop table if exists migrations')
      .then(() => conn.queryAsync('drop table if exists users'))
      .finally(() => conn.endAsync());
    });

    it('should execute all migrations and document it', () => {
      return migrator.migrate()
      .then(() => conn.queryAsync('select * from migrations'))
      .then(migrations => expect(migrations.length).to.equal(3))
      .then(() => conn.queryAsync('select * from users'))
      .then(users => expect(users.length).to.equal(2));
    });

    it('should execute only non-executed migrations', () => {
      return migrator.migrate(2)
      .then(() => conn.queryAsync('select * from migrations'))
      .then(migrations => {
        expect(migrations.length).to.equal(2);
        expect(migrations[0].name).to.equal('20160212060000-migration1.sql');
        expect(migrations[1].name).to.equal('20160212070000-migration2.sql');
      })
      .then(() => conn.queryAsync('select * from users'))
      .then(users => expect(users.length).to.equal(1));
    });

    it('should execute only x number of migrations', () => {
      return migrator.migrate(2)
      .then(() => conn.queryAsync('select * from migrations'))
      .then(migrations => expect(migrations.length).to.equal(2))

      .then(() => migrator.migrate(2))
      .then(() => conn.queryAsync('select * from migrations'))
      .then(migrations => expect(migrations.length).to.equal(3))

      .then(() => migrator.migrate())
      .then(() => conn.queryAsync('select * from migrations'))
      .then(migrations => expect(migrations.length).to.equal(3));
    });

    it('should abort when another migration is in progress', done => {
      return migrator.migrate(0)
      .then(() => conn.queryAsync(
        'insert into migrations(id, name, date, sha1sum) values ' +
        "(1, '>> migration in progress <<', current_timestamp, '')"
      ))
      .then(() => migrator.migrate())
      .asCallback(err => {
        expect(err).to.be.ok;
        expect(err.message).to.equal('another migration in progress');
        done();
      });
    });

    function createMigrator(dir) {
      return lib.create({
        dbConfig: dbConfig,
        migrationsDir: path.join(__dirname, dir)
      });
    }

    [
      [],
      [undefined, true]
    ]
    .forEach(args => {
      const strArgs = JSON.stringify(args)
      .replace(/^\[/, '')
      .replace(/\]$/, '');

      describe(`args: migrate(${strArgs})`, () => {

        it('should validate filenames', done => {
          return migrator.migrate.apply(migrator, args)
          .then(() => {
            const m = createMigrator('migrations-invalid-filename');
            return m.migrate.apply(m, args);
          })
          .asCallback(err => {
            expect(err).to.be.ok;
            expect(err.message).to.equal(
              'error parsing date from filename'
            );
            done();
          });
        });

        it('should verify migration checksums', done => {
          return migrator.migrate()
          .then(() => {
            const m = createMigrator('migrations-invalid-checksums');
            return m.migrate.apply(m, args);
          })
          .asCallback(err => {
            expect(err).to.be.ok;
            expect(err.message).to.equal(
              'sha1sum mismatch for file: 20160212070000-migration2.sql'
            );
            done();
          });
        });

        it('should verify migration order', done => {
          return migrator.migrate.apply(migrator, args)
          .then(() => {
            const m = createMigrator('migrations-invalid-order');
            return m.migrate.apply(m, args);
          })
          .asCallback(err => {
            expect(err).to.be.ok;
            expect(err.message).to.equal(
              'file 20160212080000-migration3.sql not found'
            );
            done();
          });
        });

        it('should verify migration names', done => {
          return migrator.migrate()
          .then(() => {
            const m = createMigrator('migrations-invalid-names');
            return m.migrate.apply(m, args);
          })
          .asCallback(err => {
            expect(err).to.be.ok;
            expect(err.message).to.match(/20160212070000-migration2\.sql/);
            done();
          });
        });

      });

    });

    describe('extra tests args: migrate(null, true)', () => {

      it('should exuecte migrations even if out of order', () => {
        return createMigrator('migrations-unordered-1')
        .migrate(undefined, true)
        .then(() =>
          createMigrator('migrations-unordered-2').migrate(undefined, true)
        )
        .then(() => conn.queryAsync('select * from migrations'))
        .then(migrations => expect(migrations.length).to.equal(3));
      });

    });

    it('fails when invalid db configuration', done => {
      lib.create({
        dbConfig: {
          database: 'sqlmigrate_test_invalid',
          host: '127.0.0.1',
          port: 3306,
          user: 'travis_invalid',
          password: ''
        },
        migrationsDir: path.join(__dirname, 'migrations')
      })
      .migrate()
      .asCallback(err => {
        expect(err).to.be.ok;
        expect(err).to.match(/access denied/i);
        done();
      });
    });

  });
});
