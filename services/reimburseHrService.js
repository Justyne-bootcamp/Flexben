const AWS = require('aws-sdk')
const dynamoDbClient = new AWS.DynamoDB.DocumentClient();

// charles
const getReimbursementByCutOff = async (getReimbursementByCutOffParams) => {
    try {
        const {Items}  = await dynamoDbClient.scan(getReimbursementByCutOffParams).promise();  

        if (Items) {
            // group objects based on their PK
            const groups = Items.reduce((groups, item) => {
                const group = (groups[item.PK] || []);
                group.push(item);
                groups[item.PK] = group;
                return groups;
              }, {});

            return groups
        } else {
            return 
        }
    } catch (error) {
        console.log(error);
    }
}

// alex
const approvalReimbursement = async (params) => {
    try {
        const { Item } = await dynamoDbClient.update(params).promise();
        if (Item) {
            return 0
        } else {
            return 1
        }
    } catch (error) {
        console.log(error);
    }
}


module.exports = {
    getReimbursementByCutOff,
    approvalReimbursement
}