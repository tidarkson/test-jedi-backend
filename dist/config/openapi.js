"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openApiSpec = void 0;
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const environment_1 = require("./environment");
const openapi_contracts_1 = require("./openapi-contracts");
const swaggerOptions = {
    definition: {
        openapi: '3.0.3',
        info: {
            title: 'Test-Jedi Backend API',
            version: '1.0.0',
            description: 'OpenAPI documentation for the Test-Jedi backend services.',
        },
        tags: [...openapi_contracts_1.openApiTags],
        servers: [
            {
                url: `http://${environment_1.config.HOST}:${environment_1.config.PORT}/api/${environment_1.config.API_VERSION}`,
                description: `${environment_1.config.NODE_ENV} server`,
            },
        ],
        paths: openapi_contracts_1.openApiPaths,
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
            schemas: openapi_contracts_1.openApiSchemas,
        },
    },
    apis: [],
};
exports.openApiSpec = (0, swagger_jsdoc_1.default)(swaggerOptions);
//# sourceMappingURL=openapi.js.map