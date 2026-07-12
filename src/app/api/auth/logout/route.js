import { sendSuccess } from '@/utils/apiResponse';

export async function POST() {
  return Response.json(
    { success: true, message: 'Logged out successfully' },
    {
      status: 200,
      headers: {
        'Set-Cookie': `token=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict`,
      },
    }
  );
}
