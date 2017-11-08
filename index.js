const Sequelize = require('sequelize');
const SchemaMapper = require('./schemaMapper.js');
const QueryGenerator = require('./queryGenerator.js');
const jsforce = require('jsforce');

const config = {
    loginUrl: process.env.LOGIN_URL
};

const username = process.env.SF_USERNAME;
const password = process.env.PASSWORD;
const securityToken = process.env.SECURITY_TOKEN;

const excludedTables = [
    'RecentlyViewed',
    'CollaborationGroupRecord',
    'ContentFolderMember',
    'KnowledgeArticleVersion',
    'ContentDocumentLink',
    'AuraDefinitionBundleInfo',
    'DataType',
    'ContentFolderLink',
    'CronJobDetail',
    'DashboardComponent',
    'IdpEventLog',
    'DatacloudAddress',
    'EmbeddedServiceDetail',
    'EventBusSubscriber',
    'ForecastingUserPreference',
    'KnowledgeArticleViewStat',
    'DataStatistics',
    'EntityParticle',
    'FlexQueueItem',
    'Publisher',
    'KnowledgeArticleVoteStat',
    'ListViewChartInstance',
    'FeedAttachment',
    'PicklistValueInfo',
    'OwnerChangeOptionInfo',
    'RelationshipInfo',
    'RelationshipDomain',
    'UserRecordAccess',
    'UserFieldAccess',
    'ApexPageInfo',
    'UserEntityAccess',
    'ThirdPartyAccountLink',
    'UserAppMenuItem',
    'LoginHistory',
    'AuraDefinitionInfo',
    'EntityDefinition'];

const excludedFieldTypes = [
    'location',
    'complexvalue',
    'address',
    'datacategorygroupreference',
    'anyType'];
    
global.connection = new jsforce.Connection(config);
global.sequelize = new Sequelize({
    dialect: 'sqlite',
    // storage: '/mnt/c/Users/matthew.mitchener/Development/NodeJS/sfdbsync/test.db'
    storage: 'C:\\Users\\matthew.mitchener\\Development\\NodeJS\\sfdbsync\\test.db',
    logging: false
});
global.schemaMapper = new SchemaMapper();
queryGenerator = new QueryGenerator();

global.connection.login(username, password + securityToken)
    .then(() => sync())
    .catch(handleError);

// global.connection.login(username, password + securityToken)
//     .then(() => {
//         return createTable('Team__c', teamObject.fields)
//     })
//     .then(objectSchema => {
//         return getLastModifiedDate(objectSchema);
//     })
//     .then(objectSchema => {
//         return getSalesforceRecords(objectSchema);
//     })
//     .then(queryResults => {
//         return syncRecords(queryResults);
//     })
//     .catch(handleError);

function handleError(result) {
    if(result.stack) {
        console.error(result.stack);
    } else {
        console.error(result);
    }
}

function sync() {
    return getSObjects()
        .then(sobjects => {
            return describeSObjects(sobjects);
        })
        .catch(handleError);
}

function getSObjects() {
    return new Promise((resolve, reject) => {
        global.connection.describeGlobal()
            .then(result => resolve(result.sobjects))
            .catch(handleError);
    });
}

function describeSObjects(sobjects) {
    return Promise.all(sobjects.map(sobject => {
        if(!sobject.queryable) return;
        if(sobject.name.includes('__kav')) return;
        if(sobject.name.includes('__ViewStat')) return;
        if(sobject.name.includes('__VoteStat')) return;
        if(sobject.name.includes('__mdt')) return;
        if(excludedTables.includes(sobject.name)) return;
        // if(sobjects[28] !== sobject) return;
        // console.log(sobject.name);
        return getFields(sobject.name)
            .then(fields => {
                return createTable(sobject.name, fields)
            })
            .then(objectSchema => {
                return describeTable(objectSchema);
            })
            .then(objectSchema => {
                return getLastModifiedDate(objectSchema);
            })
            .then(objectSchema => {
                return getSalesforceRecords(objectSchema);
            })
            .then(queryResults => {
                return syncRecords(queryResults);
            })
            .catch(handleError);
    }));
}

function getFields(objectName) {
    return new Promise((resolve, reject) => {
        global.connection.sobject(objectName).describe()
            .then(sobjectResult => resolve(sobjectResult.fields))
            .catch(handleError);
    });
}

function createTable(objectName, fields) {
    return new Promise((resolve, reject) => {
        const schemaFields = {};
        if(typeof fields === 'undefined') {
            console.error(objectName + ' has no fields');
            resolve();
        }
        fields.map(field => {
            if(excludedFieldTypes.includes(field.type)) return;
            schemaFields[field.name] = schemaMapper.getColumnAttributes(field);
            return;
        });

        global.sequelize.queryInterface.createTable(objectName, schemaFields)
            .then(results => {
                resolve({
                    "objectName" : objectName,
                    "fields" : Object.keys(schemaFields)})
            })
            .catch(results => {
                console.error('Create table error');
                reject(results);
            });
    });
}

function describeTable(objectSchema) {
    return new Promise((resolve, reject) => {
        global.sequelize.queryInterface.describeTable(objectSchema.objectName)
            .then(table => {
                objectSchema.table = table;
                resolve(objectSchema);
            })
            .catch(error => {
                console.log('Describe Table issues')
                reject(error)
            });
    });
}

function getLastModifiedDate(objectSchema) {
    return new Promise((resolve, reject) => {
        let fieldName = 'CreatedDate';
        if(objectSchema.table.hasOwnProperty('SystemModstamp')) {
            fieldName = 'SystemModstamp';
        } else if(objectSchema.table.hasOwnProperty('LastModifiedDate')) {
            fieldName = 'LastModifiedDate'
        }

        let attributes = {};
        attributes[fieldName] = {"type" : Sequelize.STRING};

        let options = {
            "timestamps" : false,
            "freezeTableName" : true
        };

        let ObjectModel = global.sequelize.define(objectSchema.objectName,attributes, options);

        ObjectModel.max(fieldName)
            .then(lastModifiedDate => {
                if(!lastModifiedDate) lastModifiedDate = '1900-01-01T00:00:00Z';
                let timeStampObject = {
                    "fieldName": fieldName,
                    "time": lastModifiedDate
                };
                objectSchema.timeStamp = timeStampObject;
                resolve(objectSchema);
            })
            .catch(error => {
                console.error(objectSchema.objectName + ': ' + fieldName);
            });
    });
}

function getSalesforceRecords(objectSchema) {
    return new Promise((resolve, reject) => {
        let queryString = queryGenerator.generate(objectSchema);
        global.connection.query(queryString)
            .then(result => {
                if(result.done) {
                    resolve(result.records);
                } else {
                    //queryMore
                }
            })
            .catch(result => reject(result));
    });
}

function syncRecords(records) {
    return new Promise((resolve, reject) => {
        if(records.length <= 0) {
            resolve(0);
            return;
        }

        let objectName = records[0].attributes.type;
        let recordIds = [];

        records.map(record => {
            delete record.attributes;
            recordIds.push(record.Id);
            return;
        });

        global.sequelize.queryInterface.bulkDelete(objectName, {
            "Id": {"in": recordIds}})
            .then(result => {
                global.sequelize.queryInterface.bulkInsert(objectName, records)
                    .then(result => {
                        resolve(result);
                    })
                    .catch(result => {
                        console.error(objectName + ': Bulk insert error');
                        reject(result);
                    })
            })
            .catch(result => reject(result));
    });
}