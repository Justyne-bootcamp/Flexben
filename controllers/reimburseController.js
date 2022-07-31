const reimburseService = require('../services/reimburseService')
const reimburseHrService = require('../services/reimburseHrService')
const loginController = require('../controllers/loginController')

const MIN_REIMBURSABLE_AMOUNT = process.env.MIN_REIMBURSABLE_AMOUNT
const TRANSACTIONS_TABLE = process.env.TRANSACTIONS_TABLE

const viewCategories = async (req, res) => {
    const categoryList = await loginController.exportCategories()
    res.send(categoryList)
}

// charles
const addReimbursement = async (req, res) => {
    // role validation
    if (req.user.role != 'employee') {
        res.status(400).send("This function is only for employees.")
        return
    }

    let reimbursementItemDetailsModel = {
        "orNumber": null,
        "nameOfEstablishment": null,
        "tinOfEstablishment": null,
        "amount": null,
        "categoryId": null,
        "currentStatus": "draft",
        "dateAdded": getDateToday()
    }

    // populate the model with values from req.body
    let reimbursementItemDetails = Object.assign(reimbursementItemDetailsModel, req.body)

    // check if request body has null values
    let nullDetected = false
    for (const property in reimbursementItemDetails) {
        if (!nullDetected && reimbursementItemDetails[property] == null) {
            nullDetected = true
        }
    }
    if (nullDetected) {
        res.status(400).send("Incomplete details.")
        return
    }

    // amount and categoryId type validation
    if (typeof reimbursementItemDetails.amount === "string") {
        res.status(400).send("Amount should be a numerical value.")
        return
    } else if (typeof reimbursementItemDetails.categoryId !== "string") {
        res.status(400).send("Category Id should be of type string.")
        return
    }

    // check if database contains inputted category id
    const categoryList = await loginController.exportCategories()
    let categoryDetails = null
    categoryList.forEach(item => {
        if (item.employeeId == reimbursementItemDetails.categoryId) {
            categoryDetails = item
        }
    })
    if (!categoryDetails) {
        res.status(400).send("Category not found.")
        return
    }

    // minimum amount validation
    if (reimbursementItemDetails.amount < MIN_REIMBURSABLE_AMOUNT) {
        res.status(400).send("Amount should be equal or greater than " + MIN_REIMBURSABLE_AMOUNT)
        return
    }

    const { cutOffCapAmount, year, cutOffCycle } = await loginController.exportLatestCutOffs()

    // check if collection already exists for the logged in user
    const checkIfExistingReimbursementParams = {
        TableName: TRANSACTIONS_TABLE,
        KeyConditionExpression: 'PK = :pk and SK = :sk',
        ExpressionAttributeValues: {
            ':pk': req.user.employeeNumber + "#" + year + "#" + cutOffCycle,
            ':sk': 'CUTOFF#' + cutOffCycle
        }
    }
    const checkIfExistingReimbursementResult = await reimburseService.checkIfExistingReimbursement(checkIfExistingReimbursementParams)
    if (checkIfExistingReimbursementResult.length == 1 && checkIfExistingReimbursementResult[0].currentStatus != 'draft') {
        res.status(400).send("Unable to add item. Your current reimbursement for the cycle has been submitted already.")
        return
    }

    // adding the item to the collection
    let requestItemsParams = [
        {
            PutRequest: {
                Item: {
                    PK: req.user.employeeNumber + "#" + year + "#" + cutOffCycle,
                    SK: "ITEM#" + reimbursementItemDetails.orNumber,
                    nameOfEstablishment: reimbursementItemDetails.nameOfEstablishment,
                    tinOfEstablishment: reimbursementItemDetails.tinOfEstablishment,
                    amount: reimbursementItemDetails.amount,
                    dateAdded: reimbursementItemDetails.dateAdded,
                    categoryDetails: JSON.stringify(categoryDetails)
                }
            }
        }
    ]

    if (checkIfExistingReimbursementResult.length == 0) {
        requestItemsParams.push({
            PutRequest: {
                Item: {
                    PK: req.user.employeeNumber + "#" + year + "#" + cutOffCycle,
                    SK: "USER",
                    companyCode: req.user.companyCode,
                    employeeNumber: req.user.employeeNumber,
                    firstName: req.user.firstName,
                    lastName: req.user.lastName
                }
            }
        })
        requestItemsParams.push({
            PutRequest: {
                Item: {
                    PK: req.user.employeeNumber + "#" + year + "#" + cutOffCycle,
                    SK: "CUTOFF#" + cutOffCycle,
                    transactionNumber: null,
                    dateSubmitted: null,
                    currentStatus: 'draft',
                    dateUpdated: getDateToday()
                }
            }
        })
    }

    const addReimbursementParams = {
        RequestItems: {
            [TRANSACTIONS_TABLE]: requestItemsParams
        }
    }
    console.log(addReimbursementParams);
    const addReimbursementResult = await reimburseService.addReimbursement(addReimbursementParams)

    // take sum of amount for a transaction
    const getSumParams = {
        TableName: TRANSACTIONS_TABLE,
        KeyConditionExpression: 'PK = :pk and begins_with (SK, :sk)',
        ExpressionAttributeValues: {
            ':pk': req.user.employeeNumber + "#" + year + "#" + cutOffCycle,
            ':sk': 'ITEM'
        }
    }

    const totalReimbursementAmount = await reimburseService.getSum(getSumParams)

    res.json({
        "maximumReimbursementAmount": cutOffCapAmount,
        "totalReimbursementAmount": totalReimbursementAmount,
        "balanceReimbursementAmount": cutOffCapAmount - totalReimbursementAmount
    })
}

// alex
const getReimbursement = async (req, res) => {
    // Employee can view all reimbursements
    const cutOff = await loginController.exportLatestCutOffs()
    const year = req.params.year || cutOff.year
    if (req.user.role == 'employee' && req.params.cutoff_id == null) {
        const getReimbursementParams = {
            TableName: TRANSACTIONS_TABLE,
            ExpressionAttributeValues: {
                ':pk': req.user.employeeNumber  + "#" + year + "#" + cutOff.cutOffCycle,
                ':sk': 'CUTOFF'
            },
            KeyConditionExpression: 'PK = :pk and begins_with ( SK, :sk)',
        }
        let reimbursementCollection = await reimburseService.getReimbursement(getReimbursementParams)
        res.status(200).send(reimbursementCollection)
    }
    else if (req.user.role == 'employee' && req.params.cutoff_id != null) {
        res.status(400).send("This function is only for HR personnel.")
    }
    else if (req.user.role == 'hr' && req.params.cutoff_id == null) {
                res.status(400).send("Please specify a cut-off period.")
            }
    else {
        res.status(400).send("Please login.")
    }
}

// alex
const reimbursementList = async (req, res) => {
    if (req.user.role != 'employee') {
        res.status(400).send("This function is only for employees.")
        return
    }
    const cutOffCycle = req.params.cutoff_id
    const cutOff = await loginController.exportLatestCutOffs()
    console.log(req.user.employeeNumber  + "#" + cutOff.year + "#" + cutOffCycle)
    const reimbursementItemParams = {
        TableName: TRANSACTIONS_TABLE,
        ExpressionAttributeValues: {
            ':pk': req.user.employeeNumber  + "#" + cutOff.year + "#" + cutOffCycle,
            ':sk': 'ITEM'
        },
        KeyConditionExpression: 'PK = :pk and begins_with ( SK, :sk)',
    }
    let reimbursementItems = await reimburseService.reimbursementList(reimbursementItemParams)
    res.status(200).send(reimbursementItems.length == 0 ? "Current user does not own the collection or collection does not exist" : reimbursementItems)
}

// charles
const getReimbursementByCutOff = async (req, res) => {
    // role validation
    if (req.user.role != 'hr') {
        res.status(400).send("This function is only for hr personnel.")
        return
    }

    const getReimbursementByCutOffParams = {
        TableName: TRANSACTIONS_TABLE,
        FilterExpression: 'contains(PK, :pk) AND currentStatus<>:currentStatus',
        ExpressionAttributeValues: {
            ':pk': req.params.year + "#" + req.params.cutOffCycle,
            ':currentStatus': 'draft'
        }
    }

    let getReimbursementByCutOffResult = await reimburseHrService.getReimbursementByCutOff(getReimbursementByCutOffParams)

    res.json(getReimbursementByCutOffResult)
}

// alex
const approveReimbursement = async (req, res) => {
    if (req.user.role != 'hr') {
        res.status(400).send("This function is only for HR personnel")
        return
    }
    const cutOff = await loginController.exportLatestCutOffs()
    console.log(req.params.employeeNumber + "#" + cutOff.year + "#" + cutOff.cutOffCycle)
    const approveParams = {
        TableName: TRANSACTIONS_TABLE,
        Key: {
            'PK': req.params.employeeNumber + "#" + cutOff.year + "#" + cutOff.cutOffCycle,
            'SK': "CUTOFF#" + cutOff.cutOffCycle,
        },
        ConditionExpression: "currentStatus = :currentStatus",
        UpdateExpression: "set currentStatus = :newStatus, dateUpdated = :dateUpdated",
        ExpressionAttributeValues: {
            ':newStatus': "approved",
            ':currentStatus': "submitted",
            ":dateUpdated": getDateToday()
        },
        ReturnValues: "UPDATED_NEW"
    };
    let approval = await reimburseHrService.approvalReimbursement(approveParams)
    console.log("approval" +approval);
    res.status(200).send(approval ? "Reimbursement approved." : "Reimbursement not found, not yet submitted, or has been approved/rejected.")
}

// alex
const rejectReimbursement = async (req, res) => {
    if (req.user.role != 'hr') {
        res.status(400).send("This function is only for HR personnel")
        return
    }
    const cutOff = await loginController.exportLatestCutOffs()
    console.log(req.params.employeeNumber + "#" + cutOff.year + "#" + cutOff.cutOffCycle)
    const approveParams = {
        TableName: TRANSACTIONS_TABLE,
        Key: {
            'PK': req.params.employeeNumber + "#" + cutOff.year + "#" + cutOff.cutOffCycle,
            'SK': "CUTOFF#" + cutOff.cutOffCycle,
        },
        ConditionExpression: "currentStatus = :currentStatus",
        UpdateExpression: "set currentStatus = :newStatus, dateUpdated = :dateUpdated",
        ExpressionAttributeValues: {
            ':newStatus': "rejected",
            ':currentStatus': "submitted",
            ":dateUpdated": getDateToday()
        },
        ReturnValues: "UPDATED_NEW"
    };
    let rejection = await reimburseHrService.approvalReimbursement(approveParams)
    console.log("rejection" +rejection);
    res.status(200).send(rejection ? "Reimbursement rejected." : "Reimbursement not found, not yet submitted, or has been approved/rejected.")
}

// const removeReimbursement = async (req, res) => {
//     if (req.user.role != 'employee') {
//         res.status(400).send("This function is only for employees.")
//         return
//     }
//     let reimbursementItems = JSON.parse(JSON.stringify(await reimburseService.reimbursementList(req.user.employee_id)))
//     let ableToDelete = false
//     reimbursementItems.forEach(item => {
//         if (item.flex_reimbursement_detail_id == req.params.item_id && item.status.toLowerCase() == 'draft') ableToDelete = true
//     })

//     if (ableToDelete) {
//         await reimburseService.removeReimbursement(req.params.item_id, getDateToday())
//         res.status(200).send("Reimbursement deleted.")
//     }
//     else {
//         res.status(400).send("Reimbursement item does not exist or has been submitted/approved.")
//     }

// }

// const submitReimbursement = async (req, res) => {
//     if (req.user.role != 'employee') {
//         res.status(400).send("This function is only for employees.")
//         return
//     }
//     let reimbursementCollection = JSON.parse(JSON.stringify(await reimburseService.getReimbursement(req.user.employee_id)))
//     let ableToSubmit = false
//     let cap_amount = JSON.parse(await reimburseService.getLatestCutoffCycle()).cut_off_cap_amount

//     reimbursementCollection.forEach(item => {
//         if (item.flex_reimbursement_id == req.params.reimbursement_id
//             && item.status.toLowerCase() == 'draft'
//             && item.total_reimbursement_amount <= cap_amount) {
//             ableToSubmit = true
//         }
//     })

//     if (ableToSubmit) {
//         await reimburseService.submitReimbursement(req.user.employee_id, req.params.reimbursement_id, getDateToday())
//         res.status(200).send("Reimbursement submitted.")
//     }
//     else {
//         res.status(400).send("Reimbursement item does not exist, has been submitted/approved, or has exceeded the maximum cut off cap of " + JSON.parse(await reimburseService.getLatestCutoffCycle()).cut_off_cap_amount + ".")
//     }
// }

// const searchReimbursement = async (req, res) => {
//     if (req.user.role != 'hr') {
//         res.status(400).send("This function is only for HR personnel.")
//         return
//     }
//     let search_info = {
//         "employee_id": req.query.employee_id ? req.query.employee_id : "",
//         "firstname": req.query.firstname ? req.query.firstname : "",
//         "lastname": req.query.lastname ? req.query.lastname : ""
//     }
//     let search_result = JSON.parse(await reimburseHrService.searchEmployee(search_info))
//     console.log(search_result[0].employee_id);
//     if (search_result.length == 0) {
//         res.status(200).send("No employee found.")
//     }
//     else if (search_result.length != 1) {
//         res.status(200).send("Parsed more than 1 employee, please refine search query.")
//     }
//     else {
//         let search_reimbursement = await reimburseHrService.searchReimbursement(search_result[0].employee_id)
//         res.status(200).send(search_reimbursement ? search_reimbursement : "No submitted reimbursement found.")
//     }
// }


const getDateToday = () => {
    let today = new Date();
    let dd = String(today.getDate()).padStart(2, '0');
    let mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    let yyyy = today.getFullYear();

    today = yyyy + '/' + mm + '/' + dd;
    return today
}


module.exports = {
    addReimbursement,
    viewCategories,
    getReimbursementByCutOff,
    getReimbursement,
    reimbursementList,
    approveReimbursement,
    rejectReimbursement
    // getReimbursement,
    // getReimbursementFull,
    // reimbursementList,
    // removeReimbursement,
    // submitReimbursement,
    // searchReimbursement,
    // approveReimbursement,
    // rejectReimbursement,
    // getCategories
}