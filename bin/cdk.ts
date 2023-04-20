#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { SaveConfigStack } from "../lib/save-config-stack";
import { WepAppStack } from "../lib/web-app-stack";
import ResourceName from "../lib/constants";
import { SsoStack } from "../lib/sso-stack";
import { S3ToCloudFrontStack } from "../lib/s3-cloudFront-stack";
import { S3RestApiStack } from "../lib/api-with-s3";

const app = new cdk.App();
// stack 1
const saveConfigStack = new SaveConfigStack(app, ResourceName.CONFIG_STACK, {});

// stack 2
const wepAppStack = new WepAppStack(app, ResourceName.WEB_APP_STACK, {});

// stack 3
 const ssoStack=  new SsoStack(app, ResourceName.SSO_STACK, {
    tscc_provisioning_api_url: saveConfigStack.tscc_provisioning_api_url,
    tscc_activation_api_url: saveConfigStack.tscc_activation_api_url,
    distributionDomainName: wepAppStack.distributionDomainName,
    bucketName: wepAppStack.Bucket
});


new S3RestApiStack(app,ResourceName.API_S3_STACK,{
    tscc_provisioning_api_url: saveConfigStack.tscc_provisioning_api_url,
    tscc_activation_api_url: saveConfigStack.tscc_activation_api_url,
    tscc_sso_api_url:ssoStack.tscc_sso_api_url,
    bucket_name: wepAppStack.Bucket
})
