// =============================================================================
// InteriorOS Backend — Project Members API: Invite/Create User
// =============================================================================

import { NextRequest } from 'next/server';
import { withAuth, getOrganizationId } from '@/middlewares/auth.middleware';
import { withProjectPermission } from '@/middlewares/project-auth.middleware';
import { connectDB } from '@/lib/db';
import { ProjectMember } from '@/models/project-member.model';
import { User } from '@/models/user.model';
import { createdResponse, serverErrorResponse, errorResponse, conflictResponse } from '@/lib/api-response';
import type { JwtPayload } from '@/lib/jwt';
import { getDefaultPermissionsForRole } from '@/lib/project-permissions';
import type { ProjectRole } from '@/lib/project-permissions';
import { z } from 'zod';

const inviteMemberSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  designation: z.string().optional(),
  department: z.string().optional(),
  projectRole: z.enum([
    'project_manager',
    'site_engineer',
    'quantity_surveyor',
    'designer',
    'client_representative',
    'sub_contractor',
    'viewer'
  ]).default('viewer'),
});

// POST: Create a new user and assign them to the project
async function inviteMemberHandler(
  req: NextRequest,
  context: { params: Promise<Record<string, string>> },
  auth: JwtPayload
) {
  try {
    await connectDB();
    const organizationId = getOrganizationId(auth);
    const { projectId } = await context.params;
    const body = await req.json();

    const validation = inviteMemberSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(validation.error.issues[0].message, 400);
    }

    const { firstName, lastName, email, password, designation, department, projectRole } = validation.data;

    // Check if the user email already exists in the organization
    const existingUser = await User.findOne({ email: email.toLowerCase(), organizationId });
    if (existingUser) {
      return conflictResponse('A user with this email already exists in the organization. Please use the Add Existing Member flow.');
    }

    // Create the new User
    const newUser = new User({
      organizationId,
      firstName,
      lastName,
      email,
      password,
      designation,
      department,
      systemRole: 'member',
      status: 'active',
      isEmailVerified: true,
    });

    await newUser.save();

    // Auto-populate permissions from the role preset
    const defaultPermissions = getDefaultPermissionsForRole(projectRole as ProjectRole);

    // Create the Project Member link with permissions
    const member = new ProjectMember({
      organizationId,
      projectId,
      userId: newUser._id,
      projectRole,
      permissions: defaultPermissions,
    });

    await member.save();

    // Remove password from response
    const userObj = newUser.toObject() as any;
    delete userObj.password;

    return createdResponse({ user: userObj, member }, 'User created and added to project successfully');
  } catch (error) {
    console.error('Invite project member error:', error);
    return serverErrorResponse();
  }
}

export const POST = withProjectPermission('users', 'create', inviteMemberHandler);
