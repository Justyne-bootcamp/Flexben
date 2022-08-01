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
// const getCategory = async (params) => {
//     try {
//         const { Item } = await dynamoDbClient.get(params).promise();
//         if (Item) {
//             return 
//         } else {
//             return
//         }
//     } catch (error) {
//         console.log(error);
//     }
// }

// const getReimbursement = (employee_id) => {
//     let dbQuery =
//         `
//         select * from flex_reimbursement
//         where employee_id=?
//         `
//     return new Promise(function (resolve, reject) {
//         connection.query(dbQuery, employee_id, function (error, results) {
//             if (error) reject(new Error(error));
//             else {
//                 resolve(results)
//             }
//         })
//     })
// }

// const reimbursementList = (employee_id, reimbursement_id) => {
//     let params = [employee_id]
//     let addQuery = ""
//     if (reimbursement_id != undefined) {
//         addQuery = `and flex_reimbursement.flex_reimbursement_id=?`
//         params.push(reimbursement_id)
//     }

//     let dbQuery =
//         `
//         select flex_reimbursement_details.* from flex_reimbursement_details 
//         left join flex_reimbursement on flex_reimbursement_details.flex_reimbursement_id=flex_reimbursement.flex_reimbursement_id 
//         where flex_reimbursement.employee_id=?
//         ${reimbursement_id == undefined ? "" : addQuery}
//         `
//     return new Promise(function (resolve, reject) {
//         connection.query(dbQuery, params, function (error, results) {
//             if (error) reject(new Error(error));
//             else {
//                 resolve(results)
//             }
//         })
//     })
// }

// const removeReimbursement = async (id, dateNow) => {
//     const getReimbursementToBeDeleted = async () => {
//         let dbQuery =
//             `
//             select flex_reimbursement_details.amount, flex_reimbursement_details.flex_reimbursement_id 
//             from flex_reimbursement_details
//             where flex_reimbursement_detail_id=?
//             and status='draft'
//             `
//         return new Promise(function (resolve, reject) {
//             connection.query(dbQuery, id, function (error, results) {
//                 if (error) reject(new Error(error));
//                 else {
//                     resolve(JSON.stringify(results[0]))
//                 }
//             })
//         })
//     }

//     let reimbursementToBeDeleted = JSON.parse(await getReimbursementToBeDeleted());

//     let subtractQuery =
//         `
//         update flex_reimbursement
//         set total_reimbursement_amount=total_reimbursement_amount-?, date_updated=?
//         where flex_reimbursement_id=?
//         `
//     connection.query(subtractQuery, [reimbursementToBeDeleted.amount, dateNow, reimbursementToBeDeleted.flex_reimbursement_id], function (error, _results) {
//         if (error) throw new Error(error)
//     })

//     let deleteQuery =
//         `
//         delete from flex_reimbursement_details
//         where flex_reimbursement_detail_id=?
//         `
//     connection.query(deleteQuery, id, function (error, _results) {
//         if (error) throw new Error(error)
//     })
// }

// const submitReimbursement = async (employee_id, id, dateNow) => {
//     const getCompanyCode = async () => {
//         let dbQuery =
//             `
//             select companies.code
//             from employees
//             right join companies on companies.company_id=employees.company_id
//             where employees.employee_id=?
//             `
//         return new Promise(function (resolve, reject) {
//             connection.query(dbQuery, employee_id, function (error, results) {
//                 if (error) reject(new Error(error));
//                 else {
//                     resolve(JSON.stringify(results[0]))
//                 }
//             })
//         })
//     }

//     const getCutOffCycle = async () => {
//         let dbQuery =
//             `
//             select flex_cut_off_id
//             from flex_reimbursement
//             where flex_reimbursement_id=?
//             `
//         return new Promise(function (resolve, reject) {
//             connection.query(dbQuery, id, function (error, results) {
//                 if (error) reject(new Error(error));
//                 else {
//                     resolve(JSON.stringify(results[0]))
//                 }
//             })
//         })
//     }

//     let companyCode = JSON.parse(await getCompanyCode()).code;
//     let cutOffCycle = JSON.parse(await getCutOffCycle()).flex_cut_off_id;

//     let transactionId = `${companyCode}-${cutOffCycle}-${dateNow.split("/")[0] + dateNow.split("/")[1] + dateNow.split("/")[2]}-${id}`

//     let submitCollectionQuery =
//         `
//         update flex_reimbursement
//         set date_submitted=?, status='submitted', date_updated=?, transaction_number=?
//         where flex_reimbursement_id=?
//         `
//     connection.query(submitCollectionQuery, [dateNow, dateNow, transactionId, id], function (error, _results) {
//         if (error) throw new Error(error)
//     })

//     let submitReimbursememtQuery =
//         `
//         update flex_reimbursement_details
//         set status='submitted', date_updated=?
//         where flex_reimbursement_id=?
//         `
//     connection.query(submitReimbursememtQuery, [dateNow, id], function (error, _results) {
//         if (error) throw new Error(error)
//     })
// }

module.exports = {
    checkIfExistingReimbursement,
    addReimbursement,
    getSum,
    reimbursementList,
    getReimbursement,
    getReimbursementItem,
    deleteReimbursementItem
    // getCategory
}
