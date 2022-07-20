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

const login = (email) => {
    let dbQuery =
        `
        select employees.firstname, employees.lastname, employees.email, roles.name as role, accounts.password, employees.employee_id
        from employees
        inner join accounts on employees.employee_id=accounts.employee_id
        inner join roles on employees.role_id=roles.role_id
        where employees.email=?
        `
    return new Promise(function (resolve, reject) {
        connection.query(dbQuery, [email], function (error, results) {
            if (error) reject(new Error(error));
            if (results != "") {
                let userInfo = {
                    "firstname": results[0].firstname,
                    "lastname": results[0].lastname,
                    "email": results[0].email,
                    "password": results[0].password,
                    "employee_id": results[0].employee_id,
                    "role": results[0].role
                }
                resolve(userInfo)
            }
            else {
                resolve(null)
            }
        })
    })
}

module.exports = {
    login
}
