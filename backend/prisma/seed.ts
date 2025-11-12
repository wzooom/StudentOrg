import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/utils/password';

const prisma = new PrismaClient();

// Define enums as constants since SQLite doesn't support native enums
const PermissionLevel = {
  NONE: 'NONE',
  MEMBER: 'MEMBER',
  LEADER: 'LEADER',
} as const;

const TaskStatus = {
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  DONE: 'DONE',
} as const;

async function main() {
  console.log('Starting seed...');

  // Create admin user
  const adminPassword = await hashPassword('admin123');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@university.edu' },
    update: {},
    create: {
      email: 'admin@university.edu',
      passwordHash: adminPassword,
      name: 'Admin User',
    },
  });

  console.log('Created admin user:', admin.email);

  // Create regular users
  const user1Password = await hashPassword('password123');
  const user1 = await prisma.user.upsert({
    where: { email: 'john@university.edu' },
    update: {},
    create: {
      email: 'john@university.edu',
      passwordHash: user1Password,
      name: 'John Doe',
    },
  });

  const user2Password = await hashPassword('password123');
  const user2 = await prisma.user.upsert({
    where: { email: 'jane@university.edu' },
    update: {},
    create: {
      email: 'jane@university.edu',
      passwordHash: user2Password,
      name: 'Jane Smith',
    },
  });

  const user3Password = await hashPassword('password123');
  const user3 = await prisma.user.upsert({
    where: { email: 'bob@university.edu' },
    update: {},
    create: {
      email: 'bob@university.edu',
      passwordHash: user3Password,
      name: 'Bob Johnson',
    },
  });

  console.log('Created regular users');

  // Create organization
  const organization = await prisma.organization.upsert({
    where: { id: 'org-1' },
    update: {},
    create: {
      id: 'org-1',
      name: 'Computer Science Student Association',
      description: 'The official student organization for CS students',
      adminUserId: admin.id,
    },
  });

  console.log('Created organization:', organization.name);

  // Create roles
  const presidentRole = await prisma.role.create({
    data: {
      name: 'President',
      description: 'Organization president with full committee access',
      organizationId: organization.id,
    },
  });

  const memberRole = await prisma.role.create({
    data: {
      name: 'General Member',
      description: 'Regular member with basic access',
      organizationId: organization.id,
    },
  });

  const committeeChairRole = await prisma.role.create({
    data: {
      name: 'Committee Chair',
      description: 'Leads specific committees',
      organizationId: organization.id,
    },
  });

  console.log('Created roles');

  // Create committees
  const eventsCommittee = await prisma.committee.create({
    data: {
      name: 'Events',
      description: 'Plans and organizes student events and activities',
      organizationId: organization.id,
    },
  });

  const marketingCommittee = await prisma.committee.create({
    data: {
      name: 'Marketing',
      description: 'Handles social media and promotional activities',
      organizationId: organization.id,
    },
  });

  const financeCommittee = await prisma.committee.create({
    data: {
      name: 'Finance',
      description: 'Manages budget and financial planning',
      organizationId: organization.id,
    },
  });

  console.log('Created committees');

  // Assign roles to users
  await prisma.userRole.create({
    data: {
      userId: user1.id,
      roleId: presidentRole.id,
    },
  });

  await prisma.userRole.create({
    data: {
      userId: user2.id,
      roleId: committeeChairRole.id,
    },
  });

  await prisma.userRole.create({
    data: {
      userId: user3.id,
      roleId: memberRole.id,
    },
  });

  console.log('Assigned roles to users');

  // Set permissions for President role (leader on all committees)
  await prisma.roleCommitteePermission.createMany({
    data: [
      {
        roleId: presidentRole.id,
        committeeId: eventsCommittee.id,
        permissionLevel: PermissionLevel.LEADER,
      },
      {
        roleId: presidentRole.id,
        committeeId: marketingCommittee.id,
        permissionLevel: PermissionLevel.LEADER,
      },
      {
        roleId: presidentRole.id,
        committeeId: financeCommittee.id,
        permissionLevel: PermissionLevel.LEADER,
      },
    ],
  });

  // Set permissions for Committee Chair role (leader on events, member on marketing)
  await prisma.roleCommitteePermission.createMany({
    data: [
      {
        roleId: committeeChairRole.id,
        committeeId: eventsCommittee.id,
        permissionLevel: PermissionLevel.LEADER,
      },
      {
        roleId: committeeChairRole.id,
        committeeId: marketingCommittee.id,
        permissionLevel: PermissionLevel.MEMBER,
      },
    ],
  });

  // Set permissions for General Member role (member on events and marketing)
  await prisma.roleCommitteePermission.createMany({
    data: [
      {
        roleId: memberRole.id,
        committeeId: eventsCommittee.id,
        permissionLevel: PermissionLevel.MEMBER,
      },
      {
        roleId: memberRole.id,
        committeeId: marketingCommittee.id,
        permissionLevel: PermissionLevel.MEMBER,
      },
    ],
  });

  console.log('Set role permissions');

  // Create some sample tasks
  const task1 = await prisma.task.create({
    data: {
      title: 'Plan Spring Hackathon',
      description: 'Organize venue, sponsors, and schedule for the annual spring hackathon',
      status: TaskStatus.TODO,
      committeeId: eventsCommittee.id,
      createdById: user1.id,
      dueDate: new Date('2025-03-15'),
      position: 0,
      assignees: {
        create: [
          { userId: user1.id },
          { userId: user2.id },
        ],
      },
    },
  });

  const task2 = await prisma.task.create({
    data: {
      title: 'Design promotional posters',
      description: 'Create eye-catching posters for upcoming events',
      status: TaskStatus.IN_PROGRESS,
      committeeId: marketingCommittee.id,
      createdById: user1.id,
      dueDate: new Date('2025-02-20'),
      position: 0,
      assignees: {
        create: [{ userId: user3.id }],
      },
    },
  });

  const task3 = await prisma.task.create({
    data: {
      title: 'Update social media profiles',
      description: 'Refresh all social media bios and profile pictures',
      status: TaskStatus.DONE,
      committeeId: marketingCommittee.id,
      createdById: user2.id,
      position: 0,
      assignees: {
        create: [{ userId: user2.id }],
      },
    },
  });

  const task4 = await prisma.task.create({
    data: {
      title: 'Review semester budget',
      description: 'Go through all expenses and plan for next semester',
      status: TaskStatus.TODO,
      committeeId: financeCommittee.id,
      createdById: admin.id,
      dueDate: new Date('2025-04-01'),
      position: 0,
    },
  });

  console.log('Created sample tasks');

  // Add some comments
  await prisma.comment.create({
    data: {
      content: 'I\'ve reached out to potential sponsors. Waiting for responses.',
      taskId: task1.id,
      userId: user2.id,
    },
  });

  await prisma.comment.create({
    data: {
      content: 'Great! Let me know if you need help with the venue.',
      taskId: task1.id,
      userId: user1.id,
    },
  });

  console.log('Added sample comments');

  console.log('Seed completed successfully!');
  console.log('\nTest Credentials:');
  console.log('Admin: admin@university.edu / admin123');
  console.log('President: john@university.edu / password123');
  console.log('Committee Chair: jane@university.edu / password123');
  console.log('Member: bob@university.edu / password123');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
