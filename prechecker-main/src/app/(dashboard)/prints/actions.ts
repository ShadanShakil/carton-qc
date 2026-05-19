"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function deletePrint(id: string) {
  await prisma.printJob.delete({ where: { id } });
  
  revalidatePath("/prints");
  revalidatePath("/dashboard");
  redirect("/prints");
}
