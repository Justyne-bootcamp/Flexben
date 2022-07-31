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

const getCategories = async (params) => {
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

const getCutOffs = async (params) => {
    try {
        const { Items } = await dynamoDbClient.scan(params).promise();
        if (Items) {
            // sort-descending by year then by cutoff cycle
            return Items.sort((a, b) => b.year.localeCompare(a.year) || b.cutOffCycle - a.cutOffCycle)
        } else {
            return
        }
    } catch (error) {
        console.log(error);
    }
}

module.exports = {
    login,
    getCategories,
    getCutOffs
}
