const express = require("express")
const loginController = require("./controllers/loginController")
const reimburseController = require("./controllers/reimburseController")
const flexPointsController = require('./controllers/flexPointsController')
const printService = require('./services/printService')
const router = express.Router()

// -----------------------ALL PERSONNEL----------------------
router.post("/login", loginController.login)
router.get("/categories", loginController.authenticateToken, reimburseController.getCategories)

// -------------------------EMPLOYEES-------------------------

// Get all reimbursement collection
router.get("/reimbursement", loginController.authenticateToken, reimburseController.getReimbursement)

// Get all items from a specific reimbursement collection
router.get("/reimbursement/items/:reimbursement_id", loginController.authenticateToken, reimburseController.reimbursementList)

// Add reimbursement item, automatically creates a reimbursement collection if not made
router.post("/reimbursement/item/add", loginController.authenticateToken, reimburseController.addReimbursement)

// Delete reimbursement item, amount automatically decreases accordingly
router.delete("/reimbursement/item/remove/:item_id", loginController.authenticateToken, reimburseController.removeReimbursement)

// Submit a specific reimbursement collection
router.post("/reimbursement/submit/:reimbursement_id", loginController.authenticateToken, reimburseController.submitReimbursement)

// Calculate flex points
router.get("/flexpoints/calculator", loginController.authenticateToken, flexPointsController.calculateFlexPoints)

// Download a specific reimbursement collection
router.get("/reimbursement/download/:reimbursement_id", loginController.authenticateToken, printService.downloadReimbursement)

// ----------------------------HR------------------------------

// Search a reimbursement collection via employee details
router.get("/reimbursement/search", loginController.authenticateToken, reimburseController.searchReimbursement)

// Reject a specific reimbursement collection
router.post("/reimbursement/reject/:reimbursement_id", loginController.authenticateToken, reimburseController.rejectReimbursement)

// Approve a specific reimbursement collection
router.post("/reimbursement/approve/:reimbursement_id", loginController.authenticateToken, reimburseController.approveReimbursement)

// Get all submitted reimbursement collection in a cut off
router.get("/reimbursement/:cutoff_id", loginController.authenticateToken, reimburseController.getReimbursement)

// Get all items from a specific reimbursement collection in a cut off
router.get("/reimbursement/:cutoff_id/:reimbursement_id", loginController.authenticateToken, reimburseController.getReimbursementFull)

module.exports = router