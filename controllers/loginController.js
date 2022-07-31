const bcrypt = require('bcryptjs')
const loginService = require('../services/loginService')
const jwt = require('jsonwebtoken')

const USERS_TABLE = process.env.USERS_TABLE
const CATEGORIES_TABLE = process.env.CATEGORIES_TABLE
const CUTTOFFS_TABLE = process.env.CUTTOFFS_TABLE
const SECRET_KEY = process.env.SECRET_KEY

const login = async (req, res) => {
    try {
        let base64Encoding = req.headers.authorization.split(" ")[1];
        let credentials = Buffer.from(base64Encoding, "base64").toString().split(":")

        const loginParams = {
            TableName: USERS_TABLE,
            Key: {
                employeeId: credentials[0] // should be email for actual database
            }
        }
        // console.log(loginParams);
        const userInfo = await loginService.login(loginParams)
        if (userInfo != null && await bcrypt.compare(credentials[1], userInfo.password)) {
            // Successful login
            // JWT authorization, serializes email

            const user = {
                "email": credentials[0],
                "employeeNumber": userInfo.employeeNumber,
                "firstName": userInfo.firstName,
                "lastName": userInfo.lastName,
                "companyCode": userInfo.companyCode,
                "role": userInfo.role
            }
            // console.log(user);
            const accessToken = jwt.sign(user, SECRET_KEY)
            res.json({
                "message": "Welcome back, " + userInfo.firstName + " " + userInfo.lastName + " (" + userInfo.role + ")",
                "accessToken": accessToken
            })
        }
        else {
            res.send("Invalid email or password.")
        }
    }
    catch {
        res.status(500).send("Something went wrong.")
    }
}

let categoryList = []
let cutOffList = []
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    // 401 Status: Theres no token
    if (token == null) res.sendStatus(401)
    else {
        jwt.verify(token, SECRET_KEY, async (err, user) => {
            // 403 Status: You have an invalid token
            if (err) res.sendStatus(403)
            else {
                req.user = user
                // Populates/initializes categoryList
                if (categoryList.length == 0) {
                    const categoryListParams = {
                        TableName: CATEGORIES_TABLE,
                    }
                    categoryList = await loginService.getCategories(categoryListParams)
                }
                if (cutOffList.length == 0) {
                    const cutOffListParams = {
                        TableName: CUTTOFFS_TABLE,
                        ScanIndexForward: false,
                    }
                    cutOffList = await loginService.getCutOffs(cutOffListParams)
                }
                next()
            }
        })
    }
}

const exportCategories = async () => {
    return new Promise (function (resolve, _reject) {
        resolve(categoryList)
    })
}

const exportCutOffs = async () => {
    return new Promise (function (resolve, _reject) {
        resolve(cutOffList)
    })
}

const exportLatestCutOffs = async () => {
    return new Promise (function (resolve, _reject) {
        resolve(cutOffList[0])
    })
}

module.exports = {
    login,
    authenticateToken,
    exportCategories,
    exportCutOffs,
    exportLatestCutOffs
}
