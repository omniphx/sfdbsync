const Sequelize = require('sequelize');
const SalesforceRepository = require('./salesforceRepository');
const ReplicationRepository = require('./replicationRepository');
const SchemaMapper = require('./schemaMapper.js');

module.exports = class SalesforceSyncer {
    constructor(sequelize, connection) {
        this.salesforceRepo = new SalesforceRepository(connection);
        this.replicationRepository = new ReplicationRepository(sequelize);
        this.schemaMapper = new SchemaMapper();

        this.excludedTables = [
            'Event',
            'ContentFolderItem',
            'Vote',
            'PlatformAction',
            'SearchLayout',
            'FieldDefinition',
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
        
        this.excludedFieldTypes = [
            'location',
            'complexvalue',
            'address',
            'datacategorygroupreference',
            'anyType'];
    }

    sync (username, password, securityToken) {
        return this.salesforceRepo.authenticate(username, password, securityToken)
            .then(() => {
                return this.salesforceRepo.getObject()
            })
            .then(objects => {
                return this.syncObjects(objects);
            })
            .catch(this.handleError);
    }

    syncObjects (objects) {
        return Promise.all(objects.map(sobject => {
            if(!sobject.queryable) return;
            if(sobject.name.includes('__kav')) return;
            if(sobject.name.includes('__ViewStat')) return;
            if(sobject.name.includes('__VoteStat')) return;
            if(sobject.name.includes('__mdt')) return;
            if(this.excludedTables.includes(sobject.name)) return;
            return this.salesforceRepo.getFields(sobject.name)
                .then(fields => {
                    return this.mapFieldsToColumns(fields);
                })
                .then(columns => {
                    return this.replicationRepository.createTable(sobject.name, columns)
                })
                .then(objectSchema => {
                    return this.replicationRepository.describeTable(objectSchema);
                })
                .then(objectSchema => {
                    return this.replicationRepository.getLastModifiedDate(objectSchema);
                })
                .then(objectSchema => {
                    return this.salesforceRepo.getRecords(objectSchema);
                })
                .then(queryResults => {
                    return this.replicationRepository.syncRecords(queryResults);
                })
                .catch(this.handleError);
        }));
    }

    mapFieldsToColumns (fields) {
        return new Promise((resolve, reject) => {
            const columns = {};
            fields.map(field => {
                if(this.excludedFieldTypes.includes(field.type)) return;
                columns[field.name] = this.schemaMapper.getColumnAttributes(field);
                return;
            });

            resolve(columns)
        });
    }

    handleError (result) {
        if(result.stack) {
            console.error(result.stack);
        } else {
            console.error(result);
        }
    }
}