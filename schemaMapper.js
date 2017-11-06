const Sequelize = require('sequelize');

module.exports = class SchemaMapper {
    getColumnAttributes (field) {
        switch (field.type) {
            case 'id':
                return {
                    type : Sequelize.STRING,
                    primaryKey : true
                }
            case 'reference':
                return {
                    type : Sequelize.STRING,
                }
            case 'boolean':
                return {
                    type : Sequelize.BOOLEAN,
                    allowNull: false
                }
            case 'string':
                return {
                    type : Sequelize.STRING,
                }
            case 'datetime':
                return {
                    type : Sequelize.DATE,
                }
            case 'picklist':
                return {
                    type : Sequelize.DATE,
                }
            case 'int':
                return {
                    type: Sequelize.INTEGER
                }
            case 'complexvalue':
                console.error(field.name + 'not supported');
                return {
                    type: Sequelize.TEXT
                }
            case 'textarea':
                return {
                    type: Sequelize.TEXT
                }
            case 'double':
                return {
                    type: Sequelize.DOUBLE
                }
            case 'email':
                return {
                    type: Sequelize.STRING
                }
            case 'time':
                return {
                    type: Sequelize.DATE
                }
            case 'url':
                return {
                    type: Sequelize.STRING
                }
            case 'phone':
                return {
                    type: Sequelize.STRING
                }
            case 'base64':
                return {
                    type: Sequelize.BLOB
                }
            case 'anyType':
                console.error(field.name + 'not supported');
                return {
                    type: Sequelize.TEXT
                }
            case 'currency':
                return {
                    type: Sequelize.STRING
                }
            case 'datacategorygroupreference':
                console.error(field.name + 'not supported');
                return {
                    type: Sequelize.TEXT
                }
            case 'date':
                return {
                    type: Sequelize.DATEONLY
                }
            case 'address':
                console.error(field.name + 'not supported');
                return {
                    type: Sequelize.TEXT
                }
            case 'multipicklist':
                return {
                    type: Sequelize.STRING
                }
            case 'combobox':
                return {
                    type: Sequelize.STRING
                }
            case 'percent':
                return {
                    type: Sequelize.DOUBLE
                }
            case 'encryptedstring':
                return {
                    type: Sequelize.STRING
                }
            default:
                throw 'No attribues for field type: ' + field.type;
                break;
        }
    }
};