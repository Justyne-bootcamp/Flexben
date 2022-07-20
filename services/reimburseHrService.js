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

// HR can view all reimbursements submitted in a cut-off cycle
const getReimbursementHr = (cutoff_id) => {
    let getCollection =
        `
        select flex_reimbursement.flex_reimbursement_id, flex_reimbursement.transaction_number , employees.employee_number, concat(employees.firstname, ' ', employees.lastname) as employee_name, flex_reimbursement.total_reimbursement_amount, flex_reimbursement.date_submitted, flex_reimbursement.status
        from flex_reimbursement
        left join employees on flex_reimbursement.employee_id=employees.employee_id
        where (flex_reimbursement.status='submitted' 
        OR flex_reimbursement.status='approved'
        OR flex_reimbursement.status='rejected')
        AND flex_reimbursement.flex_cut_off_id=?
        `
    return new Promise(function (resolve, reject) {
        connection.query(getCollection, cutoff_id, function (error, results) {
            if (error) reject(new Error(error));
            else {
                resolve(JSON.stringify(results))
            }
        })
    })
}

// HR can view the details of a reimbursement
const getReimbursementFull = async (reimbursement_id) => {
    const getReimbursmentFullDetail = () => {
        let reimbursementFullQuery =
            `
            select employees.employee_number, concat(employees.firstname, ' ', employees.lastname) as employee_name, flex_reimbursement.date_submitted, flex_reimbursement.total_reimbursement_amount, flex_reimbursement.transaction_number, flex_reimbursement.status
            from flex_reimbursement
            left join employees on flex_reimbursement.employee_id=employees.employee_id
            where flex_reimbursement_id=?
            AND (flex_reimbursement.status='submitted' 
            OR flex_reimbursement.status='approved'
            OR flex_reimbursement.status='rejected')
          `
        return new Promise(function (resolve, reject) {
            connection.query(reimbursementFullQuery, reimbursement_id, function (error, results) {
                if (error) reject(new Error(error));
                else {
                    resolve(JSON.stringify(results[0]))
                }
            })
        })
    }

    const getReimbursmentItems = () => {
        let reimbursementItemsQuery =
            `
            select flex_reimbursement_details.date_added, flex_reimbursement_details.or_number, flex_reimbursement_details.name_of_establishment, flex_reimbursement_details.tin_of_establishment, flex_reimbursement_details.amount, categories.name as 'category_name'
            from flexbendb.flex_reimbursement_details
            left join categories on categories.category_id=flex_reimbursement_details.category_id
            where flex_reimbursement_details.flex_reimbursement_id=1
            `
        return new Promise(function (resolve, reject) {
            connection.query(reimbursementItemsQuery, reimbursement_id, function (error, results) {
                if (error) reject(new Error(error));
                else {
                    resolve(JSON.stringify(results))
                }
            })
        })
    }


    let reimbursementFullDetail = JSON.parse(await getReimbursmentFullDetail())
    reimbursementFullDetail.reimbursement_items = JSON.parse(await getReimbursmentItems())

    return Promise.resolve(reimbursementFullDetail)
}

const searchEmployee = async (search_info) => {
    let insertEmployeeId = ""
    let search_params = ["%" + search_info.firstname + "%", "%" + search_info.lastname + "%"]
    console.log(search_params);
    if (search_info.employee_id != "") {
        insertEmployeeId = "and employees.employee_id=?"
        search_params.push(search_info.employee_id)
    }
    let reimbursementFullQuery =
        `
            select employees.employee_id, employees.lastname, employees.firstname
            from employees
            where (employees.firstname LIKE ?
            and employees.lastname LIKE ?)
            ${insertEmployeeId}
          `
    return new Promise(function (resolve, reject) {
        connection.query(reimbursementFullQuery, search_params, function (error, results) {
            if (error) reject(new Error(error));
            else {
                resolve(JSON.stringify(results))
            }
        })
    })
}

const searchReimbursement = async (employee_id) => {
    const getReimbursementFullDetail = async () => {
        let reimbursementFullQuery =
            `
            select flex_reimbursement.flex_reimbursement_id, employees.employee_number, concat(employees.firstname, ' ', employees.lastname) as employee_name, flex_reimbursement.date_submitted, flex_reimbursement.total_reimbursement_amount, flex_reimbursement.transaction_number, flex_reimbursement.status
            from flex_reimbursement
            left join employees on flex_reimbursement.employee_id=employees.employee_id
            where flex_reimbursement.employee_id=?
            AND (flex_reimbursement.status='submitted'
            OR flex_reimbursement.status='approved'
            OR flex_reimbursement.status='rejected')
            order by flex_reimbursement.flex_reimbursement_id desc
          `
        return new Promise(function (resolve, reject) {
            connection.query(reimbursementFullQuery, employee_id, function (error, results) {
                if (error) reject(new Error(error));
                else {
                    resolve(JSON.stringify(results[0]))
                }
            })
        })
    }

    const getReimbursmentItems = async (flex_reimbursement_id) => {
        let reimbursementItemsQuery =
            `
            select flex_reimbursement_details.date_added, flex_reimbursement_details.or_number, flex_reimbursement_details.name_of_establishment, flex_reimbursement_details.tin_of_establishment, flex_reimbursement_details.amount, categories.name as 'category_name'
            from flexbendb.flex_reimbursement_details
            left join categories on categories.category_id=flex_reimbursement_details.category_id
            where flex_reimbursement_details.flex_reimbursement_id=?
            `
        return new Promise(function (resolve, reject) {
            connection.query(reimbursementItemsQuery, flex_reimbursement_id, function (error, results) {
                if (error) reject(new Error(error));
                else {
                    resolve(JSON.stringify(results))
                }
            })
        })
    }

    let reimbursementFullDetail = await getReimbursementFullDetail() ? JSON.parse(await getReimbursementFullDetail()) : null

    if (reimbursementFullDetail) {
        reimbursementFullDetail.reimbursement_items = JSON.parse(await getReimbursmentItems(reimbursementFullDetail.flex_reimbursement_id))
        return Promise.resolve(reimbursementFullDetail)
    }
    else {
        return Promise.resolve()
    }

}

const approvalReimbursement = async (reimbursement_id, status, date_updated) => {
    let checkIfExists = async () => {
        let checkIfExistsQuery =
            `
            select * from flex_reimbursement
            where flex_reimbursement.flex_reimbursement_id=?
            and flex_reimbursement.status='submitted'
            AND (flex_reimbursement.status!='approved' OR flex_reimbursement.status!='rejected')
            `
        return new Promise(function (resolve, reject) {
            connection.query(checkIfExistsQuery, [reimbursement_id], function (error, results) {
                if (error) reject(new Error(error));
                else {
                    resolve(JSON.stringify(results))
                }
            })
        })
    }

    let checkIfExistsValue = JSON.parse(await checkIfExists()) ? JSON.parse(await checkIfExists()) : null
    if (checkIfExistsValue.length == 0) {
        return 0
    }

    let dbQuery =
        `
        update flex_reimbursement
        set flex_reimbursement.status=?, flex_reimbursement.date_updated=?
        where flex_reimbursement.flex_reimbursement_id=?
        `
    connection.query(dbQuery, [status, date_updated, reimbursement_id], function (error, _results) {
        if (error) throw new Error(error)
    })

    let dbQueryItem =
        `
        update flex_reimbursement_details
        set flex_reimbursement_details.status=?, flex_reimbursement_details.date_updated=?
        where flex_reimbursement_details.flex_reimbursement_id=?
        `
    connection.query(dbQueryItem, [status, date_updated, reimbursement_id], function (error, _results) {
        if (error) throw new Error(error)
    })
    return 1
}

module.exports = {
    getReimbursementHr,
    getReimbursementFull,
    searchEmployee,
    searchReimbursement,
    approvalReimbursement
}