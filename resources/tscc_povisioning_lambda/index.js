import { CloudFront } from '@aws-sdk/client-cloudfront';
const AWS = require("aws-sdk");
const cloudFront = new CloudFront({ region: region });
AWS.config.update({ region: process.env.AWS_REGION || "eu-central-1" });

exports.handler = async (event) => {
    try {
        if (event.httpMethod === "POST") {
            const body = JSON.parse(event.body);
            if (body["delete"]) {
                await saveDataToS3({});
                await refreshcloudFront();
                return buildResponse(200, JSON.stringify({}));
            } else {
                await saveDataToS3(body);
                await refreshcloudFront();
                const data = await getDataFromS3();
                return buildResponse(201, JSON.stringify(data));
            }
        } else {
            const data = await getDataFromS3();
            return buildResponse(200, JSON.stringify(data));
        }
    } catch (e) {
        return buildResponse(200, JSON.stringify({}));
    }
};

const saveDataToS3 = async (data) => {
    const jsonData = JSON.stringify(data);
    const s3 = new AWS.S3();

    const buf = Buffer.from(jsonData);

    const bucketData = {
        Bucket: process.env.bucket || "tscc-frontend",
        Key: "provisioning.json",
        Body: buf,
        ContentEncoding: "utf-8",
        ContentType: "application/json",
        // ACL: 'public-read'
    };

    return new Promise((res, rej) => {
        s3.upload(bucketData, function (err, data) {
            if (err) {
                console.log(err);
                rej("Error uploading data: ", data);
            } else {
                res("succesfully uploaded!!!");
            }
        });
    });
};

const getDataFromS3 = async () => {
    try {
        const s3 = new AWS.S3();

        let data = await s3
            .getObject({
                Bucket: process.env.bucket || "tscc-frontend",
                Key: "provisioning.json",
            })
            .promise();

        data = data.Body.toString("utf-8");
        // data = JSON.parse(data)

        return JSON.parse(data);
    } catch (e) {
        return {};
    }
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
        body,
    };
}


const refreshcloudFront=async()=>{
    const objectPath = '/provisioning.json';
    const params = {};
    let distributions = [];
       do {
        const result = await cloudFront.listDistributions(params);
        distributions = distributions.concat(result.DistributionList.Items);
  
        if (result.DistributionList.IsTruncated) {
          params.Marker = result.DistributionList.NextMarker;
        } else {
          params.Marker = undefined;
        }
      } while (params.Marker);
    
      for (const distribution of distributions) {
          const origins = distribution.Origins.Items;
           for (const origin of origins) {
               console.log(origin.DomainName)
                if (origin.DomainName.startsWith("tscc-web-app-bucket")) {
                      const distributionId = distribution.Id;
            const paramsDi = {
              DistributionId: distributionId,
                InvalidationBatch: {
                  Paths: {
                    Quantity: 1,
                    Items: [objectPath]
                  },
                  CallerReference: Date.now().toString()
                }
               };
               const result = await cloudFront.createInvalidation(paramsDi);
                }
           }
           
      }
  }