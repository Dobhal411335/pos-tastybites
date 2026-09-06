export const sendSuccess = (data = null, message = 'Success', statusCode = 200, headers = {}) => {
  return Response.json(
    {
      success: true,
      message,
      data,
    },
    { status: statusCode, headers }
  );
};
