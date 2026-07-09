#!/usr/bin/env bash
# Deploy the DAILBERT desk backend to AWS (MC account). Idempotent.
#   DynamoDB table + IAM role + Lambda (Function URL, public read, key-gated writes)
# Reads MC_ACCESS_KEY / MC_SECRET_KEY from ~/.env. Writes world/desk.json (public API url).
set -euo pipefail
cd "$(dirname "$0")"

set -a; . "$HOME/.env"; set +a
export AWS_ACCESS_KEY_ID="$MC_ACCESS_KEY"
export AWS_SECRET_ACCESS_KEY="$MC_SECRET_KEY"
export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-us-east-1}"

FN=dailbert-desk
TABLE=dailbert-desk
ROLE=dailbert-desk-lambda
ACCT=$(aws sts get-caller-identity --query Account --output text)
echo "account $ACCT region $AWS_DEFAULT_REGION"

# --- desk write-key (persisted locally, never committed) ---
if [ ! -f .desk-key ]; then openssl rand -hex 16 > .desk-key; echo "generated new desk key"; fi
DESK_KEY=$(cat .desk-key)

# --- DynamoDB table ---
if ! aws dynamodb describe-table --table-name "$TABLE" >/dev/null 2>&1; then
  echo "creating table $TABLE"
  aws dynamodb create-table --table-name "$TABLE" \
    --attribute-definitions AttributeName=pk,AttributeType=S \
    --key-schema AttributeName=pk,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST >/dev/null
  aws dynamodb wait table-exists --table-name "$TABLE"
fi

# --- IAM role ---
if ! aws iam get-role --role-name "$ROLE" >/dev/null 2>&1; then
  echo "creating role $ROLE"
  aws iam create-role --role-name "$ROLE" --assume-role-policy-document '{
    "Version":"2012-10-17","Statement":[{"Effect":"Allow",
    "Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}' >/dev/null
  aws iam attach-role-policy --role-name "$ROLE" \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
  aws iam put-role-policy --role-name "$ROLE" --policy-name ddb --policy-document "{
    \"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",
    \"Action\":[\"dynamodb:GetItem\",\"dynamodb:PutItem\",\"dynamodb:DeleteItem\",\"dynamodb:Scan\"],
    \"Resource\":\"arn:aws:dynamodb:${AWS_DEFAULT_REGION}:${ACCT}:table/${TABLE}\"}]}"
  echo "waiting for role to propagate..."; sleep 12
fi
ROLE_ARN=$(aws iam get-role --role-name "$ROLE" --query Role.Arn --output text)

# --- package ---
rm -f fn.zip; zip -qj fn.zip handler.mjs

# --- Lambda function ---
if aws lambda get-function --function-name "$FN" >/dev/null 2>&1; then
  echo "updating function code"
  aws lambda update-function-code --function-name "$FN" --zip-file fileb://fn.zip >/dev/null
  aws lambda wait function-updated --function-name "$FN"
  aws lambda update-function-configuration --function-name "$FN" \
    --environment "Variables={TABLE=$TABLE,DESK_KEY=$DESK_KEY}" >/dev/null
  aws lambda wait function-updated --function-name "$FN"
else
  echo "creating function"
  for i in 1 2 3 4 5; do
    if aws lambda create-function --function-name "$FN" \
      --runtime nodejs20.x --handler handler.handler --role "$ROLE_ARN" \
      --zip-file fileb://fn.zip --timeout 10 --memory-size 128 \
      --environment "Variables={TABLE=$TABLE,DESK_KEY=$DESK_KEY}" >/dev/null 2>&1; then break; fi
    echo "  retry $i (role not ready)"; sleep 6
  done
  aws lambda wait function-active --function-name "$FN"
fi

# --- HTTP API (public front door; the MC account blocks anonymous Function URLs) ---
API_ID=$(aws apigatewayv2 get-apis --query "Items[?Name=='$FN'].ApiId | [0]" --output text 2>/dev/null)
if [ -z "$API_ID" ] || [ "$API_ID" = "None" ]; then
  echo "creating HTTP API"
  API_ID=$(aws apigatewayv2 create-api --name "$FN" --protocol-type HTTP \
    --target "arn:aws:lambda:${AWS_DEFAULT_REGION}:${ACCT}:function:${FN}" \
    --cors-configuration AllowOrigins='*',AllowMethods='GET,POST,OPTIONS',AllowHeaders='content-type,x-desk-key',MaxAge=86400 \
    --query ApiId --output text)
  aws lambda add-permission --function-name "$FN" --statement-id apigw-invoke \
    --action lambda:InvokeFunction --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:${AWS_DEFAULT_REGION}:${ACCT}:${API_ID}/*/*" >/dev/null 2>&1 || true
fi
URL="https://${API_ID}.execute-api.${AWS_DEFAULT_REGION}.amazonaws.com"

# --- publish the public endpoint for the site (key stays out of the repo) ---
mkdir -p ../../world
printf '{\n  "api": "%s"\n}\n' "$URL" > ../../world/desk.json
echo "----"
echo "API:  $URL"
echo "wrote world/desk.json"
echo "desk write-key (enter once on admin.html): $DESK_KEY"
