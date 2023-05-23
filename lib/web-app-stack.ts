import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3Deployment from "aws-cdk-lib/aws-s3-deployment";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import ResourcesName from "./constants";


const bucketName = ResourcesName.BUCKET;

interface WepAppStackProps extends cdk.StackProps {
    tscc_provisioning_api_url?: string;
    tscc_activation_api_url?: string;
}

export class WepAppStack extends cdk.Stack {
    distributionDomainName: string;
    distributionId: string;
    Bucket: string = bucketName;
    constructor(scope: Construct, id: string, props?: WepAppStackProps) {
        super(scope, id, props);
        /**
         *s3 bucket for static react app
         */
        const tscc_web_app_bucket = new s3.Bucket(this, bucketName, {
            publicReadAccess: true,


            ///////////////////////////////////////////////////
            blockPublicAccess: new s3.BlockPublicAccess({
                blockPublicAcls: false,
                ignorePublicAcls: false,
                blockPublicPolicy: false,
                restrictPublicBuckets: false,
              }),
            /////////////////////////////////////////////////////  
            bucketName: bucketName,
            websiteIndexDocument: 'index.html',
            websiteErrorDocument: 'index.html',
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
        });


      // Add bucket policy to allow public read access
      tscc_web_app_bucket.addToResourcePolicy(
        new cdk.aws_iam.PolicyStatement({
            actions: [
                's3:*',
                's3:GetObject',
                's3:ListBucket',
                's3:PutBucketPolicy',
            ],
            resources: [tscc_web_app_bucket.bucketArn, `${tscc_web_app_bucket.bucketArn}/*`],
            principals: [new cdk.aws_iam.AnyPrincipal()],
        })
    );/////////////////////////////////////////////////////
  
        // web app deployment
        new s3Deployment.BucketDeployment(this, ResourcesName.WEB_APP, {
            sources: [s3Deployment.Source.asset("./resources/build")],
            destinationBucket: tscc_web_app_bucket,
        });

        // Cloudfront
        const cf = new cloudfront.CloudFrontWebDistribution(
            this,
            ResourcesName.CLOUDFRONT,
            {
                originConfigs: [
                    {
                        s3OriginSource: {
                            s3BucketSource: tscc_web_app_bucket,
                        },
                        behaviors: [{ isDefaultBehavior: true }],
                    },
                ],
                defaultRootObject: "index.html",
                errorConfigurations: [{
                    errorCode: 404,
                    responsePagePath: "/index.html",
                    responseCode: 200
                  }, {
                    errorCode: 403,
                    responsePagePath: "/index.html",
                    responseCode: 200
                  }],
            }
        );
        this.distributionDomainName = cf.distributionDomainName;
        this.distributionId=cf.distributionId;

    }
}
