#!/bin/bash
# ═══════════════════════════════════════════════════════════
#   RAAS Builders — AWS Full Deploy
#   Creates: CloudFront + S3 + Lambda + API Gateway + DynamoDB
#
#   Prerequisites: AWS CLI + SAM CLI installed & configured
#
#   Usage:
#     cd aws
#     chmod +x deploy.sh
#     ./deploy.sh              # full deploy (first time: interactive)
#     ./deploy.sh --sync-only  # just sync static files + invalidate cache
# ═══════════════════════════════════════════════════════════

set -e

STACK_NAME="raas-website"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo ""
echo "══════════════════════════════════════════"
echo "  RAAS Builders — AWS Deployment"
echo "══════════════════════════════════════════"

# ─── Helper: get stack output ─────────────────────────────
get_output() {
  aws cloudformation describe-stacks --stack-name "$STACK_NAME" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text 2>/dev/null
}

# ─── Sync-only mode ──────────────────────────────────────
if [ "$1" = "--sync-only" ]; then
  echo ""
  echo "📦 Sync-only mode — uploading static files..."

  BUCKET=$(get_output StaticBucketName)
  DIST_ID=$(get_output CloudFrontDistributionId)

  if [ -z "$BUCKET" ]; then
    echo "❌ Stack '$STACK_NAME' not found. Run without --sync-only first."
    exit 1
  fi

  cd "$PROJECT_DIR"

  # Sync static files
  aws s3 sync . "s3://$BUCKET" \
    --exclude "api/*" --exclude "aws/*" --exclude ".git/*" \
    --exclude "node_modules/*" --exclude "*.md" --exclude "*.txt" \
    --exclude ".gitignore" --exclude "sample-properties.json" \
    --exclude "RealEstate_Website_Mockup.html" \
    --cache-control "public, max-age=86400" \
    --delete

  # Set long cache for assets
  aws s3 cp "s3://$BUCKET/css/" "s3://$BUCKET/css/" --recursive \
    --content-type "text/css" --metadata-directive REPLACE \
    --cache-control "public, max-age=604800, immutable"

  aws s3 cp "s3://$BUCKET/js/" "s3://$BUCKET/js/" --recursive \
    --content-type "application/javascript" --metadata-directive REPLACE \
    --cache-control "public, max-age=604800, immutable"

  # Invalidate CloudFront cache
  if [ -n "$DIST_ID" ]; then
    echo ""
    echo "🔄 Invalidating CloudFront cache..."
    aws cloudfront create-invalidation \
      --distribution-id "$DIST_ID" \
      --paths "/*" --output text
    echo "   Cache invalidation submitted. Takes ~60 seconds to propagate."
  fi

  echo ""
  echo "✅ Static files synced!"
  CF_URL=$(get_output CloudFrontUrl)
  echo "   🌐 $CF_URL"
  exit 0
fi

# ─── Full deploy ─────────────────────────────────────────

# Step 1: SAM build + deploy
echo ""
echo "📦 Step 1: Building and deploying SAM stack..."
echo "   (First time will be interactive — answer the prompts)"
echo ""

cd "$SCRIPT_DIR"
sam build --template-file template.yaml --build-dir .aws-sam/build

sam deploy \
  --template-file .aws-sam/build/template.yaml \
  --stack-name "$STACK_NAME" \
  --capabilities CAPABILITY_IAM \
  --confirm-changeset \
  --resolve-s3

# Step 2: Get outputs
echo ""
echo "📋 Step 2: Stack outputs..."
CF_URL=$(get_output CloudFrontUrl)
CF_DIST=$(get_output CloudFrontDistributionId)
API_URL=$(get_output ApiGatewayUrl)
BUCKET=$(get_output StaticBucketName)
DYNAMO=$(get_output DynamoTableName)

echo "   CloudFront:  $CF_URL"
echo "   API Gateway: $API_URL"
echo "   S3 Bucket:   $BUCKET"
echo "   DynamoDB:    $DYNAMO"

# Step 3: Sync static files
echo ""
echo "🌐 Step 3: Uploading static files to S3..."
cd "$PROJECT_DIR"

aws s3 sync . "s3://$BUCKET" \
  --exclude "api/*" --exclude "aws/*" --exclude ".git/*" \
  --exclude "node_modules/*" --exclude "*.md" --exclude "*.txt" \
  --exclude ".gitignore" --exclude "sample-properties.json" \
  --exclude "RealEstate_Website_Mockup.html" \
  --cache-control "public, max-age=86400" \
  --delete

# Set proper content types + long cache for assets
aws s3 cp "s3://$BUCKET/css/" "s3://$BUCKET/css/" --recursive \
  --content-type "text/css" --metadata-directive REPLACE \
  --cache-control "public, max-age=604800, immutable"

aws s3 cp "s3://$BUCKET/js/" "s3://$BUCKET/js/" --recursive \
  --content-type "application/javascript" --metadata-directive REPLACE \
  --cache-control "public, max-age=604800, immutable"

# Step 4: Invalidate CloudFront
echo ""
echo "🔄 Step 4: Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
  --distribution-id "$CF_DIST" \
  --paths "/*" --output text

echo ""
echo "══════════════════════════════════════════"
echo "  ✅ Deployment complete!"
echo ""
echo "  🌐 Website:    $CF_URL"
echo "  🔌 API:        $CF_URL/api/health"
echo "  🔐 Admin:      $CF_URL/admin"
echo "  📊 DynamoDB:   $DYNAMO"
echo ""
echo "  ✨ Both static files and /api/* are served"
echo "     from the SAME CloudFront URL."
echo "     No RAAS_API_BASE config needed!"
echo ""
echo "  📌 Next steps:"
echo "     • Test: curl $CF_URL/api/health"
echo "     • Custom domain: add DomainName + AcmCertificateArn"
echo "       params, then CNAME your domain to:"
echo "       $(get_output CloudFrontUrl | sed 's|https://||')"
echo ""
echo "  🔁 Future updates (static only):"
echo "     ./deploy.sh --sync-only"
echo "══════════════════════════════════════════"
