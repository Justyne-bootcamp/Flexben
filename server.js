const express = require('express')
const router = require('./index')
const app = express()
app.use(express.json())
app.use(router)
app.listen(5000, () => {
    console.log('App is running...');
})