/**
 * Generates a static openapi.json file in the docs/ folder.
 * Run with: npm run export:docs
 * The docs/ folder can then be deployed to Vercel/Netlify/GitHub Pages.
 */

import swaggerJSDoc, { Options } from 'swagger-jsdoc';
import * as fs from 'fs';
import * as path from 'path';
import { openApiPaths, openApiSchemas, openApiTags } from '../src/config/openapi-contracts';

const swaggerOptions: Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Test-Jedi API',
      version: '1.0.0',
      description:
        'REST API for Test-Jedi — a test management platform. Covers authentication, test repository, test runs, test plans, analytics, integrations, exports, and admin operations.',
      contact: {
        name: 'Test-Jedi Team',
      },
    },
    tags: [...openApiTags],
    servers: [
      {
        url: 'https://your-backend.onrender.com/api/v1',
        description: 'Production (update this URL once deployed)',
      },
      {
        url: 'http://localhost:3001/api/v1',
        description: 'Local development',
      },
    ],
    paths: openApiPaths,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: openApiSchemas,
    },
  },
  apis: [],
};

const spec = swaggerJSDoc(swaggerOptions);

const outputDir = path.join(__dirname, '..', 'docs');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const outputPath = path.join(outputDir, 'openapi.json');
fs.writeFileSync(outputPath, JSON.stringify(spec, null, 2), 'utf-8');

console.log(`✅ OpenAPI spec exported to: ${outputPath}`);
console.log(`   Paths:   ${Object.keys((spec as any).paths ?? {}).length}`);
console.log(`   Schemas: ${Object.keys((spec as any).components?.schemas ?? {}).length}`);
console.log('');
console.log('Next step: deploy the docs/ folder to Vercel:');
console.log('  npx vercel docs/');
