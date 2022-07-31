const calculateFlexPoints = (req, res) => {
    if (req.user.role != 'employee') {
        res.status(400).send("This function is for employees only.")
        return
    }

    let monthlyRate = req.query.monthly_rate
    let flexCredits = req.query.flex_credits
    let taxRate = process.env.TAX_RATE

    if (!monthlyRate || !flexCredits) {
        res.status(400).send("Missing required components: monthly rate or flex credits.")
        return
    }

    let flexPoints = ((monthlyRate * (1 - taxRate)) / 21.75) * flexCredits
    
    if (isNaN(flexPoints)) {
        res.status(400).send("Only numbers are allowed for parameters.")
        return
    }

    res.status(200).send({
        "monthly_rate": monthlyRate,
        "flex_credits": flexCredits,
        "flexPoints": flexPoints.toFixed(2)
    })

}

module.exports = {
    calculateFlexPoints
}