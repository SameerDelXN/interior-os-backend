// =============================================================================
// InteriorOS Backend — Debug Route: Update Existing Roles
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Role } from '@/models/role.model';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const roles = await Role.find({});
    let updatedCount = 0;

    for (const role of roles) {
      // Check if boq permission already exists in role.permissions
      const hasBoq = role.permissions.some((p: any) => p.module === 'boq');
      if (hasBoq) continue;

      let actions: string[] = ['read'];
      if (role.slug === 'admin') {
        actions = ['create', 'read', 'update', 'delete', 'approve', 'export', 'manage'];
      } else if (role.slug === 'project-manager') {
        actions = ['create', 'read', 'update', 'approve', 'export'];
      } else if (role.slug === 'engineer') {
        actions = ['create', 'read', 'update'];
      }

      role.permissions.push({
        module: 'boq',
        actions: actions as any,
      });

      await role.save();
      updatedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Checked ${roles.length} roles, updated ${updatedCount} roles.`,
    });
  } catch (error: any) {
    console.error('Debug update roles error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
