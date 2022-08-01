const loginController = require('../controllers/loginController')
const reimburseService = require('../services/reimburseService')
const S3 = require('aws-sdk/clients/s3')

const TRANSACTIONS_TABLE = process.env.TRANSACTIONS_TABLE
const BUCKET_NAME = process.env.BUCKET_NAME

const downloadReimbursement = async (req, res) => {
    //get reimbursement of employee

    console.log("downloading");
    const cutOff = await loginController.exportLatestCutOffs()

    const reimbursementParams = {
        TableName: TRANSACTIONS_TABLE,
        ExpressionAttributeValues: {
            ':pk': req.user.employeeNumber  + "#" + cutOff.year + "#" + cutOff.cutOffCycle
        },
        KeyConditionExpression: 'PK = :pk'
    }
    const data = await reimburseService.getReimbursement(reimbursementParams);

    let employeeDataIndex = data.map((reimbursement) => {
        return reimbursement.SK;
    }).indexOf("USER");
    let employeeDataIndex2 = data.findIndex((reimbursement) => {
        return reimbursement.SK.indexOf("CUTOFF#") != -1;
    });

    if(data[employeeDataIndex].currentStatus == 'draft'){
        res.send("No submitted reimbursement. No file available");
        return;
    }

    const totalAmount = getTotalAmount(data);
    let content = getEmployeeData(data[employeeDataIndex], data[employeeDataIndex2], totalAmount);
    content += getDetails(data);
    
    
    let filename = `${req.user.employeeNumber}_${data[employeeDataIndex2].transactionNumber}.txt`;
    let key = `group2/files/${filename}`;

    await uploadFile(BUCKET_NAME, key, content);
    res.attachment(key);
    let file = await getFile(BUCKET_NAME, key);
    file.pipe(res);
}

async function uploadFile(bucket, key, content){
    const s3 = getS3Bucket();
    const uploadParams = {
        Bucket: bucket,
        ContentType: 'text/html',
        Body: content,
        Key: key
    }
    await s3.upload(uploadParams).promise();
}
async function getFile(bucket, key){
    const s3 = getS3Bucket();
    const params = {
        Bucket: bucket,
        Key: key
    }
    return s3.getObject(params).createReadStream();
}
function getS3Bucket(){
    const region = 'ap-southeast-1';

    return new S3({
        region
    })
}
function getTotalAmount(data){
    let amountList = data.map((reimbursement) => {
        return reimbursement.amount;
    });
    let totalAmount = 0;
    amountList.forEach(element => {
        if(element != undefined){
            totalAmount += element;
        }
    });
    return totalAmount;
}
function getEmployeeData(data1, data2, totalAmount){
    return `
Employee Name:	${data1.lastName}, ${data1.firstName}
Employee Number:	${data1.employeeNumber}
Date Submitted:		${data2.dateSubmitted}
Transaction Number: ${data2.transactionNumber}
Amount:	Php ${totalAmount}
Status:	${data2.currentStatus}

`;
}

function getDetails(data){

    let details = ``;
    let itemCounter = 0;

    data.forEach((element) => {
        if(element.SK.includes("ITEM#")){
            itemCounter++;

details += `
CATEGORY: ${getCategoryName(element.categoryDetails)}
Item # ${itemCounter}
Date: ${element.date}
OR Number: ${element.SK.replace('ITEM#', '')}
Name of Establishment: ${element.nameOfEstablishment}
TIN of Establishment: ${element.tinOfEstablishment}
Amount: Php ${element.amount}
Status: ${element.currentStatus}

`;
        }
    });
    return details;
}

function getCategoryName(string){
    if(string){
        return JSON.parse(string).name;
    }
    return "None";
}
module.exports = {
    downloadReimbursement
}