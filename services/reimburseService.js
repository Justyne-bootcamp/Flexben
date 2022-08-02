const AWS = require('aws-sdk')
const dynamoDbClient = new AWS.DynamoDB.DocumentClient();

const dbQuery = async (params) => {
    try {
        const { Items } = await dynamoDbClient.query(params).promise();
        if (Items) {
            return Items
        } else {
            return 
        }
    } catch (error) {
        console.log(error);
    }
}

const addReimbursement = async (addReimbursementParams) => {
    try {
        const { UnprocessedItems } = await dynamoDbClient.batchWrite(addReimbursementParams).promise();
        if (UnprocessedItems) {
            return UnprocessedItems
        } else {
            return
        }
    } catch (error) {
        console.log(error);
    }
}

const getReimbursementItem = async (params) => {
    try {
        const { Item } = await dynamoDbClient.get(params).promise();
        return Item;
    } catch (error) {
        console.log(error);
    }
}
const deleteReimbursementItem = async (params) => {
    try {
        const { Item } = await dynamoDbClient.delete(params).promise();
        return Item;
    } catch (error) {
        console.log(error);
    }
}

module.exports = {
    dbQuery,
    addReimbursement,
    getReimbursementItem,
    deleteReimbursementItem
}
