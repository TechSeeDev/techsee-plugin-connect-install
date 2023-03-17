import { CloudFront } from '@aws-sdk/client-cloudfront';
const region = process.env.AWS_REGION || "eu-central-1";
const cloudFront = new CloudFront({ region: region });

const { CLOUDFRONT_DISTRIBUTION_ID} =  process.env;
export const handler = async(event,context) => {


 const records = event.Records;
  // console.log("records",records)
    for (const record of records) {
        if (record.eventName === 'ObjectUpdated:Put') {
            // console.log(`File ${record.s3.object.key} was updated`);
            const file=`/${record.s3.object.key}`;
           await  refreshcloudFront(file,CLOUDFRONT_DISTRIBUTION_ID)
        }
    }
};


const refreshcloudFront=async(objectPath,distributionId)=>{
  const params = {
    DistributionId: distributionId,
      InvalidationBatch: {
        Paths: {
          Quantity: 1,
          Items: [objectPath]
        },
        CallerReference: Date.now().toString()
      }
     };
     const result = await cloudFront.createInvalidation(params);
    //  console.log(result)
}