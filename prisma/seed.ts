import { BUILDING_FUND_ID, DEFAULT_BUILDING_FUND_TARGET_PENCE } from "../lib/constants";
import { prisma } from "../lib/prisma";

async function removeLegacyTestPot() {
  const testPot = await prisma.pot.findUnique({
    where: { slug: "test-pot" },
    select: { id: true },
  });
  if (!testPot) return;

  await prisma.donation.deleteMany({ where: { potId: testPot.id } });
  await prisma.potPageView.deleteMany({ where: { potId: testPot.id } });
  await prisma.potSlugRedirect.deleteMany({ where: { potId: testPot.id } });
  await prisma.pot.delete({ where: { id: testPot.id } });
  await prisma.fundraiser.deleteMany({
    where: { email: "test-fundraiser@pvnbelfast.local" },
  });
}

async function main() {
  await prisma.buildingFund.upsert({
    where: { id: BUILDING_FUND_ID },
    create: {
      id: BUILDING_FUND_ID,
      targetAmount: DEFAULT_BUILDING_FUND_TARGET_PENCE,
      totalRaised: 0,
    },
    // Do not overwrite an admin-edited target on re-seed.
    update: {},
  });

  await removeLegacyTestPot();

  console.log(
    `Seeded BuildingFund id=${BUILDING_FUND_ID} (default target ${DEFAULT_BUILDING_FUND_TARGET_PENCE} pence if new)`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
