# Edge Functions Deployment Guide

This document explains how to deploy the created Edge Functions to Supabase.

## Prerequisites

1. **Supabase CLI installed**
   ```bash
   npm install -g supabase
   ```

2. **Supabase project linked**
   ```bash
   supabase login
   supabase link --project-ref wkzjovhlljeaqzoytpeb
   ```

## Created Edge Functions

### 1. get-order Function
**Location**: `supabase/functions/get-order/index.ts`

**Description**: 
- Retrieves order details with proper visibility controls
- Admin mode: Shows all customer data
- Store mode: Hides customer data unless order is confirmed/delivered
- Merges duplicate products by product_id
- Supports both GET and POST methods

**Endpoints**:
- `GET /functions/v1/get-order?orderId=ORDER_ID&adminMode=true`
- `POST /functions/v1/get-order` with body: `{"orderId": "ORDER_ID", "adminMode": true}`

### 2. auto-assign-orders Function
**Location**: `supabase/functions/auto-assign-orders/index.ts`

**Description**: 
- Handles multiple operation modes:
  - **Auto-assignment**: Assigns all pending orders to matching stores
  - **Manual assignment**: Assigns specific order to specific store
  - **Store response**: Records store availability responses

**Endpoints**:
- `POST /functions/v1/auto-assign-orders` (empty body) - Auto-assign all
- `POST /functions/v1/auto-assign-orders` with `{"orderId": "ID", "storeId": "ID"}` - Manual assign
- `POST /functions/v1/auto-assign-orders` with `{"order_id": "ID", "response_type": "available|unavailable"}` - Store response

## Deployment Commands

### Deploy All Functions
```bash
supabase functions deploy
```

### Deploy Individual Functions
```bash
# Deploy get-order function
supabase functions deploy get-order

# Deploy auto-assign-orders function
supabase functions deploy auto-assign-orders
```

### Deploy with environment variables
```bash
supabase functions deploy --project-ref wkzjovhlljeaqzoytpeb
```

## Testing After Deployment

### 1. Test get-order Function
```bash
curl -X GET "https://wkzjovhlljeaqzoytpeb.supabase.co/functions/v1/get-order?orderId=YOUR_ORDER_ID&adminMode=true" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### 2. Test auto-assign-orders Function
```bash
# Test auto-assignment
curl -X POST "https://wkzjovhlljeaqzoytpeb.supabase.co/functions/v1/auto-assign-orders" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d "{}"

# Test manual assignment
curl -X POST "https://wkzjovhlljeaqzoytpeb.supabase.co/functions/v1/auto-assign-orders" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"orderId": "YOUR_ORDER_ID", "storeId": "YOUR_STORE_ID"}'
```

## Environment Variables

The functions use these Supabase environment variables (automatically available):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Error Handling

The functions include comprehensive error handling for:
- Missing parameters
- Invalid order/store IDs
- Permission checks
- Database errors
- Network timeouts

## Web Testing Interface

Use the built-in web interface for testing:
- Navigate to `/edge-function-debugger` in your app
- Test both functions with real data
- View detailed error messages and responses
- Monitor function status and connectivity

## Troubleshooting

### Function Not Found (404)
- Verify deployment was successful
- Check function names match exactly
- Ensure project reference is correct

### Permission Errors (403)
- Verify RLS policies allow function access
- Check API keys and authentication
- Ensure service role key has proper permissions

### Timeout Errors
- Check database queries for performance
- Verify network connectivity
- Consider increasing timeout limits

### JSON Parse Errors
- Verify request headers include `Content-Type: application/json`
- Check request body format
- Ensure proper CORS handling

## Monitoring

- View function logs in Supabase Dashboard > Edge Functions
- Use the web debugger for real-time testing
- Monitor response times and error rates

## Production Checklist

- [ ] Functions deployed successfully
- [ ] All tests pass in web debugger
- [ ] Error handling works correctly
- [ ] Performance is acceptable
- [ ] Monitoring is in place
- [ ] Documentation is updated
