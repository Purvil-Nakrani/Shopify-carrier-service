# AWS Deployment Guide

This guide walks through deploying the Shopify Freight Carrier Service to AWS using ECS, ECR, and RDS.

## Architecture

```
Internet → ALB → ECS (Docker) → RDS MySQL
                ↓
              WWEX API
                ↓
              Shopify
```

## Prerequisites

- AWS CLI installed and configured
- Docker installed locally
- AWS account with appropriate permissions

## Step 1: Create ECR Repository

```bash
# Create ECR repository
aws ecr create-repository \
  --repository-name shopify-freight-carrier \
  --region us-east-1

# Save the repository URI
ECR_URI=$(aws ecr describe-repositories \
  --repository-names shopify-freight-carrier \
  --region us-east-1 \
  --query 'repositories[0].repositoryUri' \
  --output text)

echo $ECR_URI
```

## Step 2: Build and Push Docker Image

```bash
# Authenticate Docker to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin $ECR_URI

# Build the image
docker build -t shopify-freight-carrier .

# Tag the image
docker tag shopify-freight-carrier:latest $ECR_URI:latest

# Push to ECR
docker push $ECR_URI:latest
```

## Step 3: Create RDS MySQL Database

```bash
# Create DB subnet group
aws rds create-db-subnet-group \
  --db-subnet-group-name freight-db-subnet \
  --db-subnet-group-description "Subnet group for freight carrier DB" \
  --subnet-ids subnet-xxxxx subnet-yyyyy

# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier freight-shipping-db \
  --db-instance-class db.t3.micro \
  --engine mysql \
  --engine-version 8.0.35 \
  --master-username admin \
  --master-user-password YOUR_SECURE_PASSWORD \
  --allocated-storage 20 \
  --db-name freight_shipping \
  --vpc-security-group-ids sg-xxxxx \
  --db-subnet-group-name freight-db-subnet \
  --backup-retention-period 7 \
  --publicly-accessible false

# Wait for DB to be available
aws rds wait db-instance-available \
  --db-instance-identifier freight-shipping-db

# Get endpoint
aws rds describe-db-instances \
  --db-instance-identifier freight-shipping-db \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text
```

## Step 4: Import Database Schema

```bash
# Connect to RDS and import schema
mysql -h YOUR_RDS_ENDPOINT \
  -u admin \
  -p \
  freight_shipping < database/schema.sql
```

## Step 5: Create ECS Cluster

```bash
# Create cluster
aws ecs create-cluster \
  --cluster-name freight-carrier-cluster \
  --region us-east-1
```

## Step 6: Create Task Definition

Create file `task-definition.json`:

```json
{
  "family": "shopify-freight-carrier",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::YOUR_ACCOUNT:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "freight-carrier",
      "image": "YOUR_ECR_URI:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "DB_HOST",
          "value": "YOUR_RDS_ENDPOINT"
        },
        {
          "name": "DB_PORT",
          "value": "3306"
        },
        {
          "name": "DB_NAME",
          "value": "freight_shipping"
        }
      ],
      "secrets": [
        {
          "name": "SHOPIFY_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:freight/shopify-api-key"
        },
        {
          "name": "SHOPIFY_API_SECRET",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:freight/shopify-api-secret"
        },
        {
          "name": "SHOPIFY_ACCESS_TOKEN",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:freight/shopify-access-token"
        },
        {
          "name": "WWEX_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:freight/wwex-api-key"
        },
        {
          "name": "DB_USER",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:freight/db-user"
        },
        {
          "name": "DB_PASSWORD",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:freight/db-password"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/freight-carrier",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

Register task definition:

```bash
aws ecs register-task-definition \
  --cli-input-json file://task-definition.json
```

## Step 7: Create Application Load Balancer

```bash
# Create ALB
aws elbv2 create-load-balancer \
  --name freight-carrier-alb \
  --subnets subnet-xxxxx subnet-yyyyy \
  --security-groups sg-xxxxx \
  --scheme internet-facing \
  --type application

# Create target group
aws elbv2 create-target-group \
  --name freight-carrier-tg \
  --protocol HTTP \
  --port 3000 \
  --vpc-id vpc-xxxxx \
  --target-type ip \
  --health-check-path /api/carrier-service

# Create listener
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:... \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=arn:aws:acm:... \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:...
```

## Step 8: Create ECS Service

```bash
aws ecs create-service \
  --cluster freight-carrier-cluster \
  --service-name freight-carrier-service \
  --task-definition shopify-freight-carrier \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxxxx,subnet-yyyyy],securityGroups=[sg-xxxxx],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:...,containerName=freight-carrier,containerPort=3000"
```

## Step 9: Configure Secrets Manager

```bash
# Store secrets
aws secretsmanager create-secret \
  --name freight/shopify-api-key \
  --secret-string "your_shopify_api_key"

aws secretsmanager create-secret \
  --name freight/shopify-api-secret \
  --secret-string "your_shopify_api_secret"

aws secretsmanager create-secret \
  --name freight/shopify-access-token \
  --secret-string "your_shopify_access_token"

aws secretsmanager create-secret \
  --name freight/wwex-api-key \
  --secret-string "your_wwex_api_key"

aws secretsmanager create-secret \
  --name freight/db-user \
  --secret-string "admin"

aws secretsmanager create-secret \
  --name freight/db-password \
  --secret-string "your_db_password"
```

## Step 10: Configure Security Groups

### ALB Security Group
- Inbound: 443 (HTTPS) from 0.0.0.0/0
- Outbound: All to ECS security group

### ECS Security Group
- Inbound: 3000 from ALB security group
- Outbound: 443 to WWEX API, 3306 to RDS

### RDS Security Group
- Inbound: 3306 from ECS security group
- Outbound: None required

## Step 11: Setup CloudWatch Logs

```bash
# Create log group
aws logs create-log-group \
  --log-group-name /ecs/freight-carrier

# Set retention
aws logs put-retention-policy \
  --log-group-name /ecs/freight-carrier \
  --retention-in-days 7
```

## Step 12: Configure Auto Scaling

```bash
# Register scalable target
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/freight-carrier-cluster/freight-carrier-service \
  --min-capacity 2 \
  --max-capacity 10

# Create scaling policy
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/freight-carrier-cluster/freight-carrier-service \
  --policy-name cpu-scaling \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration file://scaling-policy.json
```

`scaling-policy.json`:
```json
{
  "TargetValue": 70.0,
  "PredefinedMetricSpecification": {
    "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
  },
  "ScaleInCooldown": 300,
  "ScaleOutCooldown": 60
}
```

## Step 13: Setup DNS

```bash
# Get ALB DNS name
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --names freight-carrier-alb \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

# Create Route53 record
aws route53 change-resource-record-sets \
  --hosted-zone-id YOUR_ZONE_ID \
  --change-batch file://dns-change.json
```

## Step 14: Register Carrier Service with Shopify

```bash
# Update .env with production URL
export APP_URL=https://freight.yourdomain.com

# Register carrier service
curl -X POST https://freight.yourdomain.com/api/setup
```

## Monitoring

### CloudWatch Dashboards

Create custom dashboard to monitor:
- ECS CPU/Memory utilization
- ALB request count and latency
- RDS connections and query performance
- Custom metrics from application logs

### Alarms

Set up CloudWatch alarms for:
- High CPU usage (>80%)
- High memory usage (>80%)
- High error rate (>5%)
- Slow response times (>5 seconds)

## Cost Optimization

**Estimated Monthly Cost:**
- ECS Fargate (2 tasks): ~$40
- RDS db.t3.micro: ~$15
- ALB: ~$20
- Data transfer: ~$10
- **Total: ~$85/month**

To reduce costs:
1. Use Savings Plans for ECS
2. Use Reserved Instances for RDS
3. Implement aggressive caching
4. Scale down during low traffic hours

## Troubleshooting

### Check service status
```bash
aws ecs describe-services \
  --cluster freight-carrier-cluster \
  --services freight-carrier-service
```

### View logs
```bash
aws logs tail /ecs/freight-carrier --follow
```

### Force new deployment
```bash
aws ecs update-service \
  --cluster freight-carrier-cluster \
  --service freight-carrier-service \
  --force-new-deployment
```

## Maintenance

### Update application
```bash
# Build and push new image
docker build -t shopify-freight-carrier .
docker tag shopify-freight-carrier:latest $ECR_URI:latest
docker push $ECR_URI:latest

# Force new deployment
aws ecs update-service \
  --cluster freight-carrier-cluster \
  --service freight-carrier-service \
  --force-new-deployment
```

### Database backup
```bash
# Create snapshot
aws rds create-db-snapshot \
  --db-instance-identifier freight-shipping-db \
  --db-snapshot-identifier freight-backup-$(date +%Y%m%d)
```
