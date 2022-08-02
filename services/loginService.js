const AWS = require('aws-sdk')
const dynamoDbClient = new AWS.DynamoDB.DocumentClient();

const login = async (params) => {
    try {
        const { Item } = await dynamoDbClient.get(params).promise();
        if (Item) {
            return Item
        } else {
            return 
        }
    } catch (error) {
        console.log(error);
    }
}

const updateToken = async (params) => {
    try {
        const  Item  = await dynamoDbClient.update(params).promise();
        if (Item) {
            return Item
        } else {
            return 
        }
    } catch (error) {
        console.log(error);
    }
}

const dbScan = async (params) => {
    try {
        const { Items } = await dynamoDbClient.scan(params).promise();
        if (Items) {
            return Items
        } else {
            return
        }
    } catch (error) {
        console.log(error);
    }
}

module.exports = {
    login,
    dbScan,
    updateToken
}
