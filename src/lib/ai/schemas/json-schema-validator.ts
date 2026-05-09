export type AIJsonSchema = {
  type?: string | readonly string[];
  enum?: unknown[];
  const?: unknown;
  properties?: Record<string, AIJsonSchema>;
  required?: string[];
  items?: AIJsonSchema;
  anyOf?: AIJsonSchema[];
  additionalProperties?: boolean | AIJsonSchema;
  minItems?: number;
};

export type AIOutputSchemaValidationResult =
  | {
      ok: true;
      errors: [];
    }
  | {
      ok: false;
      errors: string[];
    };

function getType(value: unknown) {
  if (value === null) {
    return "null";
  }

  if (Array.isArray(value)) {
    return "array";
  }

  return typeof value;
}

function matchesType(value: unknown, expectedType: string) {
  if (expectedType === "integer") {
    return Number.isInteger(value);
  }

  return getType(value) === expectedType;
}

function validateValue(
  value: unknown,
  schema: AIJsonSchema,
  path: string,
  errors: string[]
) {
  if (schema.anyOf?.length) {
    const branchErrors = schema.anyOf.map((branch) => {
      const nextErrors: string[] = [];
      validateValue(value, branch, path, nextErrors);
      return nextErrors;
    });

    if (branchErrors.every((nextErrors) => nextErrors.length > 0)) {
      errors.push(`${path} must match at least one allowed schema.`);
    }

    return;
  }

  if (schema.const !== undefined && value !== schema.const) {
    errors.push(`${path} must equal ${String(schema.const)}.`);
    return;
  }

  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${path} must be one of: ${schema.enum.map(String).join(", ")}.`);
    return;
  }

  if (schema.type !== undefined) {
    const expectedTypes = Array.isArray(schema.type) ? schema.type : [schema.type];

    if (!expectedTypes.some((expectedType) => matchesType(value, expectedType))) {
      errors.push(`${path} must be ${expectedTypes.join(" or ")}.`);
      return;
    }
  }

  if (schema.type === "array" || Array.isArray(value)) {
    if (!Array.isArray(value)) {
      return;
    }

    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(`${path} must contain at least ${schema.minItems} item(s).`);
    }

    if (schema.items) {
      value.forEach((item, index) =>
        validateValue(item, schema.items as AIJsonSchema, `${path}[${index}]`, errors)
      );
    }

    return;
  }

  if (schema.type === "object" || getType(value) === "object") {
    if (getType(value) !== "object") {
      return;
    }

    const record = value as Record<string, unknown>;

    schema.required?.forEach((field) => {
      if (!(field in record)) {
        errors.push(`${path}.${field} is required.`);
      }
    });

    Object.entries(schema.properties ?? {}).forEach(([field, fieldSchema]) => {
      if (field in record) {
        validateValue(record[field], fieldSchema, `${path}.${field}`, errors);
      }
    });

    if (schema.additionalProperties === false) {
      const allowedFields = new Set(Object.keys(schema.properties ?? {}));

      Object.keys(record).forEach((field) => {
        if (!allowedFields.has(field)) {
          errors.push(`${path}.${field} is not allowed.`);
        }
      });
    }
  }
}

export function validateAIOutputAgainstSchema(
  output: unknown,
  schema: AIJsonSchema
): AIOutputSchemaValidationResult {
  const errors: string[] = [];
  validateValue(output, schema, "$", errors);

  if (errors.length > 0) {
    return {
      ok: false,
      errors
    };
  }

  return {
    ok: true,
    errors: []
  };
}
