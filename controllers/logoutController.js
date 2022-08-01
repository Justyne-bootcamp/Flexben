const loginService = require('../services/loginService')

const USERS_TABLE = process.env.USERS_TABLE

const logout = async(req, res) => {

    const updateParams = {
        TableName: USERS_TABLE,
        Key: {
            employeeId: req.user.email
        },
        UpdateExpression: 'set tokenStatus = :s',
        ExpressionAttributeValues: {
            ':s': 'inactive'
        }
    }
    await loginService.updateToken(updateParams);
    res.send("succesful logout");
}

module.exports = { logout }