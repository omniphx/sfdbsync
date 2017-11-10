const Sequelize = require('sequelize');

module.exports = class ReplicationRepository {
    constructor(sequelize) {
        this.sequelize = sequelize;
    }
    
    createTable (objectName, columns) {
        return new Promise((resolve, reject) => {
            this.sequelize.queryInterface.createTable(objectName, columns)
                .then(results => {
                    resolve({
                        "objectName" : objectName,
                        "fields" : Object.keys(columns)})
                })
                .catch(results => {
                    console.error('Table error: ' + objectName);
                    reject(results);
                });
        });
    }
    
    describeTable (objectSchema) {
        return new Promise((resolve, reject) => {
            this.sequelize.queryInterface.describeTable(objectSchema.objectName)
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
    
    getLastModifiedDate (objectSchema) {
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
    
            let ObjectModel = this.sequelize.define(objectSchema.objectName,attributes, options);
    
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
    
    syncRecords (records) {
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
    
            this.sequelize.queryInterface.bulkDelete(objectName, {"Id": {"in": recordIds}})
                .then(result => {
                    this.sequelize.queryInterface.bulkInsert(objectName, records)
                        .then(result => {
                            console.log(records.length + ' ' + objectName + 's synced');
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
}