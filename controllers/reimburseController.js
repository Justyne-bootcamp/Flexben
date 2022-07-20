const reimburseService = require('../services/reimburseService')
const reimburseHrService = require('../services/reimburseHrService')

const getCategories = async (_req, res) => {
    let categories = await reimburseService.getCategories()
    res.send(JSON.parse(categories))
}

const addReimbursement = async (req, res) => {
    if (req.user.role != 'employee') {
        res.status(400).send("This function is only for employees.")
        return
    }
    let reimbursementItemDetails = {
        "or_number": req.body.or_number,
        "name_of_establishment": req.body.name_of_establishment,
        "tin_of_establishment": req.body.tin_of_establishment,
        "amount": req.body.amount,
        "category_id": req.body.category_id,
        "status": "draft",
        "date_added": getDateToday()
    }

    // Check if request body has null values
    let nullDetected = false
    for (const property in reimbursementItemDetails) {
        if (!nullDetected && reimbursementItemDetails[property] == null) {
            nullDetected = true
        }
    }

    // Check if category id is encompassed by the database
    let categories = JSON.parse(await reimburseService.getCategories())
    let categoryDetected = false
    categories.forEach(item => {
        if (item.category_id == reimbursementItemDetails.category_id) {
            categoryDetected = true
        }
    })
    if (!categoryDetected) {
        res.status(400).send("Category not found.")
        return
    }

    if (nullDetected) {
        res.status(400).send("Incomplete details.")
    }
    else if (reimbursementItemDetails.amount < process.env.MIN_REIMBURSABLE_AMOUNT) {
        res.status(400).send("Amount should be equal or greater than " + process.env.MIN_REIMBURSABLE_AMOUNT)
    }
    else {
        let cutoffId = JSON.parse(await reimburseService.getLatestCutoffCycle()).flex_cut_off_id
        let totalReimbursementAmount = JSON.parse(await reimburseService.addReimbursement(reimbursementItemDetails, req.user.employee_id, cutoffId)).total_reimbursement_amount
        res.send({
            "maximum_reimbursement_amount": JSON.parse(await reimburseService.getLatestCutoffCycle()).cut_off_cap_amount,
            "total_reimbursement_amount": totalReimbursementAmount,
            "balance_reimbursement_amount": parseFloat(JSON.parse(await reimburseService.getLatestCutoffCycle()).cut_off_cap_amount) - parseFloat(totalReimbursementAmount)
        })
    }
}

const getReimbursement = async (req, res) => {
    // Employee can view all reimbursements
    if (req.user.role == 'employee' && req.params.cutoff_id == null) {
        let reimbursementCollection = await reimburseService.getReimbursement(req.user.employee_id)
        res.status(200).send(reimbursementCollection)
    }
    else if (req.user.role == 'employee' && req.params.cutoff_id != null) {
        res.status(400).send("This function is only for HR personnel.")
    }
    // HR can view all reimbursements submitted in a cut-off cycle
    else if (req.user.role == 'hr' && req.params.cutoff_id != null) {
        let reimbursementCollection = await reimburseHrService.getReimbursementHr(req.params.cutoff_id)
        if (JSON.parse(reimbursementCollection).length == 0) {
            res.status(200).send("Either no reimbursement parsed or cut off period has not yet started.")
            return
        }
        res.status(200).send(JSON.parse(reimbursementCollection))
    }
    else if (req.user.role == 'hr' && req.params.cutoff_id == null) {
        res.status(400).send("Please specify a cut-off period.")
    }
    else {
        res.status(400).send("Please login.")
    }
}

const getReimbursementFull = async (req, res) => {
    let reimbursementCollection = JSON.parse(await reimburseHrService.getReimbursementHr(req.params.cutoff_id))
    // Check if available
    let isIdAvailable = false

    reimbursementCollection.forEach(item => {
        if (item.flex_reimbursement_id == req.params.reimbursement_id) isIdAvailable = true
    })

    // HR can view the details of a reimbursement
    if (req.user.role == 'hr' && isIdAvailable) {
        let reimbursementFull = await reimburseHrService.getReimbursementFull(req.params.reimbursement_id)
        res.status(200).send(reimbursementFull)
    }
    else if (req.user.role == 'hr' && !isIdAvailable) {
        res.status(400).send("Reimbursement does not exist or currently in draft.")
    }
    else {
        res.status(400).send("Unauthorized or not logged in.")
    }
}

const reimbursementList = async (req, res) => {
    if (req.user.role != 'employee') {
        res.status(400).send("This function is only for employees.")
        return
    }
    let reimbursementItems = await reimburseService.reimbursementList(req.user.employee_id, req.params.reimbursement_id)
    res.status(200).send(reimbursementItems.length == 0? "Current user does not own the collection or collection does not exist" : reimbursementItems)
}

const removeReimbursement = async (req, res) => {
    if (req.user.role != 'employee') {
        res.status(400).send("This function is only for employees.")
        return
    }
    let reimbursementItems = JSON.parse(JSON.stringify(await reimburseService.reimbursementList(req.user.employee_id)))
    let ableToDelete = false
    reimbursementItems.forEach(item => {
        if (item.flex_reimbursement_detail_id == req.params.item_id && item.status.toLowerCase() == 'draft') ableToDelete = true
    })

    if (ableToDelete) {
        await reimburseService.removeReimbursement(req.params.item_id, getDateToday())
        res.status(200).send("Reimbursement deleted.")
    }
    else {
        res.status(400).send("Reimbursement item does not exist or has been submitted/approved.")
    }

}

const submitReimbursement = async (req, res) => {
    if (req.user.role != 'employee') {
        res.status(400).send("This function is only for employees.")
        return
    }
    let reimbursementCollection = JSON.parse(JSON.stringify(await reimburseService.getReimbursement(req.user.employee_id)))
    let ableToSubmit = false
    let cap_amount = JSON.parse(await reimburseService.getLatestCutoffCycle()).cut_off_cap_amount

    reimbursementCollection.forEach(item => {
        if (item.flex_reimbursement_id == req.params.reimbursement_id
            && item.status.toLowerCase() == 'draft'
            && item.total_reimbursement_amount <= cap_amount) {
            ableToSubmit = true
        }
    })

    if (ableToSubmit) {
        await reimburseService.submitReimbursement(req.user.employee_id, req.params.reimbursement_id, getDateToday())
        res.status(200).send("Reimbursement submitted.")
    }
    else {
        res.status(400).send("Reimbursement item does not exist, has been submitted/approved, or has exceeded the maximum cut off cap of " + JSON.parse(await reimburseService.getLatestCutoffCycle()).cut_off_cap_amount + ".")
    }
}

const searchReimbursement = async (req, res) => {
    if (req.user.role != 'hr') {
        res.status(400).send("This function is only for HR personnel.")
        return
    }
    let search_info = {
        "employee_id": req.query.employee_id ? req.query.employee_id: "",
        "firstname": req.query.firstname ? req.query.firstname: "",
        "lastname": req.query.lastname ? req.query.lastname: ""
    }
    let search_result = JSON.parse(await reimburseHrService.searchEmployee(search_info))
    console.log(search_result[0].employee_id);
    if (search_result.length == 0) {
        res.status(200).send("No employee found.")
    }
    else if (search_result.length != 1) {
        res.status(200).send("Parsed more than 1 employee, please refine search query.")
    }
    else {
        let search_reimbursement = await reimburseHrService.searchReimbursement(search_result[0].employee_id)
        res.status(200).send(search_reimbursement? search_reimbursement: "No submitted reimbursement found.")
    }
}

const approveReimbursement = async (req, res) => {
    if (req.user.role != 'hr') {
        res.status(400).send("This function is only for HR personnel")
        return
    }
    let approval = await reimburseHrService.approvalReimbursement(req.params.reimbursement_id, "approved", getDateToday())
    console.log(approval);
    res.status(200).send(approval? "Reimbursement approved." : "Reimbursement not found or has been approved/rejected.")
}

const rejectReimbursement = async (req, res) => {
    if (req.user.role != 'hr') {
        res.status(400).send("This function is only for HR personnel")
        return
    }
    let rejection = await reimburseHrService.approvalReimbursement(req.params.reimbursement_id, "rejected",getDateToday())
    res.status(200).send(rejection? "Reimbursement rejected." : "Reimbursement not found or has been approved/rejected.")
}

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
    getReimbursement,
    getReimbursementFull,
    reimbursementList,
    removeReimbursement,
    submitReimbursement,
    searchReimbursement,
    approveReimbursement,
    rejectReimbursement,
    getCategories
}