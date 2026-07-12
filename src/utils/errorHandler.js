export const sendError = (error, defaultMessage = 'Internal Server Error', statusCode = 500) => {
  console.error('API Error:', error);

  const message = error instanceof Error ? error.message : defaultMessage;
  
  return Response.json(
    {
      success: false,
      message,
    },
    { status: statusCode }
  );
};
