"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsQuerySchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.analyticsQuerySchema = joi_1.default.object({
    dateFrom: joi_1.default.date().iso().optional(),
    dateTo: joi_1.default.date().iso().optional(),
    milestoneId: joi_1.default.string().uuid().optional(),
}).custom((value, helpers) => {
    if (value.dateFrom && value.dateTo && value.dateFrom > value.dateTo) {
        return helpers.error('any.invalid');
    }
    return value;
}, 'date range validation').messages({
    'any.invalid': 'dateFrom must be before or equal to dateTo',
});
//# sourceMappingURL=analytics.validator.js.map