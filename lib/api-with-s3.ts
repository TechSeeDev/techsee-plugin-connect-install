import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cr from "aws-cdk-lib/custom-resources";
import ResourcesName from "./constants";

interface S3RestApiStackProps extends cdk.StackProps {
  tscc_activation_api_url?: string;
  tscc_provisioning_api_url?: string;
  tscc_sso_api_url?: string;
  bucket_name?: string;

}
export class S3RestApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: S3RestApiStackProps) {
    super(scope, id, props);

     // get an S3 bucket
     const bucket = s3.Bucket.fromBucketName(this, props?.bucket_name||"", props?.bucket_name||"");
 
     // Create an IAM role that grants read access to the S3 bucket
     const role = new iam.Role(this, ResourcesName.API_S3_ROLE, {
       assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com')
     });
     bucket.grantRead(role);
 
     // Create the REST API
     const api = new apigw.RestApi(this, ResourcesName.API_POLICY, {
       restApiName: ResourcesName.API_S3,
       description: ResourcesName.API_S3,
       defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: apigw.Cors.ALL_METHODS
      }
     });
 
     // Create a GET method on the REST API
     const fileResource = api.root.addResource('{proxy+}');

     // Configure the AWS Service integration
     const integration = new apigw.AwsIntegration({
       service: 's3',
       integrationHttpMethod:"GET",
       path:`${bucket.bucketName}/config.json`,
       options: {
         credentialsRole: role,
         integrationResponses: [
           {
             statusCode: '200',
             responseTemplates: {
               'application/json': '$input.body'
             }
           }
         ],
         passthroughBehavior: apigw.PassthroughBehavior.NEVER,
         requestTemplates: {
           'application/json': JSON.stringify({
             Bucket: bucket.bucketName,
             Key: 'techsee.json'
           })
         }
       }
     });


     fileResource.addMethod('GET', integration, {
        methodResponses: [
          {
            statusCode: '200',
            responseModels: {
              'application/json': apigw.Model.EMPTY_MODEL
            }
          },
          {
            statusCode: '400',
            responseModels: {
              'application/json': apigw.Model.EMPTY_MODEL
            }
          }
        ]
    }
      );

     const deployment = new apigw.Deployment(this, ResourcesName.API_S3_Deployment, {
        api: api,
      });
      
      const stageName = 'prod-api-s3';
      
      new apigw.Stage(this, ResourcesName.API_S3_Stage, {
        deployment: deployment,
        stageName: stageName,
        variables: {
          environment: stageName,
        },
      });
      const techseeContent = {api:`${api.url}/file`};


             // Create a custom resource to update the S3 file
    const updateS3Filetechsee = new cr.AwsCustomResource(this, ResourcesName.API_S3_CUSTOMRE_SOURCE, {
        onCreate: {
          service: 'S3',
          action: 'putObject',
          parameters: {
            Bucket: bucket.bucketName,
            Key: 'techsee.json',
            Body: techseeContent,
          },
          physicalResourceId: cr.PhysicalResourceId.of(ResourcesName.API_S3_CUSTOMRE_SOURCE),
        },
        policy: cr.AwsCustomResourcePolicy.fromStatements([
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['s3:PutObject'],
            resources: [bucket.arnForObjects('*')],
          }),
        ]),
      });

      const configContent = {
        "ssoApi": props?.tscc_sso_api_url,
        "activationApi": props?.tscc_activation_api_url,
        "provisioningApi": props?.tscc_provisioning_api_url
    }

      const updateS3File = new cr.AwsCustomResource(this, ResourcesName.API_S3_CUSTOMRE_SOURCE_CONFIG, {
        onCreate: {
          service: 'S3',
          action: 'putObject',
          parameters: {
            Bucket: bucket.bucketName,
            Key: 'config.json',
            Body: configContent,
          },
          physicalResourceId: cr.PhysicalResourceId.of(ResourcesName.API_S3_CUSTOMRE_SOURCE_CONFIG),
        },
        policy: cr.AwsCustomResourcePolicy.fromStatements([
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['s3:PutObject'],
            resources: [bucket.arnForObjects('*')],
          }),
        ]),
      });
      

  }
}
