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

// justyne logout
app.post("/logout", loginController.authenticateToken, logoutController.logout)
// // -------------------------EMPLOYEES-------------------------

// alex
// // Get all reimbursement collection
// Justyne
// // Download a specific reimbursement collection
app.get("/employee/reimbursement/download", loginController.authenticateToken, printController.downloadReimbursement)

app.get("/employee/reimbursement/:year", loginController.authenticateToken, reimburseController.getReimbursement)
app.get("/employee/reimbursement", loginController.authenticateToken, reimburseController.getReimbursement)

// alex
// // Get all items from a specific reimbursement collection
app.get("/employee/reimbursement/items/:cutoff_id", loginController.authenticateToken, reimburseController.reimbursementList)

// charles + all debug
// Add reimbursement item, automatically creates a reimbursement collection if not made
app.post("/employee/reimbursement/item/add", loginController.authenticateToken, reimburseController.addReimbursement)

// Justyne
// // Delete reimbursement item, amount automatically decreases accordingly
app.delete("/employee/reimbursement/item/remove/:orNumber", loginController.authenticateToken, reimburseController.removeReimbursement)

// John
// // Submit a specific reimbursement collection
// app.post("/reimbursement/submit/:reimbursement_id", loginController.authenticateToken, reimburseController.submitReimbursement)

// charles
// Calculate flex points
app.get("/flexpoints/calculator", loginController.authenticateToken, flexPointsController.calculateFlexPoints)

// // ----------------------------HR------------------------------

// John
// // Search a reimbursement collection via employee details
// app.get("/reimbursement/search", loginController.authenticateToken, reimburseController.searchReimbursement)

// alex
// Reject a specific reimbursement collection
app.post("/hr/reimbursement/reject/:employeeNumber", loginController.authenticateToken, reimburseController.rejectReimbursement)

// alex
// // Approve a specific reimbursement collection
app.post("/hr/reimbursement/approve/:employeeNumber", loginController.authenticateToken, reimburseController.approveReimbursement)

// charles
// Get all submitted reimbursement collection in a cut off
app.get("/hr/reimbursement/:year/:cutOffCycle", loginController.authenticateToken, reimburseController.getReimbursementByCutOff)

// John
// Get all items from a specific reimbursement collection in a cut off
app.get("/hr/reimbursement/:year/:cutOffCycle/:employeeNumber", loginController.authenticateToken, reimburseController.getDetailsHr)

app.listen(5000, () => {  
    console.log('App is running...');
})

module.exports.handler = serverless(app);
