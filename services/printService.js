const path = require('path')
const mysql = require("mysql")
const fs = require('fs');

const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
});

connection.connect(error => {
    if (error) throw error;
});

const downloadReimbursement = async (req, res) => {
    const checkIfExists = async (employee_id, reimbursement_id) => {
        let checkIfExistsQuery =
            `
        select concat(employees.lastname, ', ', employees.firstname) as employee_name, employees.employee_number, flex_reimbursement.date_submitted, flex_reimbursement.transaction_number, flex_reimbursement.total_reimbursement_amount, flex_reimbursement.status
        from flex_reimbursement
        left join employees on flex_reimbursement.employee_id=employees.employee_id
        where flex_reimbursement.employee_id=?
        and (flex_reimbursement.status='submitted' or flex_reimbursement.status='approved')
        and flex_reimbursement.flex_reimbursement_id=?
        `
        return new Promise(function (resolve, reject) {
            connection.query(checkIfExistsQuery, [employee_id, reimbursement_id], function (error, results) {
                if (error) reject(new Error(error));
                else {
                    resolve(JSON.stringify(results))
                }
            })
        })
    }

    let ifExistsResult = JSON.parse(await checkIfExists(req.user.employee_id, req.params.reimbursement_id))
    if (ifExistsResult.length == 0) {
        res.status(200).send("No reimbursement found. Please recheck reimbursement id.")
        return
    }

    const getItems = async (reimbursement_id) => {
        let getItemsQuery =
            `
        select categories.name,  flex_reimbursement_details.or_number, flex_reimbursement_details.name_of_establishment, flex_reimbursement_details.tin_of_establishment, flex_reimbursement_details.amount, flex_reimbursement_details.status
        from flex_reimbursement_details
        left join categories on flex_reimbursement_details.category_id=categories.category_id
        where flex_reimbursement_details.flex_reimbursement_id=?
        `
        return new Promise(function (resolve, reject) {
            connection.query(getItemsQuery, [reimbursement_id], function (error, results) {
                if (error) reject(new Error(error));
                else {
                    resolve(JSON.stringify(results))
                }
            })
        })
    }

    let collection = ifExistsResult[0]
    let items = JSON.parse(await getItems(req.params.reimbursement_id))
    let transaction_txt =
`Employee Name: ${collection.employee_name}
Employee Number: ${collection.employee_number}
Date Submitted: ${collection.date_submitted.split("T")[0]}
Transaction Number: ${collection.transaction_number}
Amount: Php ${collection.total_reimbursement_amount}

=== DETAILS ===
    ${items.map(item => {
        return (
        `
Category: ${item.name}
OR Number: ${item.or_number}
Name of Establishment: ${item.name_of_establishment}
TIN of Establishment: ${item.tin_of_establishment}
Amount: Php ${item.amount}
Status: ${item.status}
`)
        }).join(' ')}
    `
    fs.writeFileSync('./services/reimbursement.txt', transaction_txt)
    res.download(path.resolve('./services/reimbursement.txt'))
}

module.exports = {
    downloadReimbursement
}