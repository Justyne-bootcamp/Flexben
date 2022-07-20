require('dotenv').config()
const bcrypt = require('bcrypt')
const loginService = require('../services/loginService')
const jwt = require('jsonwebtoken')

const login = async (req, res) => {
    try {
        let base64Encoding = req.headers.authorization.split(" ")[1];
        let credentials = Buffer.from(base64Encoding, "base64").toString().split(":")
        const userInfo = await loginService.login(credentials[0])
        if (userInfo != null && await bcrypt.compare(credentials[1], userInfo.password)) {
            // Successful login
            // JWT authorization, serializes email
            const user = {
                "user": credentials[0],
                "employee_id": userInfo.employee_id,
                "role": userInfo.role
            }
            const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN)
            res.json({
                "message": "Welcome back, " + userInfo.firstname + " " + userInfo.lastname + " (" + userInfo.role + ")",
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

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    // 401 Status: Theres no token
    if (token == null) res.sendStatus(401)
    else {
        jwt.verify(token, process.env.ACCESS_TOKEN, (err, user) => {
            // 403 Status: You have an invalid token
            if (err) res.sendStatus(403)
            else {
                req.user = user
                next()
            }
        })
    }
}

module.exports = {
    login,
    authenticateToken
}
