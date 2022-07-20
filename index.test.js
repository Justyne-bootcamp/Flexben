const supertest = require('supertest')
const app = require('./index')

describe("POST /login", () => {
    describe("given email as username and password on basic auth", () => {
        // respond with json in the content type header
        // respond with json object containing message and access token
        // respond with 200 status code
        test("respond with 200 status code", () => {
            const response = request(app).post('/login').send({
                username: "username",
                password: "password"
            })
            expect(response.statusCode).toBe(200)
        })
    })
    describe("when username or password is missing", () => {
        // respond with status code of 400
    })
})