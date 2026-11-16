"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const express_validator_1 = require("express-validator");
const errors_1 = require("../lib/errors");
const validate = (validations) => {
    return async (req, res, next) => {
        for (const validation of validations) {
            const result = await validation.run(req);
            if (!result.isEmpty())
                break;
        }
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            const formattedErrors = errors.array().map((e) => ({
                field: 'path' in e ? e.path : 'unknown',
                message: e.msg,
            }));
            next(new errors_1.AppError('Validation failed', 422, formattedErrors));
            return;
        }
        next();
    };
};
exports.validate = validate;
//# sourceMappingURL=validate.js.map