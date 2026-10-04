export const sendError = (error, defaultMessage = 'Internal Server Error', statusCode = 500) => {
  console.error('API Error:', error);

  const errMsg = error instanceof Error ? error.message : '';
  // 4xx: prefer explicit API copy. 5xx: prefer underlying error when present.
  const message =
    statusCode >= 500
      ? errMsg || defaultMessage
      : defaultMessage || errMsg || 'Request failed';

  return Response.json(
    {
      success: false,
      message,
    },
    { status: statusCode }
  );
};
