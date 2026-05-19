"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function deleteArtwork(id: string) {
  // First, delete related PrintJobs
  // The database will cascade-delete the Alerts associated with the PrintJobs
  await prisma.printJob.deleteMany({ where: { artworkId: id } });
  
  // Then delete the Artwork (this will cascade-delete OCRWords)
  await prisma.artwork.delete({ where: { id } });
  
  revalidatePath("/artwork");
  revalidatePath("/dashboard");
  redirect("/artwork");
}
