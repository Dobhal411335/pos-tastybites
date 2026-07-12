export const sendSuccess = (data = null, message = 'Success', statusCode = 200) => {
  return Response.json(
    {
      success: true,
      message,
      data,
    },
    { status: statusCode }
  );
};
