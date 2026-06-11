import { db } from "./index";
import { employees, paymentCategories } from "./schema";

async function seed() {
  await db.insert(employees).values([
    { name: "John Doe", birthday: "1990-03-15" },
    { name: "Jane Smith", birthday: "1985-07-22" },
    { name: "Bob Johnson", birthday: "1992-11-08" },
  ]);

  await db
    .insert(paymentCategories)
    .values([
      { name: "Hourly Rate" },
      { name: "Overtime Hourly" },
      { name: "Commission" },
      { name: "Global Pay" },
    ]);

  console.log("Seed complete.");
}

seed();
