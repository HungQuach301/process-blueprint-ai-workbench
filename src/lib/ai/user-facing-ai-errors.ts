export const AI_VALIDATION_USER_MESSAGE =
  "Kết quả AI chưa đạt yêu cầu chất lượng. Vui lòng thử lại.";

export function hasAIValidationErrors(validationErrors?: string[]) {
  return Array.isArray(validationErrors) && validationErrors.length > 0;
}

export function getAIValidationUserMessage(validationErrors?: string[]) {
  if (hasAIValidationErrors(validationErrors)) {
    console.log(
      JSON.stringify({
        event: "ai_validation_technical_details",
        validationErrors
      })
    );
  }

  return AI_VALIDATION_USER_MESSAGE;
}
