import { prisma } from "../db_connection";
import bcrypt from "bcrypt";

export const seedAdmin = async () => {
  const adminEmail = "admin@gmail.com";
  
  const isUserExist = await prisma.user.findUnique({
    where: {
      email: adminEmail,
    },
  });

  if (isUserExist) {
    console.log("Seed user already exists. Skipping... ✅");
    return;
  }

  const hashedPassword = await bcrypt.hash("123456", 12);

  await prisma.user.create({
    data: {
      firstName: "Super",
      lastName: "Admin",
      email: adminEmail,
      password: hashedPassword,
      gender: "Male",
      country: "UK",
      contactNo: "01700000000",
      role: "ADMIN",
      isBlocked: false,
    },
  });

  console.log("Seed user created successfully! 🚀");
};
