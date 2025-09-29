import { NextResponse } from 'next/server';
import { fixUsersWithMissingDisplayName } from '@/server/actions/user-actions';

export async function POST() {
  try {
    const result = await fixUsersWithMissingDisplayName();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fixing user display names:', error);
    return NextResponse.json({ error: 'Failed to fix user display names' }, { status: 500 });
  }
}
