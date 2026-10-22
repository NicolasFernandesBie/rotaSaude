import { db } from "./lib/prisma";

async function main() {
  console.log("Removendo dados operacionais e clientes...");
  await db.notification.deleteMany();
  await db.seat.deleteMany();
  await db.referral.deleteMany();
  await db.trip.deleteMany();
  await db.patient.deleteMany();

  const [patients, referrals, trips, notifications] = await Promise.all([
    db.patient.count(),
    db.referral.count(),
    db.trip.count(),
    db.notification.count(),
  ]);
  console.log("Base limpa:", { patients, referrals, trips, notifications });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
