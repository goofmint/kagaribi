#!/bin/bash

# Auth Demo API Test Script
# このスクリプトは、auth-demo の API エンドポイントをテストします。

set -e

BASE_URL="${BASE_URL:-http://localhost:3000}"

echo "🧪 Auth Demo API Test"
echo "Base URL: $BASE_URL"
echo ""

# カラー出力
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_step() {
  echo -e "${BLUE}==>${NC} $1"
}

print_success() {
  echo -e "${GREEN}✓${NC} $1"
}

print_error() {
  echo -e "${RED}✗${NC} $1"
}

# 1. ログイン
print_step "Step 1: Login with demo credentials"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/api/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "password123"
  }')

echo "$LOGIN_RESPONSE" | jq .

ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.accessToken')
REFRESH_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.refreshToken')

if [ "$ACCESS_TOKEN" != "null" ] && [ -n "$ACCESS_TOKEN" ]; then
  print_success "Login successful"
  echo "Access Token: ${ACCESS_TOKEN:0:50}..."
  echo ""
else
  print_error "Login failed"
  exit 1
fi

# 2. トークン検証
print_step "Step 2: Verify access token"
VERIFY_RESPONSE=$(curl -s -X GET "$BASE_URL/auth/api/verify" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "$VERIFY_RESPONSE" | jq .

if echo "$VERIFY_RESPONSE" | jq -e '.valid == true' > /dev/null; then
  print_success "Token verification successful"
  echo ""
else
  print_error "Token verification failed"
  exit 1
fi

# 3. プロフィール API 呼び出し
print_step "Step 3: Get user profile (protected API)"
PROFILE_RESPONSE=$(curl -s -X GET "$BASE_URL/api/profile" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "$PROFILE_RESPONSE" | jq .

if echo "$PROFILE_RESPONSE" | jq -e '.user.email' > /dev/null; then
  print_success "Profile API call successful"
  echo ""
else
  print_error "Profile API call failed"
  exit 1
fi

# 4. シークレット API 呼び出し
print_step "Step 4: Get secret data (protected API)"
SECRET_RESPONSE=$(curl -s -X GET "$BASE_URL/api/secret" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "$SECRET_RESPONSE" | jq .

if echo "$SECRET_RESPONSE" | jq -e '.secretData' > /dev/null; then
  print_success "Secret API call successful"
  echo ""
else
  print_error "Secret API call failed"
  exit 1
fi

# 5. リフレッシュトークンでアクセストークンを再発行
print_step "Step 5: Refresh access token"
REFRESH_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/api/refresh" \
  -H "Content-Type: application/json" \
  -d "{
    \"refreshToken\": \"$REFRESH_TOKEN\"
  }")

echo "$REFRESH_RESPONSE" | jq .

NEW_ACCESS_TOKEN=$(echo "$REFRESH_RESPONSE" | jq -r '.accessToken')

if [ "$NEW_ACCESS_TOKEN" != "null" ] && [ -n "$NEW_ACCESS_TOKEN" ]; then
  print_success "Token refresh successful"
  echo "New Access Token: ${NEW_ACCESS_TOKEN:0:50}..."
  echo ""
else
  print_error "Token refresh failed"
  exit 1
fi

# 6. 新しいトークンで API 呼び出し
print_step "Step 6: Verify new access token works"
VERIFY_NEW_RESPONSE=$(curl -s -X GET "$BASE_URL/api/profile" \
  -H "Authorization: Bearer $NEW_ACCESS_TOKEN")

echo "$VERIFY_NEW_RESPONSE" | jq .

if echo "$VERIFY_NEW_RESPONSE" | jq -e '.user.email' > /dev/null; then
  print_success "New token works correctly"
  echo ""
else
  print_error "New token verification failed"
  exit 1
fi

# 7. 無効なトークンでエラーテスト
print_step "Step 7: Test with invalid token (should fail)"
INVALID_RESPONSE=$(curl -s -X GET "$BASE_URL/api/profile" \
  -H "Authorization: Bearer invalid-token")

echo "$INVALID_RESPONSE" | jq .

if echo "$INVALID_RESPONSE" | jq -e '.error' > /dev/null; then
  print_success "Invalid token correctly rejected"
  echo ""
else
  print_error "Invalid token test failed"
  exit 1
fi

# 8. トークンなしでエラーテスト
print_step "Step 8: Test without token (should fail)"
NO_TOKEN_RESPONSE=$(curl -s -X GET "$BASE_URL/api/profile")

echo "$NO_TOKEN_RESPONSE" | jq .

if echo "$NO_TOKEN_RESPONSE" | jq -e '.error' > /dev/null; then
  print_success "No token correctly rejected"
  echo ""
else
  print_error "No token test failed"
  exit 1
fi

echo -e "${GREEN}🎉 All tests passed!${NC}"
