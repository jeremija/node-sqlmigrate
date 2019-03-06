'use strict'

const childProcess = require('child_process')
const expect = require('chai').expect
const path = require('path')
const fs = require('fs')

const sqlmigrate = path.join(__dirname, '../bin/sqlmigrate')

function exec(/* varargs */) {
  return childProcess.spawnSync(sqlmigrate, Array.from(arguments), {
    stdio: ['ignore', 'pipe', 'pipe']
  })
}

describe('sqlmigrate', () => {

  const configFile = path.join(__dirname, 'config.json')

  function removeConfigFile() {
    if (fs.existsSync(configFile)) {
      fs.unlinkSync(configFile)
    }
  }

  beforeEach(() => {
    removeConfigFile()
  })

  afterEach(() => {
    removeConfigFile()
  })

  ;['--help', 'help'].forEach(arg => {
    describe(arg, () => {
      it('prints help and exits', () => {
        const p = exec(arg)
        expect(p.status).to.equal(0)
        expect(p.error).not.to.be.ok
        expect(p.stderr.toString()).to.match(/^Usage: sqlmigrate/)
      })
    })
  })

  describe('init', () => {

    function init() {
      const p = exec('init', '--config=' + configFile)
      expect(p.status).to.equal(0)
      expect(p.error).not.to.be.ok
      expect(p.stderr.toString()).to.match(/writing config file/i)
      expect(p.stderr.toString()).to.match(new RegExp(configFile))
      const config = JSON.parse(fs.readFileSync(configFile))
      expect(config).to.eql({
        migrationsDir: 'migrations',
        migrationTable: 'migrations',
        driver: 'mysql',
        dbConfig: {
          database: 'mydb',
          host: '127.0.0.1',
          port: 3306,
          user: 'test',
          password: 'test'
        }
      })
    }

    it('initializes a config file', () => {
      init()
    })

    it('does not overwrite', () => {
      init()
      const p = exec('init', '--config=' + configFile)
      expect(p.error).not.to.be.ok
      expect(p.status).to.equal(1)
      expect(p.stderr.toString()).to.match(/config file exists/i)
    })

  })

  describe('create', () => {

    function create(name) {
      let p = exec('init', '--config=' + configFile)
      expect(p.error).not.to.be.ok
      p = exec('create', '--name=' + name, '--config=' + configFile)
      expect(p.status).to.equal(0)
      expect(p.error).not.to.be.ok
      return p
    }

    it('creates a migration script with custom name', () => {
      const p = create('file1')
      expect(p.stderr.toString())
      .to.match(/created migration file: migrations\/[0-9]+-file1.sql/)
    })

    it('creates a migration script with default name', () => {
      const p = create('')
      expect(p.stderr.toString())
      .to.match(/created migration file: migrations\/[0-9]+-new-migration.sql/)
    })

  })

  describe('migrate (no args)', () => {

    it('fails to read config file', () => {
      const p = exec()
      expect(p.status).to.equal(1)
      expect(p.error).not.to.be.ok
      expect(p.stderr.toString()).to.match(/config/i)
    })

    it('tries to perform a migration, but fails', () => {
      let p = exec('init', '--config=' + configFile)
      expect(p.error).not.to.be.ok
      p = exec('create=file1', '--config=' + configFile)
      expect(p.status).to.equal(0)
      expect(p.error).not.to.be.ok
      p = exec('--config=' + configFile)
      expect(p.status).to.equal(1)
      expect(p.error).not.to.be.ok
      expect(p.stderr.toString()).to.match(/migration error/i)
    })

  })

})
