const QueryGenerator = require('./queryGenerator.js');

module.exports = class SalesforceRepository {
    constructor(connection) {
        this.connection = connection;
        this.queryGenerator = new QueryGenerator();
    }

    authenticate (username, password, securityToken) {
        return new Promise((resolve, reject) => {
            this.connection.login(username, password + securityToken)
                .then(() => resolve())
                .catch(error => reject(error));
        })
    }

    getSObject () {
        return new Promise((resolve, reject) => {
            this.connection.describeGlobal()
                .then(result => resolve(result.sobjects))
                .catch(error => reject(error));
        });
    }
    
    getFields (objectName) {
        return new Promise((resolve, reject) => {
            this.connection.sobject(objectName).describe()
                .then(sobjectResult => resolve(sobjectResult.fields))
                .catch(error => reject(error));
        });
    }

    getRecords (objectSchema) {
        return new Promise((resolve, reject) => {
            let queryString = this.queryGenerator.generate(objectSchema);
            if(queryString.length > 20000) return reject('Query too long');
            this.connection.query(queryString)
                .then(result => {
                    if(result.done) {
                        resolve(result.records);
                    } else {
                        return this.queryMore(url, result.records);
                    }
                })
                .catch(result => {
                    console.log(queryString);
                    reject(result)
                });
        });
    }

    queryMore (url, records) {
        return new Promise((resolve, reject) => {
            this.connection.queryMore(url)
                .then(result => {
                    let allRecords = records.concat(result.records);
                    if(result.done) {
                        resolve(allRecords);
                    } else {
                        return this.queryMore(result.nextRecordsUrl, allRecords);
                    }
                })
                .catch(result => reject(result));
        });
    }

}