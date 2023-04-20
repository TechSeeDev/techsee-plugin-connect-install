import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from "constructs";

import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import ResourcesName from "./constants";
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';

interface S3ToCloudFrontStackProps extends cdk.StackProps {
    distribution_Id?: string;
    domain_name?: string;
    bucket_name?: string;

}
export class S3ToCloudFrontStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: S3ToCloudFrontStackProps) {
    super(scope, id, props);

// Use your existing CloudFront distribution
const distribution = cloudfront.CloudFrontWebDistribution.fromDistributionAttributes(this, ResourcesName.CLOUDFRONT, {
    distributionId: props?.distribution_Id || "",
    domainName: props?.domain_name||"",
  });
  const bucket = s3.Bucket.fromBucketName(this, props?.bucket_name||"", props?.bucket_name||"");

    // Create an AWS Lambda function that invalidates the CloudFront distribution
    const func = new lambda.Function(this, ResourcesName.S3_CLOUDFRONT_STACK, {
      functionName: ResourcesName.S3_CLOUDFRONT_STACK,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset("./resources/tscc-s3cloudFront-lamda"),
      environment: {
        CLOUDFRONT_DISTRIBUTION_ID: distribution.distributionId,
      },
      timeout: cdk.Duration.seconds(180)

    });

    // Add a CloudWatch Events rule that triggers the Lambda function when a new object is created in the S3 bucket


     // Configure event notifications for the S3 bucket
     bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED_PUT,
      new s3n.LambdaDestination(func)
    );

    // Allow the Lambda function to invalidate the CloudFront distribution
    distribution.grantCreateInvalidation(func);
  }
}
