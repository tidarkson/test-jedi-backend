# Export Engine - Quick Start Guide

## 30-Second Setup

### Step 1: Install Dependencies
```bash
npm install
# or
pnpm install
```

### Step 2: Configure Environment
Add to your `.env` file:
```bash
# AWS S3 (required for exports)
AWS_ACCESS_KEY_ID=your_key_here
AWS_SECRET_ACCESS_KEY=your_secret_here
AWS_REGION=us-east-1
AWS_S3_BUCKET=test-jedi-exports

# Redis (required for job queue)
REDIS_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Step 3: Start Application
```bash
npm run dev
```

✅ Export endpoints are ready to use!

---

## Test the Export Engine

### Via cURL

#### 1. Export Test Cases as PDF
```bash
curl -X POST http://localhost:3000/api/v1/projects/proj-123/cases/export \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "format": "pdf",
    "filters": {
      "priority": ["HIGH", "CRITICAL"]
    }
  }'
```

#### 2. Export as CSV (Quick & Easy)
```bash
curl -X POST http://localhost:3000/api/v1/projects/proj-123/cases/export \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "format": "csv"
  }'
```

#### 3. Export Test Run Results
```bash
curl -X POST http://localhost:3000/api/v1/projects/proj-123/runs/run-456/export \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "format": "xlsx",
    "sections": ["summary", "results"]
  }'
```

#### 4. Check Export Status (if queued)
```bash
curl -X GET http://localhost:3000/api/v1/exports/job-uuid-here \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Available Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/v1/projects/:projectId/cases/export` | Export test cases |
| POST | `/api/v1/projects/:projectId/runs/:runId/export` | Export run results |
| POST | `/api/v1/analytics/export?projectId=:projectId` | Export analytics |
| GET | `/api/v1/exports/:jobId` | Check export status |
| GET | `/api/v1/exports/formats/available` | See available formats |
| GET | `/api/v1/exports/schema` | Get request schema |

---

## Supported Export Formats

### PDF ⭐ Premium
- Executive summary
- Charts & metrics
- Detailed steps
- Company branding
- Professional styling
- **Best for**: Management reports, stakeholders

### XLSX 📊 Data-Rich
- Multiple worksheets
- Conditional formatting
- Data validation
- Color-coded status
- **Best for**: Analysis, data import, spreadsheets

### CSV 📄 Simple
- UTF-8 compatible
- Easy to parse
- Flat structure
- **Best for**: Data analysis, scripting, imports

### JSON 🔧 Developer-Friendly
- Full hierarchy
- All details included
- Easy integration
- **Best for**: API consumption, integrations

### XML 📋 Enterprise
- Structured format
- Proper encoding
- Element hierarchy
- **Best for**: Legacy systems, SOAP/XML services

---

## Common Use Cases

### 1. Quick CSV Download for Analysis
```javascript
POST /api/v1/projects/proj123/cases/export
Content-Type: application/json

{
  "format": "csv"
}
```
✨ Returns immediate download URL

### 2. Professional PDF Report
```javascript
POST /api/v1/projects/proj123/runs/run456/export
Content-Type: application/json

{
  "format": "pdf",
  "sections": ["summary", "charts", "results"],
  "branding": {
    "companyName": "My Company",
    "themeColor": "#007bff",
    "includeWatermark": true
  }
}
```

### 3. Filtered Export
```javascript
POST /api/v1/projects/proj123/cases/export
Content-Type: application/json

{
  "format": "xlsx",
  "filters": {
    "priority": ["CRITICAL", "HIGH"],
    "status": ["ACTIVE"],
    "type": ["REGRESSION"]
  }
}
```

### 4. Analytics Report
```javascript
POST /api/v1/analytics/export?projectId=proj123
Content-Type: application/json

{
  "format": "json",
  "filters": {
    "startDate": "2026-01-01T00:00:00Z",
    "endDate": "2026-03-10T00:00:00Z"
  }
}
```

---

## Filtering Options

Available filters for all exports:

```javascript
{
  "status": ["ACTIVE", "DRAFT", "ARCHIVED"],  // Suite/Run status
  "priority": ["CRITICAL", "HIGH", "MEDIUM", "LOW"],
  "type": ["FUNCTIONAL", "REGRESSION", "SMOKE", "INTEGRATION"],
  "startDate": "2026-01-01T00:00:00Z",
  "endDate": "2026-03-10T00:00:00Z",
  "tags": ["tag1", "tag2"],
  "assignee": ["userId1", "userId2"]
}
```

---

## Response Examples

### Successful Immediate Export
```json
{
  "status": "success",
  "data": {
    "jobId": "abc-123-def",
    "status": "completed",
    "format": "csv",
    "downloadUrl": "https://s3.amazonaws.com/.../file.csv?Signature=...",
    "fileSize": 45000,
    "createdAt": "2026-03-10T12:00:00Z",
    "completedAt": "2026-03-10T12:00:02Z"
  }
}
```

### Queued Export (>500 cases)
```json
{
  "status": "success",
  "data": {
    "jobId": "abc-123-def",
    "status": "pending",
    "format": "pdf",
    "createdAt": "2026-03-10T12:00:00Z"
  }
}
```
Then poll: `GET /api/v1/exports/abc-123-def`

### Error Response
```json
{
  "status": "error",
  "code": 400,
  "error": "INVALID_INPUT",
  "message": "Invalid export format. Supported: pdf, xlsx, csv, json, xml"
}
```

---

## File Size Expectations

| Format | Size/1000 Cases |
|--------|-----------------|
| PDF | 3-10 MB |
| XLSX | 1-3 MB |
| CSV | 0.5-1 MB |
| JSON | 1-2 MB |
| XML | 2-4 MB |

---

## Troubleshooting

### "AWS S3 Error"
- Check AWS_ACCESS_KEY_ID in .env
- Verify bucket exists: AWS_S3_BUCKET
- Ensure S3 bucket has proper CORS settings

### "Redis Connection Error"
- Ensure Redis is running: `redis-cli ping`
- Check REDIS_HOST and REDIS_PORT in .env
- Set REDIS_ENABLED=true

### "Export taking too long"
- If >500 cases, export is queued (check status)
- Monitor Redis queue: `npm run workers:dev`
- Check application logs

### "Invalid Format"
- Check spelling: pdf, xlsx, csv, json, xml
- Analytics only supports: csv, json

---

## Integration with Frontend

### Example React/TypeScript
```typescript
async function exportTestCases(projectId: string, format: 'pdf' | 'csv' | 'xlsx') {
  try {
    const response = await fetch(
      `/api/v1/projects/${projectId}/cases/export`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          format,
          filters: {
            priority: ['CRITICAL', 'HIGH']
          }
        })
      }
    );

    const data = await response.json();
    
    if (data.status === 'success') {
      if (data.data.status === 'completed') {
        // Immediate download
        window.location.href = data.data.downloadUrl;
      } else {
        // Poll for status
        const jobId = data.data.jobId;
        pollExportStatus(jobId);
      }
    }
  } catch (error) {
    console.error('Export failed:', error);
  }
}

async function pollExportStatus(jobId: string) {
  const interval = setInterval(async () => {
    const response = await fetch(`/api/v1/exports/${jobId}`);
    const data = await response.json();
    
    if (data.data.status === 'completed') {
      clearInterval(interval);
      window.location.href = data.data.downloadUrl;
    } else if (data.data.status === 'failed') {
      clearInterval(interval);
      alert('Export failed: ' + data.data.error);
    }
  }, 2000); // Poll every 2 seconds
}
```

---

## Performance Tips

1. **Use Filters** - Reduce export size with specific filters
2. **Schedule Large Exports** - >500 cases will queue automatically
3. **Check Formats** - CSV is fastest, PDF is slowest
4. **Monitor Queue** - Watch Redis queue during peak usage
5. **Set Expiry** - S3 URLs expire in 1 hour by default

---

## Environment Variables Reference

```bash
# Required for S3 uploads
AWS_ACCESS_KEY_ID          # AWS access key
AWS_SECRET_ACCESS_KEY      # AWS secret key
AWS_REGION                 # AWS region (default: us-east-1)
AWS_S3_BUCKET              # S3 bucket name (default: test-jedi-exports)

# Required for job queue
REDIS_ENABLED              # Enable queue (default: false)
REDIS_HOST                 # Redis hostname (default: localhost)
REDIS_PORT                 # Redis port (default: 6379)
```

---

## Next Steps

1. ✅ Set up .env variables
2. ✅ Run `npm install`
3. ✅ Start app with `npm run dev`
4. ✅ Test with cURL commands above
5. ✅ Integrate into frontend
6. ✅ Check EXPORT_ENGINE_GUIDE.md for advanced features

**Need help?** Check EXPORT_ENGINE_GUIDE.md or EXPORT_ENGINE_IMPLEMENTATION_SUMMARY.md
