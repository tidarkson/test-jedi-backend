import swaggerJSDoc, { Options } from 'swagger-jsdoc';
import { config } from './environment';
import { openApiPaths, openApiSchemas, openApiTags } from './openapi-contracts';

const swaggerOptions: Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Test-Jedi Backend API',
      version: '1.0.0',
      description: 'OpenAPI documentation for the Test-Jedi backend services.',
    },
    tags: [...openApiTags],
    servers: [
      {
        url: `http://${config.HOST}:${config.PORT}/api/${config.API_VERSION}`,
        description: `${config.NODE_ENV} server`,
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

export const openApiSpec = swaggerJSDoc(swaggerOptions);
