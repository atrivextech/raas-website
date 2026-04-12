#!/bin/bash
# ═══════════════════════════════════════════════════════════
#   RAAS — AWS Deploy Script
#   Prerequisites: AWS CLI + SAM CLI installed and configured
#
#   Usage:
#     cd aws
#     chmod +x deploy.sh
#     ./deploy.sh
# ═══════════════════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "══════════════════════════════════════════"
echo "  RAAS Builders — AWS Deployment"
echo "══════════════════════════════════════════"

# Step 1: Deploy SAM stack (Lambda + DynamoDB + API Gateway + S3)
echo ""
echo "📦 Step 1: Deploying SAM stack..."
echo "   (First time: use --guided for interactive config)"
echo ""

cd "$SCRIPT_DIR"
sam build --template-file template.yaml --build-dir .aws-sam/build
sam deploy --guided --template-file .aws-sam/build/template.yaml \
  --stack-name raas-website \
  --capabilities CAPABILITY_IAM \
  --confirm-changeset

# Step 2: Get outputs
echo ""
echo "📋 Step 2: Getting stack outputs..."
API_URL=$(aws cloudformation describe-stacks --stack-name raas-website \
  --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" --output text)
BUCKET=$(aws cloudformation describe-stacks --stack-name raas-website \
  --query "Stacks[0].Outputs[?OutputKey=='StaticBucketName'].OutputValue" --output text)
SITE_URL=$(aws cloudformation describe-stacks --stack-name raas-website \
  --query "Stacks[0].Outputs[?OutputKey=='StaticSiteUrl'].OutputValue" --output text)

echo "   API URL:    $API_URL"
echo "   S3 Bucket:  $BUCKET"
echo "   Site URL:   $SITE_URL"

# Step 3: Sync static files to S3
echo ""
echo "🌐 Step 3: Uploading static files to S3..."
cd "$PROJECT_DIR"
aws s3 sync . "s3://$BUCKET" \
  --exclude "api/*" \
  --exclude "aws/*" \
  --exclude ".git/*" \
  --exclude "node_modules/*" \
  --exclude "*.md" \
  --exclude "*.txt" \
  --exclude ".gitignore" \
  --exclude "sample-properties.json" \
  --cache-control "public, max-age=86400" \
  --delete

# Set correct content types for specific files
aws s3 cp "s3://$BUCKET/css/" "s3://$BUCKET/css/" --recursive \
  --content-type "text/css" --metadata-directive REPLACE \
  --cache-control "public, max-age=604800"

aws s3 cp "s3://$BUCKET/js/" "s3://$BUCKET/js/" --recursive \
  --content-type "application/javascript" --metadata-directive REPLACE \
  --cache-control "public, max-age=604800"

echo ""
echo "══════════════════════════════════════════"
echo "  ✅ Deployment complete!"
echo ""
echo "  🌐 Static site: $SITE_URL"
echo "  🔌 API:         $API_URL"
echo "  📊 DynamoDB:    raas-kv"
echo ""
echo "  ⚠️  IMPORTANT: Update your frontend to point"
echo "     API calls to: $API_URL"
echo "     (or set up CloudFront to proxy /api/* to Lambda)"
echo "══════════════════════════════════════════"
