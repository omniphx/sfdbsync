const Sequelize = require('sequelize');
const SchemaMapper = require('./schemaMapper.js');
const jsforce = require('jsforce');
const SalesforceSyncer = require('./salesforceSyncer');

const config = {
    loginUrl: process.env.LOGIN_URL
};

const username = process.env.SF_USERNAME;
const password = process.env.PASSWORD;
const securityToken = process.env.SECURITY_TOKEN;
    
const connection = new jsforce.Connection(config);
const sequelize = new Sequelize({
    dialect: process.env.DIALECT,
    storage: process.env.STORAGE,
    logging: false
});

const salesforceSyncer = new SalesforceSyncer(sequelize, connection);

salesforceSyncer.sync(username, password, securityToken);