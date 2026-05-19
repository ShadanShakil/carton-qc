"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { CAN_MANAGE_USERS, CAN_MANAGE_ADMINS, hasRole } from "@/lib/roles";
import type { Role } from "@prisma/client";

const userSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(1, "Name is required"),
  role: z.enum(["SUPERADMIN", "ADMIN", "REVIEWER", "QC_INSPECTOR", "OPERATOR"]),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
});

export async function createUser(data: z.infer<typeof userSchema>) {
  const session = await auth();
  if (!hasRole(session?.user.role, CAN_MANAGE_USERS)) {
    return { success: false, error: "Unauthorized" };
  }

  const { email, name, role, password } = userSchema.parse(data);

  // If trying to create an ADMIN or SUPERADMIN, current user must be SUPERADMIN
  if ((role === "ADMIN" || role === "SUPERADMIN") && !hasRole(session?.user.role, CAN_MANAGE_ADMINS)) {
    return { success: false, error: "You do not have permission to create this role" };
  }

  if (!password) {
    return { success: false, error: "Password is required for new users" };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { success: false, error: "Email already in use" };
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: { email, name, role, hashedPassword },
  });

  revalidatePath("/users");
  return { success: true };
}

export async function updateUser(id: string, data: Partial<z.infer<typeof userSchema>>) {
  const session = await auth();
  if (!hasRole(session?.user.role, CAN_MANAGE_USERS)) {
    return { success: false, error: "Unauthorized" };
  }

  const targetUser = await prisma.user.findUnique({ where: { id } });
  if (!targetUser) {
    return { success: false, error: "User not found" };
  }

  // Current user needs CAN_MANAGE_ADMINS if target user is ADMIN/SUPERADMIN
  if ((targetUser.role === "ADMIN" || targetUser.role === "SUPERADMIN") && !hasRole(session?.user.role, CAN_MANAGE_ADMINS)) {
    return { success: false, error: "You do not have permission to modify this user" };
  }

  // Current user needs CAN_MANAGE_ADMINS if upgrading someone TO ADMIN/SUPERADMIN
  if (data.role && (data.role === "ADMIN" || data.role === "SUPERADMIN") && !hasRole(session?.user.role, CAN_MANAGE_ADMINS)) {
    return { success: false, error: "You do not have permission to assign this role" };
  }

  // Prevent users from changing their own role to avoid locking themselves out
  if (id === session?.user.id && data.role && data.role !== targetUser.role) {
    return { success: false, error: "You cannot change your own role" };
  }

  const updateData: any = { ...data };
  if (data.password) {
    updateData.hashedPassword = await bcrypt.hash(data.password, 10);
  }
  delete updateData.password;

  await prisma.user.update({
    where: { id },
    data: updateData,
  });

  revalidatePath("/users");
  return { success: true };
}

export async function deleteUser(id: string) {
  const session = await auth();
  if (!hasRole(session?.user.role, CAN_MANAGE_USERS)) {
    return { success: false, error: "Unauthorized" };
  }

  if (id === session?.user.id) {
    return { success: false, error: "You cannot delete your own account" };
  }

  const targetUser = await prisma.user.findUnique({ where: { id } });
  if (!targetUser) {
    return { success: false, error: "User not found" };
  }

  if ((targetUser.role === "ADMIN" || targetUser.role === "SUPERADMIN") && !hasRole(session?.user.role, CAN_MANAGE_ADMINS)) {
    return { success: false, error: "You do not have permission to delete this user" };
  }

  await prisma.user.delete({ where: { id } });

  revalidatePath("/users");
  return { success: true };
}
