const { json } = require("express");
const mysql = require("mysql")

const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
});

connection.connect(error => {
    if (error) throw error;
});

const getLatestCutoffCycle = async () => {
    let dbQuery =
        `
        select flex_cut_off_id, cut_off_cap_amount from flex_cycle_cut_offs order by flex_cut_off_id desc limit 1
        `
    return new Promise(function (resolve, reject) {
        connection.query(dbQuery, function (error, results) {
            if (error) reject(new Error(error));
            else {
                resolve(JSON.stringify(results[0]))
            }
        })
    })
}

const getCategories = async () => {
    let getCategoriesQuery = 
    `
    select * from categories
    `
    return new Promise(function (resolve, reject) {
        connection.query(getCategoriesQuery, function (error, results) {
            if (error) reject(new Error(error));
            else {
                resolve(JSON.stringify(results))
            }
        })
    })
}

const addReimbursement = async (reimbursementItemDetails, employee_id, latestCuttoffCycle) => {
    // Check if there is an existing reimbursement for the logged in employee for the current cut off cycle
    const checkIfExistingReimbursement = async () => {
        let dbQuery =
            `
            select * from flex_reimbursement 
            where employee_id=?
            and status='draft'
            and flex_cut_off_id=?
            `
        return new Promise(function (resolve, reject) {
            connection.query(dbQuery, [employee_id, latestCuttoffCycle], function (error, results) {
                if (error) reject(new Error(error));
                else {
                    resolve(JSON.stringify(results))
                }
            })
        })
    }

    let reimbursementId
    if (JSON.parse(await checkIfExistingReimbursement()).length != 0) {
        reimbursementId = JSON.parse(await checkIfExistingReimbursement())[0].flex_reimbursement_id
    }

    // If there is an existing entry, the item will be updated, else a new entry will be created 
    if (reimbursementId) {
        let reimbursementQuery =
            `
            update flex_reimbursement
            set total_reimbursement_amount=total_reimbursement_amount+?, date_updated=?
            where employee_id=?
            and status='draft'
            and flex_cut_off_id=?
            `
        connection.query(reimbursementQuery, [reimbursementItemDetails.amount, reimbursementItemDetails.date_added, employee_id, latestCuttoffCycle], function (error, _results) {
            if (error) throw new Error(error)
        })
    }
    else {
        let reimbursementQuery =
            `
            insert into flex_reimbursement (employee_id, flex_cut_off_id, total_reimbursement_amount, status, date_updated)
            values(?,?,?,?,?)
            `
        connection.query(reimbursementQuery, [employee_id, latestCuttoffCycle, reimbursementItemDetails.amount, reimbursementItemDetails.status, reimbursementItemDetails.date_added], function (error, _results) {
            if (error) throw new Error(error);
        })

        // Retrieve the ID of the recently new flex reimbursement collection
        const getReimbursementId = () => {
            let reimbursementIdQuery =
                `
                select LAST_INSERT_ID() AS flex_reimbursement_id
                `
            return new Promise(function (resolve, reject) {
                connection.query(reimbursementIdQuery, [employee_id, latestCuttoffCycle], function (error, results) {
                    if (error) reject(new Error(error));
                    else {
                        resolve(JSON.stringify(results[0]))
                    }
                })
            })
        }

        reimbursementId = JSON.parse(await getReimbursementId()).flex_reimbursement_id
    }

    // Aside from the collective entry for a single employee transaction, each entry will be logged
    let reimbursementDetailQuery =
        `
        insert into flex_reimbursement_details (flex_reimbursement_id, or_number, name_of_establishment, tin_of_establishment, amount, category_id, status, date_added, date_updated)
        values (?,?,?,?,?,?,?,?, ?)
        `
    connection.query(reimbursementDetailQuery, [
        reimbursementId,
        reimbursementItemDetails.or_number,
        reimbursementItemDetails.name_of_establishment,
        reimbursementItemDetails.tin_of_establishment,
        reimbursementItemDetails.amount,
        reimbursementItemDetails.category_id,
        reimbursementItemDetails.status,
        reimbursementItemDetails.date_added,
        reimbursementItemDetails.date_added
    ], function (error, _results) {
        if (error) throw new Error(error)
    })

    // Returns the total reimbursement amount
    let totalAmountQuery =
        `
        select total_reimbursement_amount from flex_reimbursement
        where employee_id=?
        and status='draft'
        and flex_cut_off_id=?
        `
    return new Promise(function (resolve, reject) {
        connection.query(totalAmountQuery, [employee_id, latestCuttoffCycle], function (error, results) {
            if (error) reject(new Error(error));
            else {
                resolve(JSON.stringify(results[0]))
            }
        })
    })
}

const getReimbursement = (employee_id) => {
    let dbQuery =
        `
        select * from flex_reimbursement
        where employee_id=?
        `
    return new Promise(function (resolve, reject) {
        connection.query(dbQuery, employee_id, function (error, results) {
            if (error) reject(new Error(error));
            else {
                resolve(results)
            }
        })
    })
}

const reimbursementList = (employee_id, reimbursement_id) => {
    let params = [employee_id]
    let addQuery = ""
    if (reimbursement_id != undefined) {
        addQuery = `and flex_reimbursement.flex_reimbursement_id=?`
        params.push(reimbursement_id)
    }

    let dbQuery =
        `
        select flex_reimbursement_details.* from flex_reimbursement_details 
        left join flex_reimbursement on flex_reimbursement_details.flex_reimbursement_id=flex_reimbursement.flex_reimbursement_id 
        where flex_reimbursement.employee_id=?
        ${reimbursement_id == undefined ? "" : addQuery}
        `
    return new Promise(function (resolve, reject) {
        connection.query(dbQuery, params, function (error, results) {
            if (error) reject(new Error(error));
            else {
                resolve(results)
            }
        })
    })
}

const removeReimbursement = async (id, dateNow) => {
    const getReimbursementToBeDeleted = async () => {
        let dbQuery =
            `
            select flex_reimbursement_details.amount, flex_reimbursement_details.flex_reimbursement_id 
            from flex_reimbursement_details
            where flex_reimbursement_detail_id=?
            and status='draft'
            `
        return new Promise(function (resolve, reject) {
            connection.query(dbQuery, id, function (error, results) {
                if (error) reject(new Error(error));
                else {
                    resolve(JSON.stringify(results[0]))
                }
            })
        })
    }

    let reimbursementToBeDeleted = JSON.parse(await getReimbursementToBeDeleted());

    let subtractQuery =
        `
        update flex_reimbursement
        set total_reimbursement_amount=total_reimbursement_amount-?, date_updated=?
        where flex_reimbursement_id=?
        `
    connection.query(subtractQuery, [reimbursementToBeDeleted.amount, dateNow, reimbursementToBeDeleted.flex_reimbursement_id], function (error, _results) {
        if (error) throw new Error(error)
    })

    let deleteQuery =
        `
        delete from flex_reimbursement_details
        where flex_reimbursement_detail_id=?
        `
    connection.query(deleteQuery, id, function (error, _results) {
        if (error) throw new Error(error)
    })
}

const submitReimbursement = async (employee_id, id, dateNow) => {
    const getCompanyCode = async () => {
        let dbQuery =
            `
            select companies.code
            from employees
            right join companies on companies.company_id=employees.company_id
            where employees.employee_id=?
            `
        return new Promise(function (resolve, reject) {
            connection.query(dbQuery, employee_id, function (error, results) {
                if (error) reject(new Error(error));
                else {
                    resolve(JSON.stringify(results[0]))
                }
            })
        })
    }

    const getCutOffCycle = async () => {
        let dbQuery =
            `
            select flex_cut_off_id
            from flex_reimbursement
            where flex_reimbursement_id=?
            `
        return new Promise(function (resolve, reject) {
            connection.query(dbQuery, id, function (error, results) {
                if (error) reject(new Error(error));
                else {
                    resolve(JSON.stringify(results[0]))
                }
            })
        })
    }

    let companyCode = JSON.parse(await getCompanyCode()).code;
    let cutOffCycle = JSON.parse(await getCutOffCycle()).flex_cut_off_id;

    let transactionId = `${companyCode}-${cutOffCycle}-${dateNow.split("/")[0] + dateNow.split("/")[1] + dateNow.split("/")[2]}-${id}`

    let submitCollectionQuery =
        `
        update flex_reimbursement
        set date_submitted=?, status='submitted', date_updated=?, transaction_number=?
        where flex_reimbursement_id=?
        `
    connection.query(submitCollectionQuery, [dateNow, dateNow, transactionId, id], function (error, _results) {
        if (error) throw new Error(error)
    })

    let submitReimbursememtQuery =
        `
        update flex_reimbursement_details
        set status='submitted', date_updated=?
        where flex_reimbursement_id=?
        `
    connection.query(submitReimbursememtQuery, [dateNow, id], function (error, _results) {
        if (error) throw new Error(error)
    })
}

module.exports = {
    addReimbursement,
    getReimbursement,
    getLatestCutoffCycle,
    reimbursementList,
    removeReimbursement,
    submitReimbursement,
    getCategories
}