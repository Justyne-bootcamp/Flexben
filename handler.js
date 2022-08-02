const express = require("express")
const serverless = require('serverless-http')
const loginController = require("./controllers/loginController")
const logoutController = require("./controllers/logoutController")
const reimburseController = require("./controllers/reimburseController")
const flexPointsController = require('./controllers/flexPointsController')
const printController = require('./controllers/printController')

const app = express();

app.use(express.json());

// -----------------------ALL PERSONNEL----------------------
app.post("/login", loginController.login)
app.get("/categories", loginController.authenticateToken, reimburseController.viewCategories)
app.post("/logout", loginController.authenticateToken, logoutController.logout)
// // -------------------------EMPLOYEES-------------------------

// // Download a specific reimbursement collection
app.get("/employee/reimbursement/download", loginController.authenticateToken, printController.downloadReimbursement)

// // Get all reimbursement collection
app.get("/employee/reimbursement/:year", loginController.authenticateToken, reimburseController.getReimbursement)
app.get("/employee/reimbursement", loginController.authenticateToken, reimburseController.getReimbursement)

// arrange data
// // Get all items from a specific reimbursement collection
app.get("/employee/reimbursement/items/:cutOffCycle", loginController.authenticateToken, reimburseController.reimbursementList)

// Add reimbursement item, automatically creates a reimbursement collection if not made
app.post("/employee/reimbursement/item/add", loginController.authenticateToken, reimburseController.addReimbursement)

// // Delete reimbursement item, amount automatically decreases accordingly
app.delete("/employee/reimbursement/item/remove/:orNumber", loginController.authenticateToken, reimburseController.removeReimbursement)

// // Submit a specific reimbursement collection
app.post("/employee/reimbursement/submit", loginController.authenticateToken, reimburseController.submitReimbursement)

// Calculate flex points
app.get("/flexpoints/calculator", loginController.authenticateToken, flexPointsController.calculateFlexPoints)

// // ----------------------------HR------------------------------

// Search a reimbursement collection via employee details
app.get("/hr/reimbursement/search", loginController.authenticateToken, reimburseController.searchReimbursement)

// Reject a specific reimbursement collection
app.post("/hr/reimbursement/approval/:action/:employeeNumber", loginController.authenticateToken, reimburseController.approvalReimbursement)

// Get all submitted reimbursement collection in a cut off
app.get("/hr/reimbursement/:year/:cutOffCycle", loginController.authenticateToken, reimburseController.getReimbursementByCutOff)

// Get all items from a specific reimbursement collection in a cut off
app.get("/hr/reimbursement/:year/:cutOffCycle/:employeeNumber", loginController.authenticateToken, reimburseController.getDetailsHr)

module.exports.handler = serverless(app);
