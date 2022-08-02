const AWS = require('aws-sdk')
const dynamoDbClient = new AWS.DynamoDB.DocumentClient();

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


const getReimbursementByCutOff = async (getReimbursementByCutOffParams) => {
    try {
        const { Items } = await dynamoDbClient.scan(getReimbursementByCutOffParams).promise();

        if (Items) {
            return Items
        } else {
            return
        }
    } catch (error) {
        console.log(error);
    }
}

const getReimbursement = async (params) => {
    try {
        const { Items } = await dynamoDbClient.scan(params).promise();
        if (Items != 0) {
            return Items
        } else {
            return 0
        }
    } catch (error) {
        console.log(error);
    }
}

const approvalReimbursement = async (params) => {
    try {
        const approveItems = params.map(async (item) => {
            await dynamoDbClient.update(item).promise();
        });

        await Promise.all(approveItems);
        if (approveItems != 0) {
            return 1
        } else {
            return 0
        }
    } catch (error) {
        console.log(error);
    }
}

module.exports = {
    dbScan,
    getReimbursementByCutOff,
    approvalReimbursement,
    getReimbursement,
}