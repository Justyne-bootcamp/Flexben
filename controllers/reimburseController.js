const reimburseService = require('../services/reimburseService')
const reimburseHrService = require('../services/reimburseHrService')
const loginController = require('../controllers/loginController')
const { v4: uuidv4 } = require('uuid')

const MIN_REIMBURSABLE_AMOUNT = process.env.MIN_REIMBURSABLE_AMOUNT
const TRANSACTIONS_TABLE = process.env.TRANSACTIONS_TABLE
const USERS_TABLE = process.env.USERS_TABLE

const viewCategories = async (_req, res) => {
    const categoryList = await loginController.exportCategories()
    res.send(categoryList)
}

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
        "dateOfPurchase": null,
        "amount": null,
        "categoryId": null,
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

    // date validation
    if (!isValidDate(reimbursementItemDetails.dateOfPurchase)) {
        res.status(400).send("Invalid date or follow the date format: MM/DD/YYYY")
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
    const checkIfExistingReimbursementResult = await reimburseService.dbQuery(checkIfExistingReimbursementParams)
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
                    dateOfPurchase: reimbursementItemDetails.dateOfPurchase,
                    categoryDetails: JSON.stringify(categoryDetails),
                    currentStatus: 'draft',
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
                    lastName: req.user.lastName,
                    currentStatus: 'draft',
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

    await reimburseService.addReimbursement(addReimbursementParams)

    // take sum of amount for a transaction
    const getSumParams = {
        TableName: TRANSACTIONS_TABLE,
        KeyConditionExpression: 'PK = :pk and begins_with (SK, :sk)',
        ExpressionAttributeValues: {
            ':pk': req.user.employeeNumber + "#" + year + "#" + cutOffCycle,
            ':sk': 'ITEM'
        }
    }

    let totalReimbursementAmount = 0
    const reimbursementAmounts = await reimburseService.dbQuery(getSumParams)
    reimbursementAmounts.forEach(item => {
        totalReimbursementAmount = totalReimbursementAmount + item.amount
    })


    res.json({
        "maximumReimbursementAmount": cutOffCapAmount,
        "totalReimbursementAmount": totalReimbursementAmount,
        "balanceReimbursementAmount": cutOffCapAmount - totalReimbursementAmount
    })
}

const getReimbursement = async (req, res) => {
    if (req.user.role != 'employee') {
        res.status(400).send("This function is only for employees.")
        return
    }
    // Employee can view all reimbursements
    const cutOff = await loginController.exportLatestCutOffs()
    const year = req.params.year || cutOff.year

    const getReimbursementParams = {
        TableName: TRANSACTIONS_TABLE,
        ExpressionAttributeValues: {
            ':pk': req.user.employeeNumber + "#" + year + "#" + cutOff.cutOffCycle,
            ':sk': 'CUTOFF'
        },
        KeyConditionExpression: 'PK = :pk and begins_with ( SK, :sk)',
    }
    let reimbursementCollection = await reimburseService.dbQuery(getReimbursementParams)
    res.status(200).send(reimbursementCollection.length != 0 ? reimbursementCollection : "No reimbursement found.")
}


const reimbursementList = async (req, res) => {
    if (req.user.role != 'employee') {
        res.status(400).send("This function is only for employees.")
        return
    }
    const cutOffCycle = req.params.cutOffCycle
    const cutOff = await loginController.exportLatestCutOffs()

    const reimbursementItemParams = {
        TableName: TRANSACTIONS_TABLE,
        ExpressionAttributeValues: {
            ':pk': req.user.employeeNumber + "#" + cutOff.year + "#" + cutOffCycle,
            ':sk': 'ITEM'
        },
        KeyConditionExpression: 'PK = :pk and begins_with ( SK, :sk)',
    }
    let reimbursementItems = await reimburseService.dbQuery(reimbursementItemParams)

    const getReimbursementItems = [];
    reimbursementItems.forEach(item => {
        getReimbursementItems.push({
            "dateOfPurchase": item.dateOfPurchase,
            "orNumber": item.SK.split("#")[1],
            "nameOfEstablishment": item.nameOfEstablishment,
            "tinOfEstablishment": item.tinOfEstablishment,
            "amount": item.amount,
            "category": JSON.parse(item.categoryDetails).name
        })
    })
    res.status(200).send(getReimbursementItems.length == 0 ? "Current user does not own the collection or collection does not exist" : getReimbursementItems)
}

const approvalReimbursement = async (req, res) => {
    if (req.user.role != 'hr') {
        res.status(400).send("This function is only for HR personnel")
        return
    }
    const cutOff = await loginController.exportLatestCutOffs()

    let newStatus = ""
    let approvalStatement = ""
    if (req.params.action == "approve") {
        newStatus = "approved"
        approvalStatement = "Reimbursement approved."
    }
    else if (req.params.action == "reject") {
        newStatus = "rejected"
        approvalStatement = "Reimbursement rejected."
    }
    else {
        res.status(400).send("Action not accepted.")
        return
    }

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
                UpdateExpression: "set currentStatus = :newStatus, dateUpdated = :dateUpdated",
                ExpressionAttributeValues: {
                    ":newStatus": newStatus,
                    ":dateUpdated": getDateToday()
                },
            }
        )
    })
    await reimburseHrService.approvalReimbursement(approvalParams)
    res.status(200).send(approvalStatement)
}

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

    let getReimbursementByCutOffResult = await reimburseHrService.dbScan(getReimbursementByCutOffParams)

    for (const item of getReimbursementByCutOffResult) {
        // finding employee name using employee number
        item["employeeNumber"] = item["PK"].split('#')[0]
        const getEmployeeName = {
            FilterExpression: "employeeNumber = :employeeNumber",
            ExpressionAttributeValues: {
                ":employeeNumber": item["employeeNumber"],
            },
            ProjectionExpression: "firstName, lastName, employeeNumber",
            TableName: USERS_TABLE
        }
        let employeeName = (await reimburseHrService.dbScan(getEmployeeName))[0]
        item["employeeName"] = employeeName.lastName + ", " + employeeName.firstName

        // getting sum of reimbursement items
        const getSumParams = {
            TableName: TRANSACTIONS_TABLE,
            KeyConditionExpression: 'PK = :pk and begins_with (SK, :sk)',
            ExpressionAttributeValues: {
                ':pk': item["PK"],
                ':sk': 'ITEM'
            }
        }

        let totalReimbursementAmount = 0
        const reimbursementAmounts = await reimburseService.dbQuery(getSumParams)
        reimbursementAmounts.forEach(item => {
            totalReimbursementAmount = totalReimbursementAmount + item.amount
        })

        item["totalReimbursementAmount"] = totalReimbursementAmount
    }
    getReimbursementByCutOffResult = getReimbursementByCutOffResult.map(item => {
        return {
            "transactionNumber": item.transactionNumber,
            "employeeNumber": item.employeeNumber,
            "employeeName": item.employeeName,
            "totalReimbursementAmount": item.totalReimbursementAmount,
            "dateSubmitted": item.dateSubmitted,
            "status": item.currentStatus
        }
    })

    // arrange by status: submitted > rejected > approved
    getReimbursementByCutOffResult.sort(function (a, b) {
        let nameA = a.status.toLowerCase(), nameB = b.status.toLowerCase()
        if (nameA < nameB)
            return 1;
        if (nameA > nameB)
            return -1;
        return 0;
    })

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

    let getDetailsHrReturn = await reimburseHrService.dbScan(getDetailsHrParams)
    // destructure object with SK of CUTOFF
    let getDetailsHrReturnCutOff = getDetailsHrReturn.filter(obj => {
        return obj.SK.includes("CUTOFF")
    })
    // destructure object with SK of ITEM
    let getDetailsHrReturnItems = getDetailsHrReturn.filter(obj => {
        return obj.SK.includes("ITEM")
    })
    // destructure object with SK of User
    let getDetailsHrReturnUser = getDetailsHrReturn.filter(obj => {
        return obj.SK.includes("USER")
    })
    getDetailsHrReturnItems = getDetailsHrReturnItems.map(item => {
        return {
            "dateOfPurchase": item.dateOfPurchase,
            "orNumber": item.SK.split("#")[1],
            "nameOfEstablishment": item.nameOfEstablishment,
            "tinOfEstablishment": item.tinOfEstablishment,
            "amount": item.amount,
            "category": JSON.parse(item.categoryDetails).name
        }
    })

    // get sum of reimbursement amounts based from PK
    const getSumParams = {
        TableName: TRANSACTIONS_TABLE,
        KeyConditionExpression: 'PK = :pk and begins_with (SK, :sk)',
        ExpressionAttributeValues: {
            ':pk': getDetailsHrReturnCutOff[0].PK,
            ':sk': 'ITEM'
        }
    }
    let totalReimbursementAmount = 0
    const reimbursementAmounts = await reimburseService.dbQuery(getSumParams)
    reimbursementAmounts.forEach(item => {
        totalReimbursementAmount = totalReimbursementAmount + item.amount
    })
    let getDetailsHrResult = {
        "employeeNumber": req.params.employeeNumber,
        "employeeName": getDetailsHrReturnUser[0].lastName + ", " + getDetailsHrReturnUser[0].firstName,
        "dateSubmitted": getDetailsHrReturnCutOff[0].dateSubmitted,
        "totalReimbursementAmount": totalReimbursementAmount,
        "transactionNumber": getDetailsHrReturnCutOff[0].transactionNumber,
        "status": getDetailsHrReturnCutOff[0].currentStatus,
        "reimbursementItems": getDetailsHrReturnItems
    }

    res.send(getDetailsHrReturn.length != 0 ? getDetailsHrResult : "No reimbursements found.")
}

const getDateToday = () => {
    let today = new Date();
    let dd = String(today.getDate()).padStart(2, '0');
    let mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    let yyyy = today.getFullYear();

    today = yyyy + '/' + mm + '/' + dd;
    return today
}

function isValidDate(dateString) {
    // Parse the date parts to integers MM/DD/YYYY
    let parts = dateString.split("/");
    let day = parseInt(parts[1], 10);
    let month = parseInt(parts[0], 10);
    let year = parseInt(parts[2], 10);

    // Check the ranges of month and year
    if (year < 1000 || year > 3000 || month == 0 || month > 12)
        return false;

    let monthLength = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

    // Adjust for leap years
    if (year % 400 == 0 || (year % 100 != 0 && year % 4 == 0))
        monthLength[1] = 29;

    // Check the range of the day
    return day > 0 && day <= monthLength[month - 1];
}

const removeReimbursement = async (req, res) => {
    if (req.user.role != 'employee') {
        res.status(400).send("This function is only for employees.")
        return
    }

    const cutOff = await loginController.exportLatestCutOffs();

    let getReimbursementParams = {
        TableName: TRANSACTIONS_TABLE,
        Key: {
            PK: req.user.employeeNumber + '#' + cutOff.year + "#" + cutOff.cutOffCycle,
            SK: 'ITEM#' + req.params.orNumber
        }
    }
    let reimbursementItem = await reimburseService.getReimbursementItem(getReimbursementParams);

    if (reimbursementItem) {

        if (reimbursementItem.currentStatus == 'draft') {
            let deleteReimbursementParams = {
                TableName: TRANSACTIONS_TABLE,
                Key: {
                    PK: req.user.employeeNumber + '#' + cutOff.year + "#" + cutOff.cutOffCycle,
                    SK: 'ITEM#' + req.params.orNumber
                }
            }
            await reimburseService.deleteReimbursementItem(deleteReimbursementParams);

            res.status(200).send("Reimbursement deleted.");
        }
        else {
            res.status(400).send("Reimbursement item does not exist or has been submitted/approved.");
        }
    }
    else {
        res.status(400).send("Reimbursement item does not exist");
    }
}

const submitReimbursement = async (req, res) => {
    // role validation
    if (req.user.role != 'employee') {
        res.status(400).send("This function is only for employees.")
        return
    }

    const transactionNum = uuidv4()
    const { cutOffCapAmount, year, cutOffCycle } = await loginController.exportLatestCutOffs()


    const getSumParams = {
        TableName: TRANSACTIONS_TABLE,
        KeyConditionExpression: 'PK = :pk and begins_with (SK, :sk)',
        ExpressionAttributeValues: {
            ':pk': req.user.employeeNumber + "#" + year + "#" + cutOffCycle,
            ':sk': 'ITEM'
        }
    }
    let totalReimbursementAmount = 0
    const reimbursementAmounts = await reimburseService.dbQuery(getSumParams)
    reimbursementAmounts.forEach(item => {
        totalReimbursementAmount = totalReimbursementAmount + item.amount
    })

    if (totalReimbursementAmount > cutOffCapAmount) {
        res.status(400).send(`Total cutoff amount exceeded (Cap: ${cutOffCapAmount}). Submission failed.`)
        return
    }

    const searchParams = {
        TableName: TRANSACTIONS_TABLE,
        FilterExpression: 'PK = :pk AND SK BETWEEN:skCutoff AND :skUser AND currentStatus = :currentStatus',
        ExpressionAttributeValues: {
            ":currentStatus": "draft",
            ':skCutoff': "CUTOFF",
            ':skUser': "USER",
            ':pk': req.user.employeeNumber + "#" + year + "#" + cutOffCycle,
        },
    };
    let reimbursementDetails = await reimburseHrService.getReimbursement(searchParams)
    if (reimbursementDetails == 0) {
        res.status(400).send("Reimbursement not found, no reimbursement has been drafted.")
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
                UpdateExpression: "set currentStatus = :newStatus, dateUpdated = :dateUpdated, dateSubmitted = :dateUpdated, transactionNumber = :transNum",
                ExpressionAttributeValues: {
                    ":dateUpdated": getDateToday(),
                    ":newStatus": "submitted",
                    ":transNum": req.user.companyCode + "-" + year + cutOffCycle + "-" + getDateToday().split('/').join('') + "-" + transactionNum.split('-').join('')
                },
            }
        )
    })

    await reimburseHrService.approvalReimbursement(approvalParams)
    res.status(200).send("Reimbursement submitted.")
}

const searchReimbursement = async (req, res) => {
    if (req.user.role != 'hr') {
        res.status(400).send("This function is only for HR personnel.")
        return
    }

    if (!req.query.employeeNumber && !req.query.firstName && !req.query.lastName) {
        res.status(400).send("Please fill up atleast one field.")
        return
    }

    let employeeDetails = {
        "employeeNumber": req.query.employeeNumber ? req.query.employeeNumber : "",
        "firstName": req.query.firstName ? (req.query.firstName).toUpperCase() : "",
        "lastName": req.query.lastName ? (req.query.lastName).toUpperCase() : "",
        "cutOffCycle": req.params.cutOffCycle,
        "year": req.params.year
    }

    const cutOff = await loginController.exportLatestCutOffs()

    const year = employeeDetails.year || cutOff.year
    const cutOffCycle = employeeDetails.cutOffCycle || cutOff.cutOffCycle

    let expressionAttrObj = {
        ':firstName': employeeDetails.firstName,
        ':lastName': employeeDetails.lastName
    }
    let nameTempFilter = 'contains (firstName, :firstName) and contains (lastName, :lastName)'
    if (employeeDetails.employeeNumber != "") {
        nameTempFilter += ' and employeeNumber =:employeeNumber'
        expressionAttrObj[':employeeNumber'] = employeeDetails.employeeNumber
    }

    let params = {
        TableName: USERS_TABLE,
        ExpressionAttributeValues:
            expressionAttrObj,
        FilterExpression: nameTempFilter,
    };

    const userInfo = await reimburseHrService.dbScan(params)
    const reimbursementsParams = [];

    userInfo.forEach(item => {
        reimbursementsParams.push(
            {
                TableName: TRANSACTIONS_TABLE,
                FilterExpression: 'contains(PK, :pk) AND currentStatus<>:currentStatus',
                ExpressionAttributeValues: {
                    ':pk': item.employeeNumber + "#" + year + "#" + cutOffCycle,
                    ':currentStatus': 'draft'
                }
            }
        )
    })

    let searchReimbursementResult = []

    for (const item of reimbursementsParams) {
        searchReimbursementResult.push(await reimburseHrService.dbScan(item))
    }

    let listOfReimbursementPerEmployee = []

    for (const item of searchReimbursementResult) {

        // destructure object with SK of CUTOFF
        let getDetailsHrReturnCutOff = item.filter(obj => {
            return obj.SK.includes("CUTOFF")
        })
        // destructure object with SK of ITEM
        let getDetailsHrReturnItems = item.filter(obj => {
            return obj.SK.includes("ITEM")
        })
        // destructure object with SK of User
        let getDetailsHrReturnUser = item.filter(obj => {
            return obj.SK.includes("USER")
        })
        getDetailsHrReturnItems = getDetailsHrReturnItems.map(item => {
            return {
                "dateOfPurchase": item.dateOfPurchase,
                "orNumber": item.SK.split("#")[1],
                "nameOfEstablishment": item.nameOfEstablishment,
                "tinOfEstablishment": item.tinOfEstablishment,
                "amount": item.amount,
                "category": JSON.parse(item.categoryDetails).name
            }
        })

        // get sum of reimbursement amounts based from PK
        const getSumParams = {
            TableName: TRANSACTIONS_TABLE,
            KeyConditionExpression: 'PK = :pk and begins_with (SK, :sk)',
            ExpressionAttributeValues: {
                ':pk': getDetailsHrReturnCutOff[0].PK,
                ':sk': 'ITEM'
            }
        }
        let totalReimbursementAmount = 0
        const reimbursementAmounts = await reimburseService.dbQuery(getSumParams)
        reimbursementAmounts.forEach(item => {
            totalReimbursementAmount = totalReimbursementAmount + item.amount
        })
        let getDetailsHrResult = {
            "employeeNumber": req.params.employeeNumber,
            "employeeName": getDetailsHrReturnUser[0].lastName + ", " + getDetailsHrReturnUser[0].firstName,
            "dateSubmitted": getDetailsHrReturnCutOff[0].dateSubmitted,
            "totalReimbursementAmount": totalReimbursementAmount,
            "transactionNumber": getDetailsHrReturnCutOff[0].transactionNumber,
            "status": getDetailsHrReturnCutOff[0].currentStatus,
            "reimbursementItems": getDetailsHrReturnItems
        }
        listOfReimbursementPerEmployee.push(getDetailsHrResult)
    }

    res.status(200).send(searchReimbursementResult.length == 0? "No records found." : listOfReimbursementPerEmployee);
}


module.exports = {
    addReimbursement,
    viewCategories,
    getReimbursementByCutOff,
    getReimbursement,
    reimbursementList,
    approvalReimbursement,
    getDetailsHr,
    submitReimbursement,
    removeReimbursement,
    searchReimbursement,
}