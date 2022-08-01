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

// alex
const approveReimbursement = async (req, res) => {
    if (req.user.role != 'hr') {
        res.status(400).send("This function is only for HR personnel")
        return
    }
    const cutOff = await loginController.exportLatestCutOffs()
    console.log(req.params.employeeNumber + "#" + cutOff.year + "#" + cutOff.cutOffCycle)
    const searchParams = {
        TableName: TRANSACTIONS_TABLE,
        FilterExpression: 'PK = :pk AND SK BETWEEN:skCutoff AND :skUser AND currentStatus = :currentStatus',
        ExpressionAttributeValues: {
            ":currentStatus": "submitted",
            ':skCutoff': "CUTOFF",
            ':skUser': "USER",
            ':pk': req.params.employeeNumber + "#" + cutOff.year + "#" + cutOff.cutOffCycle,
        },
    };
    let reimbursementDetails = await reimburseHrService.getReimbursement(searchParams)
    if (reimbursementDetails == 0) {
        res.status(400).send("Reimbursement not found, not yet submitted, or has been approved/rejected.")
        return
    }
    const approvalParams = [];
    reimbursementDetails.forEach(item => {
        approvalParams.push(
            {
                TableName: TRANSACTIONS_TABLE,
                Key: {
                    'PK': item.PK,
                    'SK': item.SK
                },
                UpdateExpression: "set currentStatus = :newStatus",
                ExpressionAttributeValues: {
                    ":newStatus": "approved",
                },
            }
        )
    })
    console.log(approvalParams)
    await reimburseHrService.approvalReimbursement(approvalParams)
    res.status(200).send("Reimbursement approved.")
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

// charles
const getReimbursementByCutOff = async (req, res) => {
    // role validation
    if (req.user.role != 'hr') {
        res.status(400).send("This function is only for hr personnel.")
        return
    }

    const getReimbursementByCutOffParams = {
        TableName: TRANSACTIONS_TABLE,
        FilterExpression: 'contains(PK, :pk) AND currentStatus<>:currentStatus AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
            ':pk': req.params.year + "#" + req.params.cutOffCycle,
            ':currentStatus': 'draft',
            ':sk': "CUTOFF#"
        }
    }

    let getReimbursementByCutOffResult = await reimburseHrService.getReimbursementByCutOff(getReimbursementByCutOffParams)

    res.send(getReimbursementByCutOffResult.length != 0 ? getReimbursementByCutOffResult : "No reimbursements found.")
}

const getDetailsHr = async (req, res) => {
    // role validation
    if (req.user.role != 'hr') {
        res.status(400).send("This function is only for hr personnel.")
        return
    }

    const getDetailsHrParams = {
        TableName: TRANSACTIONS_TABLE,
        FilterExpression: 'contains(PK, :pk) AND currentStatus<>:currentStatus',
        ExpressionAttributeValues: {
            ':pk': req.params.employeeNumber + "#" + req.params.year + "#" + req.params.cutOffCycle,
            ':currentStatus': 'draft'
        }
    }

    let getDetailsHrResult = await reimburseHrService.getDetailsHr(getDetailsHrParams)

    res.send(getDetailsHrResult.length != 0 ? getDetailsHrResult : "No reimbursements found.")
}

const getDateToday = () => {
    let today = new Date();
    let dd = String(today.getDate()).padStart(2, '0');
    let mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    let yyyy = today.getFullYear();

    today = yyyy + '/' + mm + '/' + dd;
    return today
}

//Justyne
const removeReimbursement = async (req, res) => {
    if (req.user.role != 'employee') {
        res.status(400).send("This function is only for employees.")
        return
    }
    
    const cutOff = await loginController.exportLatestCutOffs();
    
    let getReimbursementParams = {
        TableName: TRANSACTIONS_TABLE,
        Key: {
            PK:  req.user.employeeNumber + '#' + cutOff.year + "#" + cutOff.cutOffCycle,
            SK: 'ITEM#' + req.params.orNumber
        }
    }
    let reimbursementItem = await reimburseService.getReimbursementItem(getReimbursementParams);
    
    if(reimbursementItem){
        let orNumber = 'ITEM#' + req.params.orNumber;
        console.log(orNumber);

        if(reimbursementItem.currentStatus == 'draft'){
            let deleteReimbursementParams = {
                TableName: TRANSACTIONS_TABLE,
                Key: {
                    PK:  req.user.employeeNumber + '#' + cutOff.year + "#" + cutOff.cutOffCycle,
                    SK: 'ITEM#' + req.params.orNumber
                }
            }
            let item = await reimburseService.deleteReimbursementItem(deleteReimbursementParams);
        
            res.status(200).send("Reimbursement deleted.");
        }
        else{
            res.status(400).send("Reimbursement item does not exist or has been submitted/approved.");
        }
    }
    else{
        res.status(400).send("Reimbursement item does not exist");
    }
}

module.exports = {
    addReimbursement,
    viewCategories,
    getReimbursementByCutOff,
    getReimbursement,
    reimbursementList,
    approveReimbursement,
    rejectReimbursement,
    getDetailsHr,
    // getReimbursement,
    // getReimbursementFull,
    // reimbursementList,
    removeReimbursement
    // submitReimbursement,
    // searchReimbursement,
    // approveReimbursement,
    // rejectReimbursement,
    // getCategories
}