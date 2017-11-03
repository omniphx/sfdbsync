const Sequelize = require('sequelize');
const SchemaMapper = require('./schemaMapper.js');
const Umzug = require('umzug');
const team = require('./salesforce/objects/team.json');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: '/Users/mjmitchener/Projects/NodeApps/sfdbsync/test.db'
});
const schemaMapper = new SchemaMapper();

const tableOptions = {};

team.fields.map(field => {
    tableOptions[field.name] = schemaMapper.getColumnAttributes(field);
});

sequelize.queryInterface.createTable('User2', tableOptions);