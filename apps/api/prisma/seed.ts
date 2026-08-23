import { PrismaClient, DeskType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "password123";

function buildDeskGrid(floorId: string, gridWidth: number, gridHeight: number) {
  const desks: {
    floorId: string;
    label: string;
    type: DeskType;
    gridX: number;
    gridY: number;
    gridW: number;
    gridH: number;
  }[] = [];

  let deskNumber = 1;
  for (let y = 1; y < gridHeight - 1; y += 2) {
    for (let x = 1; x < gridWidth - 2; x += 3) {
      // Every 4th cluster gets a monitor station instead of a plain desk,
      // and the last column of each row becomes a meeting pod, so the
      // floorplan doesn't read as an undifferentiated grid.
      const isMonitor = deskNumber % 5 === 0;
      desks.push({
        floorId,
        label: `D-${String(deskNumber).padStart(3, "0")}`,
        type: isMonitor ? "MONITOR_STATION" : "DESK",
        gridX: x,
        gridY: y,
        gridW: 1,
        gridH: 1,
      });
      deskNumber++;
    }
  }

  desks.push({
    floorId,
    label: "Pod-A",
    type: "MEETING_POD",
    gridX: gridWidth - 3,
    gridY: 1,
    gridW: 2,
    gridH: 2,
  });
  desks.push({
    floorId,
    label: "Pod-B",
    type: "MEETING_POD",
    gridX: gridWidth - 3,
    gridY: gridHeight - 3,
    gridW: 2,
    gridH: 2,
  });

  return desks;
}

async function main() {
  const existing = await prisma.company.findUnique({ where: { slug: "acme" } });
  if (existing) {
    // eslint-disable-next-line no-console
    console.log("Seed skipped: company 'acme' already exists.");
    return;
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const company = await prisma.company.create({
    data: { name: "Acme Global Corp", slug: "acme" },
  });

  const sydney = await prisma.building.create({
    data: {
      companyId: company.id,
      name: "Sydney — Barangaroo Tower",
      address: "1 Sussex St, Sydney NSW",
      timezone: "Australia/Sydney",
      capacityLimit: 40,
    },
  });

  const berlin = await prisma.building.create({
    data: {
      companyId: company.id,
      name: "Berlin — Mitte Campus",
      address: "Torstraße 12, Berlin",
      timezone: "Europe/Berlin",
      capacityLimit: 24,
    },
  });

  const sydneyFloor2 = await prisma.floor.create({
    data: { buildingId: sydney.id, name: "Level 2 — Engineering", sortOrder: 1, gridWidth: 16, gridHeight: 10 },
  });
  const sydneyFloor3 = await prisma.floor.create({
    data: { buildingId: sydney.id, name: "Level 3 — Product & Design", sortOrder: 2, gridWidth: 14, gridHeight: 8 },
  });
  const berlinFloor1 = await prisma.floor.create({
    data: { buildingId: berlin.id, name: "Ground Floor — Collaboration Hub", sortOrder: 1, gridWidth: 12, gridHeight: 8 },
  });

  for (const floor of [sydneyFloor2, sydneyFloor3, berlinFloor1]) {
    await prisma.desk.createMany({ data: buildDeskGrid(floor.id, floor.gridWidth, floor.gridHeight) });
  }

  const admin = await prisma.user.create({
    data: {
      companyId: company.id,
      email: "admin@acme.test",
      name: "Priya Rao",
      role: "ADMIN",
      passwordHash,
    },
  });

  const lead = await prisma.user.create({
    data: {
      companyId: company.id,
      email: "lead@acme.test",
      name: "Marcus Webb",
      role: "TEAM_LEAD",
      passwordHash,
    },
  });

  const employeeNames = [
    "Jordan Lee",
    "Sofia Nguyen",
    "Ahmed Hassan",
    "Emma Fischer",
    "Liam O'Connor",
    "Hana Kobayashi",
  ];
  const employees = await Promise.all(
    employeeNames.map((name, i) =>
      prisma.user.create({
        data: {
          companyId: company.id,
          email: `employee${i + 1}@acme.test`,
          name,
          role: "EMPLOYEE",
          passwordHash,
        },
      })
    )
  );

  const team = await prisma.team.create({
    data: { companyId: company.id, name: "Platform Engineering" },
  });

  await prisma.teamMembership.create({ data: { teamId: team.id, userId: lead.id, isLead: true } });
  for (const emp of employees) {
    await prisma.teamMembership.create({ data: { teamId: team.id, userId: emp.id } });
  }

  // Seed a handful of today's bookings so the Capacity Monitor and
  // Floorplan Matrix aren't empty on first load.
  const todayDesks = await prisma.desk.findMany({ where: { floorId: sydneyFloor2.id }, take: 12 });
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const checkInBy = new Date(today);
  checkInBy.setUTCHours(11, 0, 0, 0);

  const bookers = [admin, lead, ...employees];
  for (let i = 0; i < Math.min(todayDesks.length, bookers.length); i++) {
    await prisma.booking.create({
      data: {
        companyId: company.id,
        deskId: todayDesks[i].id,
        userId: bookers[i].id,
        date: today,
        slot: "FULL_DAY",
        status: i % 3 === 0 ? "CHECKED_IN" : "PENDING_CHECKIN",
        checkInBy,
        checkedInAt: i % 3 === 0 ? new Date() : null,
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log("Seed complete.");
  // eslint-disable-next-line no-console
  console.log(`Demo login: admin@acme.test / lead@acme.test / employee1..6@acme.test — password: ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
