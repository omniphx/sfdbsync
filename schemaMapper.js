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
            default:
                throw 'No attribues for field type: ' + field.type;
                break;
        }
    }
};