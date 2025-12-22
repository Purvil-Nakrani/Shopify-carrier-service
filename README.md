# Shopify Freight Carrier Service - WWEX Integration

A Next.js application that integrates WWEX freight shipping rates with Shopify's Carrier Service API. Calculates accurate shipping costs based on weight, dimensions, and location in under 7 seconds.

## Features

- ✅ Real-time freight rate calculation via WWEX API
- ✅ **Custom Dimensions Support** - Automatically calculates Width × Length × Quantity
- ✅ Shopify Carrier Service integration
- ✅ MySQL database for logging and caching
- ✅ Rate caching for improved performance
- ✅ Fallback rates if WWEX API times out
- ✅ Freight class calculation based on density
- ✅ Docker containerization for easy deployment
- ✅ Admin dashboard for monitoring
- ✅ Comprehensive error logging

## 🎯 Custom Dimensions Feature

**Your product page already has custom dimension inputs - this app automatically handles them!**

When customers enter:
- **Width (ft)**: 4
- **Length (ft)**: 25  
- **Quantity**: 2 rolls

The app automatically:
1. Extracts these values from cart line item properties
2. Calculates: `4 × 25 × 2 = 200 sq ft`
3. Sends `200` to WWEX API as the quantity
4. Returns accurate freight rate based on 200 sq ft

**No changes needed to your existing product page UI!**

See [CUSTOM_DIMENSIONS.md](CUSTOM_DIMENSIONS.md) and [CUSTOM_DIMENSIONS_VISUAL.md](CUSTOM_DIMENSIONS_VISUAL.md) for detailed information.

## Prerequisites

- Node.js 18+ or Docker
- MySQL 8.0+
- Shopify store with access to API credentials
- WWEX API credentials

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd shopify-freight-carrier
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your actual values (see `.env.example` for all required variables).

### 3. Setup Database

```bash
# Import the schema
mysql -u root -p < database/schema.sql
```

### 4. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### 5. Test Custom Dimensions

```bash
# Test the custom dimension calculation
node test-carrier-service.js

# Validate complete setup
node validate-setup.js
```

You should see output like:
```
Custom calculation: 4 ft × 25 ft × 2 = 200 sq ft
```

## Docker Deployment

### Using Docker Compose (Recommended)

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

### Manual Docker Build

```bash
# Build image
docker build -t shopify-freight-carrier .

# Run container
docker run -d \
  -p 3000:3000 \
  --env-file .env \
  shopify-freight-carrier
```

## AWS Deployment

### Deploy to AWS ECS with Docker

1. **Push to ECR:**

```bash
# Authenticate with ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ECR_URI

# Build and tag
docker build -t shopify-freight-carrier .
docker tag shopify-freight-carrier:latest YOUR_ECR_URI/shopify-freight-carrier:latest

# Push
docker push YOUR_ECR_URI/shopify-freight-carrier:latest
```

2. **Create ECS Task Definition:**
   - Use the Docker image from ECR
   - Set environment variables
   - Configure CPU/Memory (recommend: 1 vCPU, 2GB RAM)
   - Add Application Load Balancer

3. **Setup RDS MySQL:**
   - Create MySQL 8.0 instance
   - Import schema from `database/schema.sql`
   - Update `DB_HOST` in environment variables

4. **Configure Security Groups:**
   - Allow inbound HTTPS (443) from Shopify IPs
   - Allow outbound to WWEX API
   - Allow MySQL access from ECS tasks

## Shopify Setup

### 1. Create Custom App

1. Go to Shopify Admin → Settings → Apps and sales channels
2. Click "Develop apps"
3. Create a new app
4. Configure Admin API scopes: `write_shipping`
5. Install the app and get the access token

### 2. Register Carrier Service

Make a POST request to register the carrier service:

```bash
curl -X POST https://your-app-url.com/api/setup
```

Or visit `https://your-app-url.com/api/setup` in your browser (make a POST request).

This will register the carrier service with Shopify.

### 3. Verify Setup

```bash
# List carrier services
curl https://your-app-url.com/api/setup
```

## API Endpoints

### Carrier Service Callback
- **URL:** `/api/carrier-service`
- **Method:** POST
- **Purpose:** Receives shipping rate requests from Shopify
- **Response:** Returns calculated freight rates

### Setup
- **URL:** `/api/setup`
- **Methods:** GET, POST, DELETE
- **Purpose:** Manage carrier service registration

### Statistics
- **URL:** `/api/stats?days=7`
- **Method:** GET
- **Purpose:** View analytics and monitoring data

## Configuration

### Freight Weight Threshold

Edit in `/app/api/carrier-service/route.ts`:

```typescript
const FREIGHT_WEIGHT_THRESHOLD = 150; // pounds
```

Only shipments above this weight will use freight shipping.

### Rate Caching

Rates are cached for 1 hour by default. Modify in `/app/api/carrier-service/route.ts`:

```typescript
await cacheRate({
  // ...
  expiresInMinutes: 60 // Change this value
});
```

### API Timeout

WWEX API timeout is set to 6 seconds (to stay under 7 second requirement). Modify in `/lib/wwex-client.ts`:

```typescript
timeout: 6000 // milliseconds
```

## Product Setup in Shopify

For accurate freight calculations, products need proper weight and dimensions:

1. Go to Products in Shopify Admin
2. Edit each freight product
3. Set:
   - **Weight** (in pounds)
   - **Dimensions** (use metafields or product properties)
   
Optional: Add custom metafields for:
- `freight.length` (inches)
- `freight.width` (inches)
- `freight.height` (inches)
- `freight.class` (freight class code)

## Monitoring

### View Statistics

```bash
curl https://your-app-url.com/api/stats?days=7
```

Returns:
- Total requests
- Success/failure rates
- Average response times
- Top destinations
- Weight distribution
- Recent errors
- Cache statistics

### Database Queries

```sql
-- View recent rate requests
SELECT * FROM rate_requests ORDER BY created_at DESC LIMIT 10;

-- View WWEX responses
SELECT * FROM wwex_responses ORDER BY created_at DESC LIMIT 10;

-- Check cache hit rate
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as active
FROM rate_cache;

-- View errors
SELECT * FROM error_logs ORDER BY created_at DESC LIMIT 20;
```

## Troubleshooting

### Rates not showing at checkout

1. Check carrier service is registered:
   ```bash
   curl https://your-app-url.com/api/setup
   ```

2. Verify product weights are set in Shopify

3. Check logs:
   ```bash
   docker-compose logs -f app
   ```

4. Ensure weight exceeds threshold (150 lbs default)

### WWEX API errors

- Check API credentials in `.env`
- Verify WWEX account is active
- Check network connectivity to WWEX API
- Review `wwex_responses` table for error messages

### Slow response times

- Check WWEX API response times in database
- Enable/verify rate caching
- Consider increasing cache duration
- Optimize MySQL queries with indexes

### Database connection issues

- Verify MySQL is running: `docker-compose ps`
- Check credentials in `.env`
- Ensure security groups allow MySQL access (port 3306)

## Performance Optimization

1. **Rate Caching:** Enabled by default, caches rates for 1 hour
2. **Database Indexing:** Indexes on frequently queried columns
3. **Connection Pooling:** MySQL connection pool configured
4. **Async Operations:** All API calls are non-blocking
5. **Fallback Rates:** Returns estimated rate if WWEX times out

## Security

- Webhook signature verification
- Environment variable encryption
- Non-root Docker user
- SQL injection protection via parameterized queries
- HTTPS required for production

## Limitations

- Maximum weight per shipment: Configure in WWEX account
- API timeout: 6 seconds (Shopify requires < 10 seconds)
- Rate caching: 1 hour default
- Assumes continental US shipping

## Support

For issues:
1. Check logs: `docker-compose logs -f`
2. Review error_logs table
3. Verify environment variables
4. Test WWEX API independently

## License

MIT License - See LICENSE file for details
