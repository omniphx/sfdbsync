const Sequelize = require('sequelize');
const SchemaMapper = require('./schemaMapper.js');
const QueryGenerator = require('./queryGenerator.js');
const jsforce = require('jsforce');
const teamObject = require('./salesforce/objects/team.json');

const config = {
    loginUrl: process.env.LOGIN_URL
};

const username = process.env.SF_USERNAME;
const password = process.env.PASSWORD;
const securityToken = process.env.SECURITY_TOKEN;

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
        if(sobject.name === 'CollaborationGroupRecord') return;
        if(sobject.name === 'ContentFolderMember') return;
        if(sobject.name === 'KnowledgeArticleVersion') return;
        if(sobject.name === 'ContentDocumentLink') return;
        return getFields(sobject.name)
            .then(fields => {
                return createTable(sobject.name, fields)
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
            if(field.type === 'complexvalue') return;
            if(field.type === 'address') return;
            if(field.type === 'datacategorygroupreference') return;
            if(field.type === 'anyType') return;
            schemaFields[field.name] = schemaMapper.getColumnAttributes(field);
            return;
        });

        global.sequelize.queryInterface.createTable(objectName, schemaFields)
            .then(results => {
                resolve({
                    "objectName" : objectName,
                    "fields" : Object.keys(schemaFields)})
            })
            .catch(results => reject());
    });
}

function getLastModifiedDate(objectSchema) {
    return new Promise((resolve, reject) => {
        const ObjectModel = global.sequelize.define(objectSchema.objectName,
            {
                SystemModStamp : {
                    type: Sequelize.STRING
                },
                lastModifiedDate : {
                    type: Sequelize.STRING
                },
                CreatedDate : {
                    type: Sequelize.STRING
                }
            },
            {
                timestamps: false,
                freezeTableName: true
            });

        return getMaxTimeStamp(ObjectModel, 'SystemModStamp')
            .then(timeStampObject => {
                objectSchema.timeStamp = timeStampObject;
                resolve(objectSchema)
            })
            .catch(error => {
                if(error.noColumn) {
                    return getMaxTimeStamp(ObjectModel, 'LastModifiedDate')
                        .then(timeStampObject => {
                            objectSchema.timeStamp = timeStampObject;
                            resolve(objectSchema);
                        })
                        .catch(error => {
                            if(error.noColumn) {
                                return getMaxTimeStamp(ObjectModel, 'CreatedDate')
                                    .then(timeStampObject => {
                                        objectSchema.timeStamp = timeStampObject;
                                        resolve(objectSchema);
                                    })
                                    .catch(error => reject(error));
                            } else {
                                reject(error);
                            }
                        });
                } else {
                    reject(error.error);
                }
            });
    });
}

function getMaxTimeStamp(ObjectModel, fieldName) {
    return new Promise((resolve, reject) => {
        ObjectModel.max(fieldName)
            .then(lastModifiedDate => {
                if(!lastModifiedDate) lastModifiedDate = '1900-01-01T00:00:00Z';
                let timeStampObject = {
                    "fieldName": "SystemModStamp",
                    "time": lastModifiedDate
                };
                resolve(timeStampObject);
            })
            .catch(error => {
                if(error === 'DatabaseError: SQLITE_ERROR: no such column:' + fieldName) {
                    reject({"noColumn":true});
                } else {
                    reject({"noColumn":false, "message":error});
                }
            });
    });
}

function getSalesforceRecords(objectSchema) {
    return new Promise((resolve, reject) => {
        let queryString = queryGenerator.generate(objectSchema);
        // console.log(queryString);

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
            })
            .catch(result => reject(result))

    });
}