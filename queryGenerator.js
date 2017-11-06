module.exports = class QueryGenerator {
    generate (objectSchema) {
        let queryComponents = [];
        queryComponents.push('SELECT');
        queryComponents.push(objectSchema.fields.join(','));
        queryComponents.push('FROM');
        queryComponents.push(objectSchema.objectName);
        queryComponents.push('WHERE ' + objectSchema.timeStamp.fieldName + ' > ' + objectSchema.timeStamp.time);
    
        return queryComponents.join(' ');
    }
};