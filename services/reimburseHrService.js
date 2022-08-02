const AWS = require('aws-sdk')
const dynamoDbClient = new AWS.DynamoDB.DocumentClient();

// charles
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

// charles

const getDetailsHr = async (getDetailsHrParams) => {
    try {
        const { Items } = await dynamoDbClient.scan(getDetailsHrParams).promise();

        if (Items) {
            return Items
        } else {
            return
        }
    } catch (error) {
        console.log(error);
    }
}

const getEmployeeName = async (getEmployeeName) => {
    try {
        const {Items} = await dynamoDbClient.scan(getEmployeeName).promise();
        console.log(Items);
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
const getReimbursement = async (params) => {
    try {
        const { Items } = await dynamoDbClient.scan(params).promise();
        console.log("items" + Items)
        if (Items != 0) {
            console.log("return items" + Items)
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

const getEmployeeNum = async (params) => {
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

const getListReimbursementByEmployee = async (params) => {
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

module.exports = {
    getReimbursementByCutOff,
    approvalReimbursement,
    getReimbursement,
    getDetailsHr,
    getEmployeeNum,
    getListReimbursementByEmployee,
    getEmployeeName
}