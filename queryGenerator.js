module.exports = class QueryGenerator {
    generate (objectSchema) {
        let queryComponents = [];
        queryComponents.push('SELECT');
        queryComponents.push(objectSchema.fields.join(','));
        queryComponents.push('FROM');
        queryComponents.push(objectSchema.objectName);
        queryComponents.push('WHERE SystemModStamp > ' + objectSchema.lastModifiedDate);
    
        return queryComponents.join(' ');
    }
};