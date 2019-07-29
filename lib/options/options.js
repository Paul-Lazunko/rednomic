const joi = require("joi");

const redisServer = joi
  .object({
    host: joi.string().required(),
    port: joi
      .number()
      .positive()
      .integer()
      .required()
  })
  .required();

const positiveInteger = joi
  .number()
  .positive()
  .integer()
  .required();

const unitId = joi.string().required();

const units = joi
  .array()
  .items(
    joi.object({
      unitId
    })
  )
  .min(2)
  .required();

module.exports = {
  unit: joi.object({
    redisServer,
    requestTimeout: positiveInteger,
    unitId,
    service: joi.func().required(),
    logsExpire: positiveInteger
  }),

  group: joi.object({
    redisServer,
    unitId,
    pingTimeout: positiveInteger,
    units
  }),

  server: joi.object({
    redisServer,
    requestTimeout: positiveInteger,
    pingTimeout: positiveInteger,
    units
  })
};
