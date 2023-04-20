const AWS = require("aws-sdk");
AWS.config.update({ region: process.env.AWS_REGION || "eu-central-1" });

exports.handler = async (event) => {
    // TODO implement
    if (event.httpMethod === "POST") {
        const body = JSON.parse(event.body);
        const configJoon= await getDataConfigFromS3();
        const configData= {...configJoon,ssoUrl:body.ssoUrl}
        
        await saveDataConfigToS3(configData);

        await saveDataToS3(body);
        return buildResponse(201, "succesfully added");
    } else {
        try {
            const data = await getDataFromS3();
            return buildResponse(200, JSON.stringify(data));
        } catch (e) {
            return buildResponse(200, JSON.stringify({}));
        }
    }
};

const saveDataToS3 = (data) => {
    const jsonData = JSON.stringify(data);
    const s3 = new AWS.S3();

    const buf = Buffer.from(jsonData);

    const bucketData = {
        Bucket: process.env.bucket || "tscc-frontend",
        Key: "activation.json",
        Body: buf,
        ContentEncoding: "utf-8",
        ContentType: "application/json",
    };

    return new Promise((res, rej) => {
        s3.upload(bucketData, function (err, data) {
            if (err) {
                rej("Error uploading data: ", data);
            } else {
                res("succesfully uploaded!!!");
            }
        });
    });
};

const getDataFromS3 = async () => {
    const s3 = new AWS.S3();

    let data = await s3
        .getObject({
            Bucket: process.env.bucket || "tscc-frontend",
            Key: "activation.json",
        })
        .promise();

    data = data.Body.toString("utf-8");

    return JSON.parse(data);
};
const getDataConfigFromS3 = async () => {
    try {
        const s3 = new AWS.S3();

        let data = await s3
            .getObject({
                Bucket: process.env.bucket || "tscc-frontend",
                Key: "config.json",
            })
            .promise();

        data = data.Body.toString("utf-8");

        return JSON.parse(data);
    } catch (e) {
        return {};
    }
};

const saveDataConfigToS3 = async (data) => {
    const jsonData = JSON.stringify(data);
    const s3 = new AWS.S3();

    const buf = Buffer.from(jsonData);

    const bucketData = {
        Bucket: process.env.bucket || "tscc-frontend",
        Key: "config.json",
        Body: buf,
        ContentEncoding: "utf-8",
        ContentType: "application/json",
    };

    return new Promise((res, rej) => {
        s3.upload(bucketData, function (err, data) {
            if (err) {
                rej("Error uploading data: ", data);
            } else {
                res("succesfully uploaded!!!");
            }
        });
    });
};


function buildResponse(statusCode, body) {
    return {
        statusCode: statusCode,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
        },
        body: body,
    };
}

