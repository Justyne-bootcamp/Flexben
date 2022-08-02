const AWS = require('aws-sdk')
const dynamoDbClient = new AWS.DynamoDB.DocumentClient();

// charles
const checkIfExistingReimbursement = async (params) => {
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

// charles
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

// charles
const getSum = async (getSumParams) => {
    try {
        const { Items } = await dynamoDbClient.query(getSumParams).promise();
        if (Items) {
            let totalReimbursementAmount = 0
            Items.forEach(item => {
                totalReimbursementAmount = totalReimbursementAmount + item.amount
            })
            return totalReimbursementAmount
        } else {
            return
        }
    } catch (error) {
        console.log(error);
    }
}

// alex
const getReimbursement = async (params) => {
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

// alex
const reimbursementList = async (params) => {
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

//Justyne
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
    checkIfExistingReimbursement,
    addReimbursement,
    getSum,
    reimbursementList,
    getReimbursement,
    getReimbursementItem,
    deleteReimbursementItem
}
