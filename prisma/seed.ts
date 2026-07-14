import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

function monthsAgo(n: number): Date {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCMonth(d.getUTCMonth() - n);
  return d;
}

function monthsFromNow(n: number): Date {
  return monthsAgo(-n);
}

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@jeen.ai';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'change_me';

  await prisma.appSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      defaultCurrency: 'ILS',
      planningWindowMonths: 6,
      defaultCapacityHours: 186,
    },
  });

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 10),
      role: 'ADMIN',
    },
  });

  const employeesData = [
    { firstName: 'Noa', lastName: 'Levi', email: 'noa.levi@jeen.ai', title: 'Delivery Lead', department: 'Delivery', employmentType: 'full_time' as const, monthlyCapacityHours: 186, costRateHourly: 220 },
    { firstName: 'Itai', lastName: 'Mizrahi', email: 'itai.mizrahi@jeen.ai', title: 'Senior Engineer', department: 'Engineering', employmentType: 'full_time' as const, monthlyCapacityHours: 186, costRateHourly: 260 },
    { firstName: 'Shira', lastName: 'Cohen', email: 'shira.cohen@jeen.ai', title: 'Engineer', department: 'Engineering', employmentType: 'full_time' as const, monthlyCapacityHours: 186, costRateHourly: 200 },
    { firstName: 'Omer', lastName: 'Ben-David', email: 'omer.bendavid@jeen.ai', title: 'Data Scientist', department: 'Data', employmentType: 'full_time' as const, monthlyCapacityHours: 186, costRateHourly: 240 },
    { firstName: 'Maya', lastName: 'Azoulay', email: 'maya.azoulay@jeen.ai', title: 'Project Manager', department: 'Delivery', employmentType: 'full_time' as const, monthlyCapacityHours: 186, costRateHourly: 210 },
    { firstName: 'Daniel', lastName: 'Peretz', email: 'daniel.peretz@jeen.ai', title: 'Consultant', department: 'Consulting', employmentType: 'contractor' as const, monthlyCapacityHours: 120, costRateHourly: 300 },
    { firstName: 'Roni', lastName: 'Katz', email: 'roni.katz@jeen.ai', title: 'QA Engineer', department: 'Engineering', employmentType: 'part_time' as const, monthlyCapacityHours: 93, costRateHourly: 160 },
    { firstName: 'Yael', lastName: 'Barak', email: 'yael.barak@jeen.ai', title: 'Solutions Architect', department: 'Engineering', employmentType: 'full_time' as const, monthlyCapacityHours: 186, costRateHourly: 280 },
  ];

  const employees = [];
  for (const e of employeesData) {
    employees.push(
      await prisma.employee.upsert({
        where: { email: e.email },
        update: {},
        create: { ...e, startDate: monthsAgo(12) },
      }),
    );
  }

  const customersData = [
    { name: 'Maccabi Health Services', contactName: 'Ronit Shani', contactEmail: 'ronit@maccabi.example', status: 'active' as const },
    { name: 'Bank Hapoalim', contactName: 'Avi Golan', contactEmail: 'avi.golan@bankhapoalim.example', status: 'active' as const },
    { name: 'Shufersal', contactName: 'Tal Nir', contactEmail: 'tal.nir@shufersal.example', status: 'active' as const },
    { name: 'El Al Airlines', contactName: 'Dana Regev', contactEmail: 'dana.regev@elal.example', status: 'prospect' as const },
  ];

  const customers = [];
  for (const c of customersData) {
    const existing = await prisma.customer.findFirst({ where: { name: c.name } });
    customers.push(existing ?? (await prisma.customer.create({ data: c })));
  }

  const projectsData = [
    { customer: customers[0], name: 'Member Portal Revamp', code: 'MACCABI-01', status: 'active' as const, startDate: monthsAgo(4), endDate: monthsFromNow(3), incomeAmount: 480000, hoursPaid: 1600, billingType: 'time_and_materials' as const, description: 'Rebuild the member self-service portal.' },
    { customer: customers[0], name: 'Claims Automation', code: 'MACCABI-02', status: 'planning' as const, startDate: monthsFromNow(1), endDate: monthsFromNow(6), incomeAmount: 260000, hoursPaid: 900, billingType: 'fixed_price' as const, description: 'Automate claims intake pipeline.' },
    { customer: customers[1], name: 'Fraud Detection Model', code: 'POALIM-01', status: 'active' as const, startDate: monthsAgo(6), endDate: monthsFromNow(1), incomeAmount: 620000, hoursPaid: 2000, billingType: 'time_and_materials' as const, description: 'ML-based transaction fraud scoring.' },
    { customer: customers[2], name: 'Supply Chain Dashboard', code: 'SHUFERSAL-01', status: 'on_hold' as const, startDate: monthsAgo(2), endDate: monthsFromNow(4), incomeAmount: 180000, hoursPaid: 600, billingType: 'fixed_price' as const, description: 'Real-time inventory analytics dashboard.' },
    { customer: customers[2], name: 'Loyalty Recommender', code: 'SHUFERSAL-02', status: 'completed' as const, startDate: monthsAgo(10), endDate: monthsAgo(1), incomeAmount: 150000, hoursPaid: 500, billingType: 'fixed_price' as const, description: 'Personalized loyalty offer engine.' },
    { customer: customers[3], name: 'Pricing Intelligence POC', code: 'ELAL-01', status: 'planning' as const, startDate: monthsFromNow(1), endDate: monthsFromNow(3), incomeAmount: 90000, hoursPaid: 300, billingType: 'time_and_materials' as const, description: 'Dynamic fare pricing proof of concept.' },
  ];

  const projects = [];
  for (const p of projectsData) {
    const { customer, ...rest } = p;
    const existing = await prisma.project.findUnique({ where: { code: rest.code } });
    projects.push(existing ?? (await prisma.project.create({ data: { ...rest, customerId: customer.id } })));
  }

  const teamPlan = [
    { projectIdx: 0, employeeIdxs: [0, 1, 2, 4] },
    { projectIdx: 1, employeeIdxs: [4, 3] },
    { projectIdx: 2, employeeIdxs: [1, 3, 7] },
    { projectIdx: 3, employeeIdxs: [2, 6] },
    { projectIdx: 4, employeeIdxs: [2, 5] },
    { projectIdx: 5, employeeIdxs: [3, 7] },
  ];

  for (const { projectIdx, employeeIdxs } of teamPlan) {
    for (const employeeIdx of employeeIdxs) {
      await prisma.projectAssignment.upsert({
        where: { projectId_employeeId: { projectId: projects[projectIdx].id, employeeId: employees[employeeIdx].id } },
        update: {},
        create: {
          projectId: projects[projectIdx].id,
          employeeId: employees[employeeIdx].id,
          roleOnProject: employeeIdx === 4 ? 'PM' : 'Engineer',
        },
      });
    }
  }

  for (const { projectIdx, employeeIdxs } of teamPlan) {
    for (const employeeIdx of employeeIdxs) {
      for (let m = -3; m <= 2; m++) {
        const hours = 20 + ((employeeIdx + m + projectIdx) % 5) * 15;
        await prisma.monthlyAllocation.upsert({
          where: {
            employeeId_projectId_month: {
              employeeId: employees[employeeIdx].id,
              projectId: projects[projectIdx].id,
              month: monthsAgo(-m),
            },
          },
          update: {},
          create: {
            employeeId: employees[employeeIdx].id,
            projectId: projects[projectIdx].id,
            month: monthsAgo(-m),
            plannedHours: hours,
            actualHours: m <= 0 ? hours - ((employeeIdx + m) % 3) : null,
          },
        });
      }
    }
  }

  console.log('Seed complete.');
  console.log(`Admin login: ${adminEmail} / ${adminPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
